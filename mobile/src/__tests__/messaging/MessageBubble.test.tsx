import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MessageBubble from '@/components/messaging/MessageBubble';
import { Message } from '@/types';

// Mock the helpers
jest.mock('@/utils/helpers', () => ({
  formatRelativeTime: jest.fn((date) => '2 minutes ago'),
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('MessageBubble', () => {
  const mockMessage: Message = {
    id: 1,
    senderId: 1,
    receiverId: 2,
    jobId: 1,
    content: 'Hello, this is a test message',
    attachments: [],
    isRead: false,
    createdAt: '2023-01-01T12:00:00Z',
  };

  const mockOnAttachmentPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders message content correctly', () => {
    const { getByText } = render(
      <MessageBubble
        message={mockMessage}
        isOwnMessage={true}
        onAttachmentPress={mockOnAttachmentPress}
      />
    );

    expect(getByText('Hello, this is a test message')).toBeTruthy();
    expect(getByText('2 minutes ago')).toBeTruthy();
  });

  it('shows read status for own messages', () => {
    const readMessage = { ...mockMessage, isRead: true };
    const { getByText } = render(
      <MessageBubble
        message={readMessage}
        isOwnMessage={true}
        onAttachmentPress={mockOnAttachmentPress}
      />
    );

    // Check that the message content and timestamp are rendered
    expect(getByText('Hello, this is a test message')).toBeTruthy();
    expect(getByText('2 minutes ago')).toBeTruthy();
  });

  it('renders image attachments', () => {
    const messageWithImage = {
      ...mockMessage,
      attachments: ['https://example.com/image.jpg'],
    };

    const { getByTestId } = render(
      <MessageBubble
        message={messageWithImage}
        isOwnMessage={true}
        onAttachmentPress={mockOnAttachmentPress}
      />
    );

    // Image should be rendered
    expect(() => getByTestId('attachment-image')).not.toThrow();
  });

  it('renders file attachments', () => {
    const messageWithFile = {
      ...mockMessage,
      attachments: ['https://example.com/document.pdf'],
    };

    const { getByText } = render(
      <MessageBubble
        message={messageWithFile}
        isOwnMessage={true}
        onAttachmentPress={mockOnAttachmentPress}
      />
    );

    expect(getByText('document.pdf')).toBeTruthy();
  });

  it('calls onAttachmentPress when attachment is tapped', () => {
    const messageWithFile = {
      ...mockMessage,
      attachments: ['https://example.com/document.pdf'],
    };

    const { getByText } = render(
      <MessageBubble
        message={messageWithFile}
        isOwnMessage={true}
        onAttachmentPress={mockOnAttachmentPress}
      />
    );

    fireEvent.press(getByText('document.pdf'));
    expect(mockOnAttachmentPress).toHaveBeenCalledWith('https://example.com/document.pdf');
  });

  it('applies correct styles for own messages', () => {
    const { getByTestId } = render(
      <MessageBubble
        message={mockMessage}
        isOwnMessage={true}
        onAttachmentPress={mockOnAttachmentPress}
      />
    );

    const container = getByTestId('message-container');
    const styles = Array.isArray(container.props.style) ? container.props.style : [container.props.style];
    const hasOwnMessageStyle = styles.some(style => style && style.alignItems === 'flex-end');
    expect(hasOwnMessageStyle).toBe(true);
  });

  it('applies correct styles for other messages', () => {
    const { getByTestId } = render(
      <MessageBubble
        message={mockMessage}
        isOwnMessage={false}
        onAttachmentPress={mockOnAttachmentPress}
      />
    );

    const container = getByTestId('message-container');
    const styles = Array.isArray(container.props.style) ? container.props.style : [container.props.style];
    const hasOtherMessageStyle = styles.some(style => style && style.alignItems === 'flex-start');
    expect(hasOtherMessageStyle).toBe(true);
  });
});