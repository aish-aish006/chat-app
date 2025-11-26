// User types
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
  createdAt?: Date;
}

// Auth types
export interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

// Chatroom types
export interface Chatroom {
  id: string;
  name: string;
  type: 'PRIVATE' | 'GROUP';
  avatar?: string;
  createdAt: Date;
  users: ChatroomUser[];
  messages?: Message[];
}

export interface ChatroomUser {
  id: string;
  userId: string;
  chatroomId: string;
  joinedAt: Date;
  lastReadAt: Date;
  user: User;
}

// Message types
export interface Message {
  id: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE';
  isEdited: boolean;
  createdAt: Date;
  senderId: string;
  chatroomId: string;
  sender: User;
}

// Socket event types
export interface TypingEvent {
  chatroomId: string;
  userId: string;
}