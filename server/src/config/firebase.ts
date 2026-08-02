import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

let initialized = false;

const normalizePrivateKey = (raw?: string): string | undefined => {
  if (!raw) return undefined;

  let key = raw.trim();

  // Strip wrapping quotes that some .env parsers leave in place
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  return key.replace(/\\n/g, '\n');
};

export const initFirebase = (): App | null => {
  if (initialized && getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  const missing: string[] = [];
  if (!projectId) missing.push('FIREBASE_PROJECT_ID');
  if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');

  if (missing.length > 0) {
    logger.warn(
      `Firebase Admin SDK not configured — missing: ${missing.join(', ')}`
    );
    return null;
  }

  try {
    initializeApp({
      credential: cert({
        projectId: projectId!,
        clientEmail: clientEmail!,
        privateKey: privateKey!,
      }),
    });

    initialized = true;
    logger.info('Firebase Admin SDK initialized');
    return getApps()[0];
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', { error });
    return null;
  }
};

export const verifyFirebaseIdToken = async (token: string) => {
  const app = initFirebase();

  if (!app) {
    throw new AppError('Google login is not configured on this server', 503);
  }

  return getAuth(app).verifyIdToken(token, true);
};
