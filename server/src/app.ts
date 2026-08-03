import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import documentRoutes from './routes/document.routes';
import versionRoutes from './routes/version.routes';
import commentRoutes from './routes/comment.routes';
import activityRoutes from './routes/activity.routes';
import userRoutes from './routes/user.routes';
import { errorHandler } from './middleware/errorHandler';
import morgan from 'morgan';
import { logger } from './utils/logger';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Request logging
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logMessage = message.trim();
        if (logMessage.includes(' 500 ')) {
          logger.error(logMessage);
        } else if (logMessage.includes(' 40') || logMessage.includes(' 50')) {
          logger.warn(logMessage);
        } else {
          logger.info(logMessage);
        }
      },
    },
  })
);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/documents/:id/versions', versionRoutes);
app.use('/api/documents/:id/comments', commentRoutes);
app.use('/api/documents/:id/activity', activityRoutes);
app.use('/api/users', userRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
