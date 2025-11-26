'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LogOut, Plus, Send, Users, Video } from 'lucide-react';
import VideoCall from '@/components/VideoCall';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { chatroomAPI, messageAPI, userAPI } from '@/lib/api';
import { getSocket, initializeSocket, disconnectSocket } from '@/lib/socket';
import { Message, User } from '@/types';

export default function ChatPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);

  const {
    chatrooms,
    currentChatroom,
    messages,
    onlineUsers,
    typingUsers,
    setChatrooms,
    setCurrentChatroom,
    addMessage,
    setMessages,
    addChatroom,
    setUserOnline,
    setUserOffline,
    addTypingUser,
    removeTypingUser,
  } = useChatStore();

  const [messageInput, setMessageInput] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize socket and load data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      router.push('/login');
      return;
    }

    // Initialize socket
    const socket = initializeSocket(token);

    // Load chatrooms
    loadChatrooms();

    // Load users for creating rooms
    loadUsers();

    // Socket event listeners
    socket.on('receive-message', (message: Message) => {
      addMessage(message);
    });

    socket.on('user-online', ({ userId }: { userId: string }) => {
      setUserOnline(userId);
    });

    socket.on('user-offline', ({ userId }: { userId: string }) => {
      setUserOffline(userId);
    });

    socket.on('online-users-list', ({ userIds }: { userIds: string[] }) => {
      console.log('Received online users list:', userIds);
      userIds.forEach(id => setUserOnline(id));
    });

    socket.on('user-typing', ({ chatroomId, userId }: { chatroomId: string; userId: string }) => {
      if (userId !== user.id) {
        addTypingUser(chatroomId, userId);
      }
    });

    socket.on('user-stopped-typing', ({ chatroomId, userId }: { chatroomId: string; userId: string }) => {
      removeTypingUser(chatroomId, userId);
    });


    return () => {
      disconnectSocket();
    };
  }, [user, router]);

  // DEBUG: Log online users
useEffect(() => {
  console.log('Online users:', Array.from(onlineUsers));
}, [onlineUsers]);

  const loadChatrooms = async () => {
    try {
      const response = await chatroomAPI.getChatrooms();
      setChatrooms(response.data.chatrooms);
    } catch (error) {
      console.error('Failed to load chatrooms:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await userAPI.getUsers();
      setAllUsers(response.data.users.filter((u: User) => u.id !== user?.id));
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadMessages = async (chatroomId: string) => {
    try {
      const response = await messageAPI.getMessages(chatroomId);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSelectChatroom = (chatroom: any) => {
    setCurrentChatroom(chatroom);
    loadMessages(chatroom.id);
    
    const socket = getSocket();
    if (socket) {
      socket.emit('join-room', chatroom.id);
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !currentChatroom) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('send-message', {
        chatroomId: currentChatroom.id,
        content: messageInput,
      });
      setMessageInput('');
      
      // Stop typing indicator
      socket.emit('typing-stop', currentChatroom.id);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleTyping = () => {
    if (!currentChatroom) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('typing-start', currentChatroom.id);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop', currentChatroom.id);
      }, 2000);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;

    try {
      const response = await chatroomAPI.createChatroom({
        name: newRoomName,
        type: selectedUsers.length === 1 ? 'PRIVATE' : 'GROUP',
        userIds: selectedUsers,
      });
      
      addChatroom(response.data.chatroom);
      setNewRoomName('');
      setSelectedUsers([]);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create chatroom:', error);
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    logout();
    router.push('/login');
  };

  const getTypingUsersText = () => {
    if (!currentChatroom) return '';
    const typing = typingUsers.get(currentChatroom.id) || [];
    if (typing.length === 0) return '';
    
    const typingUsernames = typing
      .map(userId => {
        const chatroomUser = currentChatroom.users.find(cu => cu.userId === userId);
        return chatroomUser?.user.username;
      })
      .filter(Boolean);
    
    if (typingUsernames.length === 1) {
      return `${typingUsernames[0]} is typing...`;
    } else if (typingUsernames.length > 1) {
      return `${typingUsernames.length} people are typing...`;
    }
    return '';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarFallback className="bg-purple-500 text-white">
                  {user?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{user?.username}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Chatroom</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Room name"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Select users:</p>
                  <ScrollArea className="h-48 border rounded-md p-2">
                    {allUsers.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, u.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                            }
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {u.username[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {onlineUsers.has(u.id) && (
                              <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white" />
                            )}
                          </div>
                          <span>{u.username}</span>
                        </div>
                      </label>
                    ))}
                  </ScrollArea>
                </div>
                <Button onClick={handleCreateRoom} className="w-full">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Chatrooms List */}
        <ScrollArea className="flex-1">
          {chatrooms.map((chatroom) => (
            <div
              key={chatroom.id}
              onClick={() => handleSelectChatroom(chatroom)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                currentChatroom?.id === chatroom.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-blue-500 text-white">
                    {chatroom.type === 'GROUP' ? (
                      <Users className="w-4 h-4" />
                    ) : (
                      chatroom.name[0]?.toUpperCase()
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{chatroom.name}</p>
                    {chatroom.type === 'GROUP' && (
                      <Badge variant="secondary" className="text-xs">
                        {chatroom.users.length}
                      </Badge>
                    )}
                  </div>
                  {chatroom.messages?.[0] && (
                    <p className="text-xs text-gray-500 truncate">
                      {chatroom.messages[0].sender.username}: {chatroom.messages[0].content}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentChatroom ? (
          <>
          {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback className="bg-blue-500 text-white">
                        {currentChatroom.type === 'GROUP' ? (
                          <Users className="w-4 h-4" />
                        ) : (
                          currentChatroom.name[0]?.toUpperCase()
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {currentChatroom.type === 'PRIVATE' && 
                      currentChatroom.users.some(u => u.userId !== user?.id && onlineUsers.has(u.userId)) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{currentChatroom.name}</p>
                    <p className="text-xs text-gray-500">
                      {currentChatroom.type === 'GROUP' ? (
                        `${currentChatroom.users.filter(u => onlineUsers.has(u.userId)).length}/${currentChatroom.users.length} online`
                      ) : (
                        currentChatroom.users.some(u => u.userId !== user?.id && onlineUsers.has(u.userId)) 
                          ? 'Online' 
                          : 'Offline'
                      )}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsVideoCallOpen(true)}
                  className="gap-2"
                >
                  <Video className="w-4 h-4" />
                  Start Call
                </Button>
              </div>
            </div>
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.map((message) => {
                const isOwnMessage = message.senderId === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gray-300 text-xs">
                          {message.sender.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        {!isOwnMessage && (
                          <p className="text-xs text-gray-500 mb-1">{message.sender.username}</p>
                        )}
                        <Card className={`p-3 ${isOwnMessage ? 'bg-blue-500 text-white' : 'bg-white'}`}>
                          <p className="text-sm">{message.content}</p>
                        </Card>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Typing Indicator */}
            {getTypingUsersText() && (
              <div className="px-4 py-1 text-sm text-gray-500 italic">
                {getTypingUsersText()}
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button onClick={handleSendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a chat to start messaging</p>
            </div>
          </div>
          
        )}
      </div>
      {/* Video Call Component */}
      {currentChatroom && (
        <VideoCall
          isOpen={isVideoCallOpen}
          onClose={() => setIsVideoCallOpen(false)}
          roomName={currentChatroom.name}
          userName={user?.username || ''}
        />
      )}
    </div>
  );
}