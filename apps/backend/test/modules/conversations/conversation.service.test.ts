import { ConversationService } from '@/modules/conversations/conversation.service.js';

// Model mocks must be hoisted for vi.mock factory access.
const mocks = vi.hoisted(() => ({
  conversationFindMock: vi.fn(),
  conversationFindOneMock: vi.fn(),
  conversationFindByIdMock: vi.fn(),
  conversationFindByIdAndUpdateMock: vi.fn(),
  conversationCreateMock: vi.fn(),
  messageFindMock: vi.fn(),
  messageCreateMock: vi.fn(),
  messageFindByIdMock: vi.fn(),
  messageUpdateManyMock: vi.fn(),
  messageAggregateMock: vi.fn(),
  messageCountDocumentsMock: vi.fn(),
  agentFindOneMock: vi.fn(),
  agentFindByIdAndUpdateMock: vi.fn(),
  cacheServiceMock: {
    getConversations: vi.fn(),
    setConversations: vi.fn(),
    invalidateConversations: vi.fn(),
    getMessages: vi.fn(),
    setMessages: vi.fn(),
    invalidateMessages: vi.fn(),
    resetUnreadCount: vi.fn(),
  },
}));

const {
  conversationFindMock,
  conversationFindOneMock,
  conversationFindByIdMock,
  conversationFindByIdAndUpdateMock,
  conversationCreateMock,
  messageFindMock,
  messageCreateMock,
  messageFindByIdMock,
  messageAggregateMock,
  messageCountDocumentsMock,
  agentFindOneMock,
  agentFindByIdAndUpdateMock,
  cacheServiceMock,
} = mocks;

vi.mock('@/models/conversation.model.js', () => ({
  ConversationModel: {
    find: mocks.conversationFindMock,
    findOne: mocks.conversationFindOneMock,
    findById: mocks.conversationFindByIdMock,
    findByIdAndUpdate: mocks.conversationFindByIdAndUpdateMock,
    create: mocks.conversationCreateMock,
  },
}));

vi.mock('@/models/message.model.js', () => ({
  MessageModel: {
    find: mocks.messageFindMock,
    create: mocks.messageCreateMock,
    findById: mocks.messageFindByIdMock,
    updateMany: mocks.messageUpdateManyMock,
    aggregate: mocks.messageAggregateMock,
    countDocuments: mocks.messageCountDocumentsMock,
  },
}));

vi.mock('@/services/cache.service.js', () => ({
  cacheService: mocks.cacheServiceMock,
}));

vi.mock('@/models/agent.model.js', () => ({
  AgentModel: {
    findOne: mocks.agentFindOneMock,
    findByIdAndUpdate: mocks.agentFindByIdAndUpdateMock,
  },
}));

// Returns a valid 24-char hex ObjectId string.
const oid = (seed: string): string => {
  const hex = seed
    .split('')
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
  return (hex + '0'.repeat(24)).slice(0, 24);
};

interface MockQuery {
  sort?: ReturnType<typeof vi.fn>;
  limit?: ReturnType<typeof vi.fn>;
  populate?: ReturnType<typeof vi.fn>;
  lean?: ReturnType<typeof vi.fn>;
  select?: ReturnType<typeof vi.fn>;
  exec?: ReturnType<typeof vi.fn>;
  then?: (onFulfilled: (value: unknown) => void, onRejected?: (reason: unknown) => void) => void;
}

function queryChain<T>(result: T): MockQuery {
  const q: MockQuery = {};
  q.sort = vi.fn().mockReturnValue(q);
  q.limit = vi.fn().mockReturnValue(q);
  q.populate = vi.fn().mockReturnValue(q);
  q.select = vi.fn().mockReturnValue(q);
  q.lean = vi.fn().mockImplementation(() => Promise.resolve(result));
  q.exec = vi.fn().mockImplementation(() => Promise.resolve(result));
  q.then = (onFulfilled: (value: unknown) => void) => {
    onFulfilled(result);
  };
  return q;
}

const populatedConv = (id = oid('conv-1')) => ({
  _id: { toString: () => id },
  type: 'direct',
  name: null,
  participants: [
    { _id: { toString: () => oid('u1') }, name: 'Alice', avatar: null, status: 'online' },
    { _id: { toString: () => oid('u2') }, name: 'Bob', avatar: null, status: 'offline' },
  ],
  lastMessage: { _id: { toString: () => oid('lm1') }, content: 'hi', senderId: { toString: () => oid('u1') }, createdAt: new Date() },
  lastMessageAt: new Date(),
  createdAt: new Date(),
});

const populatedMsg = (id = oid('m1')) => ({
  _id: { toString: () => id },
  conversationId: { toString: () => oid('conv-1') },
  senderId: { toString: () => oid('u1') },
  content: 'hello',
  type: 'text',
  statuses: [{ recipientId: { toString: () => oid('u2') }, status: 'sent', timestamp: new Date() }],
  createdAt: new Date(),
});

describe('ConversationService', () => {
  let service: ConversationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ConversationService();
  });

  describe('getConversations', () => {
    it('returns cached conversations when cache hits', async () => {
      const cached = [{ id: oid('conv-1'), type: 'direct' }];
      cacheServiceMock.getConversations.mockResolvedValue(cached);

      const result = await service.getConversations(oid('user-1'));

      expect(cacheServiceMock.getConversations).toHaveBeenCalledWith(oid('user-1'));
      expect(conversationFindMock).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it('fetches from DB and caches on cache miss', async () => {
      cacheServiceMock.getConversations.mockResolvedValue(null);
      conversationFindMock.mockReturnValue(
        queryChain([populatedConv()])
      );

      const result = await service.getConversations(oid('user-1'));

      expect(conversationFindMock).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(oid('conv-1'));
      expect(cacheServiceMock.setConversations).toHaveBeenCalledWith(oid('user-1'), result);
    });
  });

  describe('getConversationById', () => {
    it('returns the conversation summary for a participant', async () => {
      conversationFindOneMock.mockReturnValue(queryChain(populatedConv()));

      const result = await service.getConversationById(oid('conv-1'), oid('u1'));

      expect(conversationFindOneMock).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: oid('conv-1'),
          participants: expect.anything(),
        })
      );
      expect(result.id).toBe(oid('conv-1'));
      expect(result.participants).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Alice' }),
          expect.objectContaining({ name: 'Bob' }),
        ])
      );
    });

    it('throws 404 when the conversation does not exist or is not a participant', async () => {
      conversationFindOneMock.mockReturnValue(queryChain(null));

      await expect(service.getConversationById(oid('conv-x'), oid('u1'))).rejects.toMatchObject({
        message: 'Conversation not found',
        statusCode: 404,
      });
    });

    it('throws 404 for an invalid conversation id', async () => {
      await expect(service.getConversationById('not-an-id', oid('u1'))).rejects.toMatchObject({
        message: 'Conversation not found',
        statusCode: 404,
      });
      expect(conversationFindOneMock).not.toHaveBeenCalled();
    });
  });

  describe('createConversation', () => {
    it('reuses an existing direct conversation', async () => {
      const existing = { ...populatedConv(), lastMessage: null };
      conversationFindOneMock.mockReturnValue(queryChain(existing));

      const result = await service.createConversation('direct', [oid('u1'), oid('u2')], undefined, oid('u1'));

      expect(conversationFindOneMock).toHaveBeenCalled();
      expect(result.id).toBe(oid('conv-1'));
      expect(conversationCreateMock).not.toHaveBeenCalled();
    });

    it('creates a new conversation when no existing one found', async () => {
      conversationFindOneMock.mockReturnValue(queryChain(null));
      conversationCreateMock.mockResolvedValue({ _id: { toString: () => oid('conv-new') } });
      conversationFindByIdMock.mockReturnValue(queryChain(populatedConv(oid('conv-new'))));

      const result = await service.createConversation('direct', [oid('u2')], undefined, oid('u1'));

      expect(conversationCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'direct',
          participants: expect.any(Array),
        })
      );
      expect(result.id).toBe(oid('conv-new'));
      expect(cacheServiceMock.invalidateConversations).toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    it('returns messages in ascending (oldest-first) order with no older messages', async () => {
      // DB mock returns newest-first (desc), service reverses to oldest-first.
      const messages = [populatedMsg(oid('m2')), populatedMsg(oid('m1'))];
      messageFindMock.mockReturnValue(queryChain(messages));
      messageCountDocumentsMock.mockResolvedValue(0);

      const result = await service.getMessages(oid('conv-1'), undefined, 50);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe(oid('m1'));
      expect(result.items[1].id).toBe(oid('m2'));
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
      expect(cacheServiceMock.setMessages).toHaveBeenCalledWith(oid('conv-1'), expect.anything());
    });

    it('sets hasMore and a cursor for older messages when more exist', async () => {
      // Simulate a limit of 2: DB returns the two newest (desc) which become
      // [oldest, newest] after the service reverses them.
      const messages = [
        populatedMsg(oid('m3')),
        {
          ...populatedMsg(oid('m2')),
          createdAt: new Date('2024-01-02T00:00:00.000Z'),
        },
      ];
      messageFindMock.mockReturnValue(queryChain(messages));
      messageCountDocumentsMock.mockResolvedValue(1); // one older message exists

      const result = await service.getMessages(oid('conv-1'), undefined, 2);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe(oid('m2'));
      expect(result.items[1].id).toBe(oid('m3'));
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('2024-01-02T00:00:00.000Z');
    });
  });

  describe('sendMessage', () => {
    it('throws 404 when conversation is not found', async () => {
      conversationFindByIdMock.mockResolvedValue(null);

      await expect(service.sendMessage(oid('conv-x'), oid('u1'), 'hi')).rejects.toMatchObject({
        message: 'Conversation not found',
        statusCode: 404,
      });
    });

    it('creates a message, updates lastMessage, and invalidates caches', async () => {
      conversationFindByIdMock.mockResolvedValue({
        participants: [
          { toString: () => oid('u1') },
          { toString: () => oid('u2') },
        ],
      });
      const msg = populatedMsg();
      messageCreateMock.mockResolvedValue(msg);
      conversationFindByIdAndUpdateMock.mockResolvedValue({});
      messageFindByIdMock.mockReturnValue(
        queryChain({
          ...msg,
          senderId: { _id: { toString: () => oid('u1') }, name: 'Alice', avatar: null },
        })
      );

      const result = await service.sendMessage(oid('conv-1'), oid('u1'), 'hello', 'text');

      expect(messageCreateMock).toHaveBeenCalled();
      expect(conversationFindByIdAndUpdateMock).toHaveBeenCalledWith(oid('conv-1'), {
        lastMessage: expect.anything(),
        lastMessageAt: expect.any(Date),
      });
      expect(result.content).toBe('hello');
      expect(cacheServiceMock.invalidateMessages).toHaveBeenCalledWith(oid('conv-1'));
    });
  });

  describe('getUnreadCounts', () => {
    it('returns counts keyed by conversation id', async () => {
      messageAggregateMock.mockResolvedValue([
        { _id: { toString: () => oid('conv-1') }, count: 3 },
        { _id: { toString: () => oid('conv-2') }, count: 1 },
      ]);

      const counts = await service.getUnreadCounts(oid('u2'));

      expect(counts).toEqual({ [oid('conv-1')]: 3, [oid('conv-2')]: 1 });
    });
  });
});