import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

// Store online users: userId -> socketId
const onlineUsers = new Map<string, string>();

interface AuthSocket extends Socket {
  userId?: string;
}

export const initializeSocket = (io: Server) => {
  // Authentication middleware for Socket.io
  io.use((socket: AuthSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key'
      ) as { userId: string };

      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket: AuthSocket) => {
    const userId = socket.userId!;
    console.log(`User connected: ${userId}`);

    // Mark user as online
    onlineUsers.set(userId, socket.id);
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true },
    });

    // Broadcast user online status
    io.emit('user-online', { userId });

    // Send all currently online users to the newly connected user
  socket.emit('online-users-list', { 
    userIds: Array.from(onlineUsers.keys()) 
  });

    // Join user to their chatrooms
    const userChatrooms = await prisma.chatroomUser.findMany({
      where: { userId },
      select: { chatroomId: true },
    });

    userChatrooms.forEach(({ chatroomId }) => {
      socket.join(chatroomId);
    });

    // Handle joining a room
    socket.on('join-room', async (chatroomId: string) => {
      try {
        // Verify user is member
        const isMember = await prisma.chatroomUser.findFirst({
          where: { chatroomId, userId },
        });

        if (isMember) {
          socket.join(chatroomId);
          socket.emit('joined-room', { chatroomId });
          
          // Notify others
          socket.to(chatroomId).emit('user-joined-room', {
            chatroomId,
            userId,
          });
        }
      } catch (error) {
        console.error('Join room error:', error);
      }
    });

    // Handle leaving a room
    socket.on('leave-room', (chatroomId: string) => {
      socket.leave(chatroomId);
      socket.to(chatroomId).emit('user-left-room', {
        chatroomId,
        userId,
      });
    });

    // Handle sending messages
    socket.on('send-message', async (data: {
      chatroomId: string;
      content: string;
      messageType?: string;
    }) => {
      try {
        const { chatroomId, content, messageType = 'TEXT' } = data;

        // Verify user is member
        const isMember = await prisma.chatroomUser.findFirst({
          where: { chatroomId, userId },
        });

        if (!isMember) {
          return socket.emit('error', { message: 'Not a member of this chatroom' });
        }

        // Save message to database
        const message = await prisma.message.create({
          data: {
            content,
            messageType: messageType as any,
            senderId: userId,
            chatroomId,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        });

        // Broadcast message to room
        io.to(chatroomId).emit('receive-message', message);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (chatroomId: string) => {
      socket.to(chatroomId).emit('user-typing', {
        chatroomId,
        userId,
      });
    });

    socket.on('typing-stop', (chatroomId: string) => {
      socket.to(chatroomId).emit('user-stopped-typing', {
        chatroomId,
        userId,
      });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${userId}`);
      
      onlineUsers.delete(userId);
      
      // Mark user as offline
      await prisma.user.update({
        where: { id: userId },
        data: {
          isOnline: false,
          lastSeen: new Date(),
        },
      });

      // Broadcast user offline status
      io.emit('user-offline', { userId });
    });
  });
};