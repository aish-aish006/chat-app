import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all chatrooms for current user
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const chatrooms = await prisma.chatroom.findMany({
      where: {
        users: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            sender: {
              select: {
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ chatrooms });
  } catch (error) {
    console.error('Get chatrooms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new chatroom
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, type, userIds } = req.body;
    const userId = req.userId!;

    // Create chatroom
    const chatroom = await prisma.chatroom.create({
      data: {
        name,
        type: type || 'GROUP',
        createdById: userId,
        users: {
          create: [
            { userId }, // Add creator
            ...(userIds || []).map((id: string) => ({ userId: id })),
          ],
        },
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({ chatroom });
  } catch (error) {
    console.error('Create chatroom error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get chatroom by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const chatroom = await prisma.chatroom.findFirst({
      where: {
        id,
        users: {
          some: {
            userId,
          },
        },
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
              },
            },
          },
        },
      },
    });

    if (!chatroom) {
      return res.status(404).json({ error: 'Chatroom not found' });
    }

    res.json({ chatroom });
  } catch (error) {
    console.error('Get chatroom error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join chatroom
router.post('/:id/join', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    // Check if already joined
    const existing = await prisma.chatroomUser.findFirst({
      where: {
        chatroomId: id,
        userId,
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already in this chatroom' });
    }

    // Join chatroom
    await prisma.chatroomUser.create({
      data: {
        chatroomId: id,
        userId,
      },
    });

    res.json({ message: 'Joined chatroom successfully' });
  } catch (error) {
    console.error('Join chatroom error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave chatroom
router.post('/:id/leave', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    await prisma.chatroomUser.deleteMany({
      where: {
        chatroomId: id,
        userId,
      },
    });

    res.json({ message: 'Left chatroom successfully' });
  } catch (error) {
    console.error('Leave chatroom error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;