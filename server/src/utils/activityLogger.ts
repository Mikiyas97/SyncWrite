import Activity, { ActivityAction } from '../models/Activity';
import { getIO } from '../socket';
import { logger } from './logger';

export const logActivity = async (
  documentId: string,
  userId: string,
  action: ActivityAction,
  details: Record<string, any> = {}
) => {
  try {
    const activity = await Activity.create({
      document: documentId,
      user: userId,
      action,
      details,
    });

    await activity.populate('user', 'name email avatarColor');
    if (activity.details && activity.details.targetUser) {
      await activity.populate('details.targetUser', 'name email avatarColor');
    }

    try {
      const io = getIO();
      io.to(`doc:${documentId}`).emit('activity:new', activity);
    } catch (socketErr) {
      logger.warn('Failed to broadcast activity over Socket.IO', { error: socketErr });
    }

    return activity;
  } catch (error) {
    logger.error('Failed to log document activity', { error, documentId, userId, action });
    return null;
  }
};
