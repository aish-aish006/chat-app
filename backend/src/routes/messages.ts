import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get messages for a chatroom (with pagination)
router.get('/:chatroomId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { chatroomId } = req.params;
    const { limit = '50', before } = req.query;
    const userId = req.userId!;

    // Check if user is in chatroom
    const isMember = await prisma.chatroomUser.findFirst({
      where: {
        chatroomId,
        userId,
      },
    });

    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this chatroom' });
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: {
        chatroomId,
        ...(before && { createdAt: { lt: new Date(before as string) } }),
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
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit as string),
    });

    res.json({ messages: messages.reverse() }); // Reverse to show oldest first
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;