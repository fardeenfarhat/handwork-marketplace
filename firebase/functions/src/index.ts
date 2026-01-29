import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// Content moderation keywords (expand as needed)
const PROFANITY_WORDS = [
  "spam", "scam", "fraud", "fake", "illegal", "drugs", "violence"
];

const SUSPICIOUS_PATTERNS = [
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
  /https?:\/\/[^\s]+/, // URLs
  /\$\d+/, // Money amounts
];

/**
 * Content moderation function
 */
function moderateContent(content: string): {
  isApproved: boolean;
  flags: string[];
  filteredContent: string;
} {
  const result = {
    isApproved: true,
    flags: [] as string[],
    filteredContent: content,
  };

  // Check for profanity
  const contentLower = content.toLowerCase();
  for (const word of PROFANITY_WORDS) {
    if (contentLower.includes(word)) {
      result.flags.push(`profanity: ${word}`);
      result.isApproved = false;
    }
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      result.flags.push(`suspicious_pattern: ${pattern.source}`);
      // Don't auto-reject, just flag for review
    }
  }

  // Filter content if needed
  if (!result.isApproved) {
    result.filteredContent = "[Message flagged for review]";
  }

  return result;
}

/**
 * Generate conversation ID from two user IDs
 */
function generateConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join("_");
}

/**
 * Trigger when a new message is created
 */
export const onMessageCreated = functions.firestore
  .document("messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const messageId = context.params.messageId;

    try {
      // Moderate content
      const moderation = moderateContent(message.content);
      
      // Update message with moderation results if needed
      if (!moderation.isApproved) {
        await snap.ref.update({
          content: moderation.filteredContent,
          moderationFlags: moderation.flags,
          isModerated: true,
        });
      }

      // Update or create conversation
      const conversationId = generateConversationId(
        message.senderId,
        message.receiverId
      );

      const conversationRef = db.collection("conversations").doc(conversationId);
      
      await conversationRef.set({
        id: conversationId,
        participants: [message.senderId, message.receiverId],
        lastMessage: {
          id: messageId,
          content: moderation.filteredContent,
          senderId: message.senderId,
          timestamp: message.timestamp,
          type: message.type,
        },
        updatedAt: message.timestamp,
        unreadCount: {
          [message.receiverId]: admin.firestore.FieldValue.increment(1),
        },
      }, { merge: true });

      // Send push notification if content is approved
      if (moderation.isApproved) {
        await sendMessageNotification(message, messageId);
      }

      // Update user presence/activity
      await updateUserActivity(message.senderId);

    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

/**
 * Send push notification for new message
 */
async function sendMessageNotification(message: any, messageId: string) {
  try {
    // Get receiver's FCM token
    const receiverDoc = await db.collection("users").doc(message.receiverId).get();
    const receiverData = receiverDoc.data();
    
    if (!receiverData?.fcmToken) {
      console.log("No FCM token for user:", message.receiverId);
      return;
    }

    // Get sender's name
    const senderDoc = await db.collection("users").doc(message.senderId).get();
    const senderData = senderDoc.data();
    const senderName = senderData ? 
      `${senderData.firstName} ${senderData.lastName}` : 
      "Someone";

    // Prepare notification
    const notification = {
      title: `New message from ${senderName}`,
      body: message.content.length > 100 ? 
        `${message.content.substring(0, 100)}...` : 
        message.content,
    };

    const data = {
      type: "new_message",
      messageId: messageId,
      senderId: message.senderId,
      conversationId: generateConversationId(message.senderId, message.receiverId),
      jobId: message.jobId || "",
    };

    // Send notification
    await messaging.send({
      token: receiverData.fcmToken,
      notification,
      data,
      android: {
        priority: "high",
        notification: {
          channelId: "messages",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    });

    console.log("Push notification sent successfully");
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}

/**
 * Update user activity timestamp
 */
async function updateUserActivity(userId: string) {
  try {
    await db.collection("presence").doc(userId).set({
      userId,
      lastActive: admin.firestore.FieldValue.serverTimestamp(),
      isOnline: true,
    }, { merge: true });
  } catch (error) {
    console.error("Error updating user activity:", error);
  }
}

/**
 * Trigger when a message is updated (for read receipts)
 */
export const onMessageUpdated = functions.firestore
  .document("messages/{messageId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const messageId = context.params.messageId;

    // Check if message was marked as read
    if (!before.isRead && after.isRead) {
      try {
        // Update conversation unread count
        const conversationId = generateConversationId(
          after.senderId,
          after.receiverId
        );

        await db.collection("conversations").doc(conversationId).update({
          [`unreadCount.${after.receiverId}`]: 
            admin.firestore.FieldValue.increment(-1),
        });

        // Send read receipt notification to sender
        await sendReadReceiptNotification(after, messageId);
      } catch (error) {
        console.error("Error processing message update:", error);
      }
    }
  });

/**
 * Send read receipt notification
 */
async function sendReadReceiptNotification(message: any, messageId: string) {
  try {
    // Get sender's FCM token
    const senderDoc = await db.collection("users").doc(message.senderId).get();
    const senderData = senderDoc.data();
    
    if (!senderData?.fcmToken) {
      return;
    }

    // Get reader's name
    const readerDoc = await db.collection("users").doc(message.receiverId).get();
    const readerData = readerDoc.data();
    const readerName = readerData ? 
      `${readerData.firstName} ${readerData.lastName}` : 
      "Someone";

    const data = {
      type: "read_receipt",
      messageId: messageId,
      readBy: message.receiverId,
      readerName: readerName,
    };

    // Send silent notification (data-only)
    await messaging.send({
      token: senderData.fcmToken,
      data,
    });

  } catch (error) {
    console.error("Error sending read receipt:", error);
  }
}

/**
 * Clean up old typing indicators
 */
export const cleanupTypingIndicators = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async (context) => {
    const cutoff = admin.firestore.Timestamp.fromMillis(
      Date.now() - 30000 // 30 seconds ago
    );

    const oldTypingDocs = await db.collection("typing")
      .where("timestamp", "<", cutoff)
      .get();

    const batch = db.batch();
    oldTypingDocs.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Cleaned up ${oldTypingDocs.size} old typing indicators`);
  });

/**
 * Update user presence on authentication
 */
export const updatePresenceOnAuth = functions.auth.user().onCreate(async (user) => {
  await db.collection("presence").doc(user.uid).set({
    userId: user.uid,
    isOnline: true,
    lastActive: admin.firestore.FieldValue.serverTimestamp(),
  });
});

/**
 * HTTP function to get conversation participants for a job
 */
export const getJobParticipants = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  try {
    // This would integrate with your existing job system
    // For now, return mock data
    return {
      participants: [],
      canMessage: true,
    };
  } catch (error) {
    console.error("Error getting job participants:", error);
    throw new functions.https.HttpsError("internal", "Internal server error");
  }
});