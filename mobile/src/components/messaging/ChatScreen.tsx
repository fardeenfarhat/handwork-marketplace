import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DocumentPicker from 'react-native-document-picker';
import ImagePicker from 'react-native-image-crop-picker';
import FirebaseMessagingService, { Message, MessageAttachment } from '../../services/FirebaseMessagingService';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { formatDistanceToNow } from 'date-fns';

interface ChatScreenProps {
  route: {
    params: {
      otherUserId: string;
      conversationId?: string;
      jobId?: string;
    };
  };
  navigation: any;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
  const { otherUserId, jobId } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Set up navigation header
    navigation.setOptions({
      title: `Chat with ${otherUserId}`, // Replace with actual user name
      headerRight: () => (
        <TouchableOpacity onPress={handleAttachmentPress} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>📎</Text>
        </TouchableOpacity>
      ),
    });

    // Listen to messages
    const unsubscribeMessages = FirebaseMessagingService.getMessages(otherUserId, 50)((messages) => {
      setMessages(messages);
      setLoading(false);
      
      // Mark messages as read
      FirebaseMessagingService.markConversationAsRead(otherUserId);
    });

    // Listen to typing indicators
    const unsubscribeTyping = FirebaseMessagingService.listenToTypingIndicators(
      otherUserId,
      setOtherUserTyping
    );

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [otherUserId, navigation]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    setInputText('');
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      FirebaseMessagingService.sendTypingIndicator(otherUserId, false);
    }

    try {
      await FirebaseMessagingService.sendMessage(
        otherUserId,
        messageText,
        'text',
        undefined,
        jobId
      );
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setInputText(messageText); // Restore text on error
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);

    // Handle typing indicator
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      FirebaseMessagingService.sendTypingIndicator(otherUserId, true);
    } else if (text.length === 0 && isTyping) {
      setIsTyping(false);
      FirebaseMessagingService.sendTypingIndicator(otherUserId, false);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        FirebaseMessagingService.sendTypingIndicator(otherUserId, false);
      }
    }, 2000);
  };

  const handleAttachmentPress = () => {
    Alert.alert(
      'Add Attachment',
      'Choose an option',
      [
        { text: 'Camera', onPress: handleCameraPress },
        { text: 'Photo Library', onPress: handleImagePickerPress },
        { text: 'Document', onPress: handleDocumentPickerPress },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleCameraPress = () => {
    ImagePicker.openCamera({
      width: 1024,
      height: 1024,
      cropping: false,
      compressImageQuality: 0.8,
    }).then(handleImageSelected).catch(console.error);
  };

  const handleImagePickerPress = () => {
    ImagePicker.openPicker({
      width: 1024,
      height: 1024,
      cropping: false,
      compressImageQuality: 0.8,
      multiple: false,
    }).then(handleImageSelected).catch(console.error);
  };

  const handleImageSelected = async (image: any) => {
    setUploading(true);
    try {
      const attachment = await FirebaseMessagingService.uploadAttachment(
        image.path,
        image.filename || 'image.jpg',
        image.mime
      );

      await FirebaseMessagingService.sendMessage(
        otherUserId,
        'Image',
        'image',
        [attachment],
        jobId
      );
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentPickerPress = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
      });

      setUploading(true);
      
      const attachment = await FirebaseMessagingService.uploadAttachment(
        result.uri,
        result.name || 'document',
        result.type || 'application/octet-stream'
      );

      await FirebaseMessagingService.sendMessage(
        otherUserId,
        result.name || 'Document',
        'file',
        [attachment],
        jobId
      );
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        console.error('Error uploading document:', error);
        Alert.alert('Error', 'Failed to upload document. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isCurrentUser = item.senderId === 'currentUserId'; // Replace with actual current user ID
    const showTimestamp = index === 0 || 
      (messages[index - 1] && 
       Math.abs(item.timestamp.getTime() - messages[index - 1].timestamp.getTime()) > 300000); // 5 minutes

    return (
      <View>
        {showTimestamp && (
          <View style={styles.timestampContainer}>
            <Text style={styles.timestampText}>
              {formatDistanceToNow(item.timestamp, { addSuffix: true })}
            </Text>
          </View>
        )}
        <MessageBubble
          message={item}
          isCurrentUser={isCurrentUser}
          onLongPress={() => handleMessageLongPress(item)}
        />
      </View>
    );
  };

  const handleMessageLongPress = (message: Message) => {
    const isCurrentUser = message.senderId === 'currentUserId'; // Replace with actual current user ID
    
    const options = ['Copy'];
    if (isCurrentUser) {
      options.push('Delete');
    }
    options.push('Cancel');

    Alert.alert(
      'Message Options',
      '',
      options.map((option) => ({
        text: option,
        onPress: () => {
          if (option === 'Copy') {
            // Implement copy to clipboard
          } else if (option === 'Delete') {
            handleDeleteMessage(message);
          }
        },
        style: option === 'Cancel' ? 'cancel' : 'default',
      }))
    );
  };

  const handleDeleteMessage = (message: Message) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await FirebaseMessagingService.deleteMessage(message.id);
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          inverted
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {otherUserTyping && <TypingIndicator />}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder="Type a message..."
            multiline
            maxLength={5000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || uploading}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>

        {uploading && (
          <View style={styles.uploadingContainer}>
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 18,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  timestampContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  timestampText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  uploadingContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  uploadingText: {
    textAlign: 'center',
    color: '#666',
  },
});

export default ChatScreen;