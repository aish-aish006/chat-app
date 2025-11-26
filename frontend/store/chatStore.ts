import { create } from 'zustand';
import { Chatroom, Message, User } from '@/types';

interface ChatState {
  chatrooms: Chatroom[];
  currentChatroom: Chatroom | null;
  messages: Message[];
  onlineUsers: Set<string>;
  typingUsers: Map<string, string[]>; // chatroomId -> [userIds]
  
  setChatrooms: (chatrooms: Chatroom[]) => void;
  setCurrentChatroom: (chatroom: Chatroom | null) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  addChatroom: (chatroom: Chatroom) => void;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  addTypingUser: (chatroomId: string, userId: string) => void;
  removeTypingUser: (chatroomId: string, userId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chatrooms: [],
  currentChatroom: null,
  messages: [],
  onlineUsers: new Set(),
  typingUsers: new Map(),
  
  setChatrooms: (chatrooms) => set({ chatrooms }),
  
  setCurrentChatroom: (chatroom) => set({ currentChatroom: chatroom, messages: [] }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
  
  setMessages: (messages) => set({ messages }),
  
  addChatroom: (chatroom) => set((state) => ({
    chatrooms: [chatroom, ...state.chatrooms],
  })),
  
  setUserOnline: (userId) => set((state) => {
    const newOnlineUsers = new Set(state.onlineUsers);
    newOnlineUsers.add(userId);
    return { onlineUsers: newOnlineUsers };
  }),
  
  setUserOffline: (userId) => set((state) => {
    const newOnlineUsers = new Set(state.onlineUsers);
    newOnlineUsers.delete(userId);
    return { onlineUsers: newOnlineUsers };
  }),
  
  addTypingUser: (chatroomId, userId) => set((state) => {
    const newTypingUsers = new Map(state.typingUsers);
    const users = newTypingUsers.get(chatroomId) || [];
    if (!users.includes(userId)) {
      newTypingUsers.set(chatroomId, [...users, userId]);
    }
    return { typingUsers: newTypingUsers };
  }),
  
  removeTypingUser: (chatroomId, userId) => set((state) => {
    const newTypingUsers = new Map(state.typingUsers);
    const users = newTypingUsers.get(chatroomId) || [];
    newTypingUsers.set(chatroomId, users.filter(id => id !== userId));
    return { typingUsers: newTypingUsers };
  }),
}));