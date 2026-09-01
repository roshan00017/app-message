import type { Socket } from 'socket.io';

import {
  extractSessionId,
  parseCookies,
  socketAuthMiddleware,
} from '@/socket/middleware/auth.middleware.js';

const mocks = vi.hoisted(() => ({
  sessionCollectionFindOneMock: vi.fn(),
  mongooseState: { readyState: 1 },
}));

const { sessionCollectionFindOneMock, mongooseState } = mocks;

vi.mock('mongoose', () => ({
  default: {
    connection: {
      get readyState() {
        return mocks.mongooseState.readyState;
      },
      collection: vi.fn(() => ({
        findOne: mocks.sessionCollectionFindOneMock,
      })),
    },
  },
}));

function createSocket(cookie?: string, auth?: Record<string, unknown>): Socket {
  return {
    id: 'socket-1',
    handshake: {
      headers: { cookie },
      auth: auth ?? {},
    },
    data: {},
  } as unknown as Socket;
}

describe('parseCookies', () => {
  it('returns an empty object for no cookie header', () => {
    expect(parseCookies(undefined)).toEqual({});
  });

  it('parses a single cookie', () => {
    expect(parseCookies('name=value')).toEqual({ name: 'value' });
  });

  it('parses multiple cookies', () => {
    expect(parseCookies('a=1; b=2; c=3')).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('handles values containing = signs', () => {
    expect(parseCookies('token=abc=def')).toEqual({ token: 'abc=def' });
  });
});

describe('extractSessionId', () => {
  it('decodes and strips the express-session signed cookie format', () => {
    expect(extractSessionId('s%3AmySWelLlJU0OuWtWmlUYDpog1SysshGp.kRr5a20DE2ejC8o7wyH%2FvvQhQ')).toBe(
      'mySWelLlJU0OuWtWmlUYDpog1SysshGp'
    );
  });

  it('returns the raw value for unsigned cookies', () => {
    expect(extractSessionId('plain-session-id')).toBe('plain-session-id');
  });

  it('returns undefined for empty input', () => {
    expect(extractSessionId(undefined)).toBeUndefined();
    expect(extractSessionId('')).toBeUndefined();
  });
});

describe('socketAuthMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mongooseState.readyState = 1;
  });

  it('allows anonymous connection when no session cookie is present', async () => {
    const socket = createSocket(undefined);
    const next = vi.fn();

    await socketAuthMiddleware(socket, next);

    expect(socket.data.userId).toBe('anonymous');
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('uses sessionId from handshake auth when cookie is absent', async () => {
    const socket = createSocket(undefined, { sessionId: 'session-abc' });
    const next = vi.fn();
    sessionCollectionFindOneMock.mockResolvedValue({
      _id: 'session-abc',
      session: JSON.stringify({
        userId: 'user-1',
        user: { id: 'user-1', email: 'a@b.com', name: 'A', role: 'user', avatar: null },
      }),
    });

    await socketAuthMiddleware(socket, next);

    expect(sessionCollectionFindOneMock).toHaveBeenCalledWith({ _id: 'session-abc' });
    expect(socket.data.userId).toBe('user-1');
  });

  it('rejects with "Server not ready" when MongoDB is disconnected', async () => {
    mongooseState.readyState = 0;

    const socket = createSocket('sessionId=session-abc');
    const next = vi.fn();

    await socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(new Error('Server not ready'));
  });

  it('allows anonymous when the session document is missing', async () => {
    sessionCollectionFindOneMock.mockResolvedValue(null);
    const socket = createSocket('sessionId=missing-session');
    const next = vi.fn();

    await socketAuthMiddleware(socket, next);

    expect(socket.data.userId).toBe('anonymous');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('authenticates from a valid cookie session', async () => {
    sessionCollectionFindOneMock.mockResolvedValue({
      _id: 'session-1',
      session: JSON.stringify({
        userId: 'user-7',
        user: { id: 'user-7', email: 'x@y.com', name: 'X', role: 'admin', avatar: null },
      }),
    });

    const socket = createSocket('sessionId=session-1');
    const next = vi.fn();

    await socketAuthMiddleware(socket, next);

    expect(socket.data.userId).toBe('user-7');
    expect(socket.data.user?.email).toBe('x@y.com');
    expect(next).toHaveBeenCalledWith();
  });

  it('authenticates from a real (URL-encoded, signed) express-session cookie', async () => {
    sessionCollectionFindOneMock.mockResolvedValue({
      _id: 'session-1',
      session: JSON.stringify({
        userId: 'user-7',
        user: { id: 'user-7', email: 'x@y.com', name: 'X', role: 'admin', avatar: null },
      }),
    });

    const socket = createSocket('sessionId=s%3Asession-1.sig%2FABC');
    const next = vi.fn();

    await socketAuthMiddleware(socket, next);

    expect(sessionCollectionFindOneMock).toHaveBeenCalledWith({ _id: 'session-1' });
    expect(socket.data.userId).toBe('user-7');
    expect(next).toHaveBeenCalledWith();
  });

  it('allows anonymous when session data is missing userId', async () => {
    sessionCollectionFindOneMock.mockResolvedValue({
      _id: 'session-1',
      session: JSON.stringify({ noUserId: true }),
    });

    const socket = createSocket('sessionId=session-1');
    const next = vi.fn();

    await socketAuthMiddleware(socket, next);

    expect(socket.data.userId).toBe('anonymous');
    expect(next).toHaveBeenCalledWith();
  });
});