import mongoose from 'mongoose';
import type { Socket } from 'socket.io';

import { logger } from '../../utils/logger.js';

interface SessionData {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar: string | null;
  };
}

declare module 'socket.io' {
  interface SocketData {
    userId: string;
    user: SessionData['user'];
  }
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.split('=');
    if (name) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });
  return cookies;
}

/**
 * express-session signs its cookies as `s:<sessionID>.<signature>` and the
 * value is URL-encoded over the wire (e.g. `s%3AabcDEF...`). The session
 * store keys documents by just the unsigned `<sessionID>`, so we must
 * decode the value and strip both the `s:` prefix and the signature before
 * looking it up.
 */
export function extractSessionId(cookieValue: string | undefined): string | undefined {
  if (!cookieValue) return undefined;
  try {
    const decoded = decodeURIComponent(cookieValue);
    if (decoded.startsWith('s:')) {
      return decoded.slice(2).split('.')[0];
    }
    return decoded;
  } catch {
    return undefined;
  }
}

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const sessionId =
      extractSessionId(cookies['sessionId']) || socket.handshake.auth?.sessionId;

    if (!sessionId) {
      logger.debug({ socketId: socket.id }, 'Socket auth: no session ID in request');
      // Allow connection but mark as unauthenticated
      // The socket can still receive broadcasts but can't send events
      socket.data.userId = 'anonymous';
      socket.data.user = undefined;
      next();
      return;
    }

    // Check if MongoDB is connected
    if (!mongoose.connection.readyState) {
      logger.warn({ socketId: socket.id }, 'Socket auth: MongoDB not connected');
      return next(new Error('Server not ready'));
    }

    const sessionCollection = mongoose.connection.collection('sessions');
    const sessionDoc = await sessionCollection.findOne({ _id: sessionId });

    if (!sessionDoc?.session) {
      logger.debug({ socketId: socket.id }, 'Socket auth: session not found');
      // Session expired or invalid — allow anonymous connection
      socket.data.userId = 'anonymous';
      socket.data.user = undefined;
      next();
      return;
    }

    const sessionData: SessionData =
      typeof sessionDoc.session === 'string' ? JSON.parse(sessionDoc.session) : sessionDoc.session;

    if (!sessionData.userId) {
      logger.debug({ socketId: socket.id }, 'Socket auth: no userId in session');
      socket.data.userId = 'anonymous';
      socket.data.user = undefined;
      next();
      return;
    }

    socket.data.userId = sessionData.userId;
    socket.data.user = sessionData.user;

    logger.debug({ userId: sessionData.userId, socketId: socket.id }, 'Socket authenticated');
    next();
  } catch (error) {
    logger.error({ err: error, socketId: socket.id }, 'Socket auth middleware error');
    // Don't reject — allow anonymous connection
    socket.data.userId = 'anonymous';
    socket.data.user = undefined;
    next();
  }
}
