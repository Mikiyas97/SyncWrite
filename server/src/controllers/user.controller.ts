import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

/**
 * GET /api/users/search?q=term
 * Search users by name or email. Returns up to 5 matches.
 * Excludes the currently authenticated user from results.
 */
export const searchUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = (req.query.q as string || '').trim();

    if (!query || query.length < 2) {
      return res.status(200).json({
        success: true,
        data: { users: [] },
      });
    }

    // Escape regex special characters for safety
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ],
    })
      .select('name email avatarColor')
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};
