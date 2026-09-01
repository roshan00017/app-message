import { AgentService } from '@/modules/agents/agent.service.js';

const mocks = vi.hoisted(() => ({
  agentFindMock: vi.fn(),
  agentFindOneMock: vi.fn(),
  agentFindByIdMock: vi.fn(),
  agentFindByIdAndUpdateMock: vi.fn(),
  agentCreateMock: vi.fn(),
  agentFindByIdAndDeleteMock: vi.fn(),
  conversationFindByIdAndUpdateMock: vi.fn(),
}));

const { agentFindMock, agentFindOneMock, agentFindByIdMock, agentFindByIdAndUpdateMock, agentCreateMock, agentFindByIdAndDeleteMock, conversationFindByIdAndUpdateMock } = mocks;

// Returns a valid 24-char hex ObjectId string.
const oid = (seed: string): string => {
  const hex = seed
    .split('')
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
  return (hex + '0'.repeat(24)).slice(0, 24);
};
const USER_ID = oid('user-1');
const AGENT_ID = oid('agent-1');
const CONV_ID = oid('conv-1');

const mockPopulatedUser = () => ({
  _id: { toString: () => USER_ID },
  name: 'Support Agent',
  email: 'agent@example.com',
  avatar: null,
  status: 'online',
});

const mockAgentDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: { toString: () => AGENT_ID },
  userId: mockPopulatedUser(),
  skills: ['billing'],
  maxConcurrentChats: 5,
  currentChats: 1,
  isAvailable: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const mockAgentWithUser = (overrides: Record<string, unknown> = {}) => ({
  id: AGENT_ID,
  userId: USER_ID,
  user: {
    id: USER_ID,
    name: 'Support Agent',
    email: 'agent@example.com',
    avatar: null,
    status: 'online',
  },
  skills: ['billing'],
  maxConcurrentChats: 5,
  currentChats: 1,
  isAvailable: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

vi.mock('@/models/agent.model.js', () => ({
  AgentModel: {
    find: mocks.agentFindMock,
    findOne: mocks.agentFindOneMock,
    findById: mocks.agentFindByIdMock,
    findByIdAndUpdate: mocks.agentFindByIdAndUpdateMock,
    findByIdAndDelete: mocks.agentFindByIdAndDeleteMock,
    create: mocks.agentCreateMock,
  },
}));

vi.mock('@/models/conversation.model.js', () => ({
  ConversationModel: {
    findByIdAndUpdate: mocks.conversationFindByIdAndUpdateMock,
  },
}));

vi.mock('@/services/conversation-events.js', () => ({
  conversationEvents: {
    emit: vi.fn(),
  },
  CONVERSATION_EVENTS: {
    STATUS_CHANGED: 'conversation:status-changed',
    AGENT_ASSIGNED: 'conversation:agent-assigned',
  },
}));

interface MockQuery {
  sort?: ReturnType<typeof vi.fn>;
  populate?: ReturnType<typeof vi.fn>;
  lean?: ReturnType<typeof vi.fn>;
}

function queryChain<T>(result: T): MockQuery {
  const q: MockQuery = {};
  q.sort = vi.fn().mockReturnValue(q);
  q.populate = vi.fn().mockReturnValue(q);
  q.lean = vi.fn().mockResolvedValue(result as never);
  return q;
}

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AgentService();
  });

  describe('getAgents', () => {
    it('returns agents with populated user', async () => {
      agentFindMock.mockReturnValue(queryChain([mockAgentDoc()]));

      const agents = await service.getAgents();

      expect(agentFindMock).toHaveBeenCalledWith({});
      expect(agents).toHaveLength(1);
      expect(agents[0].userId).toBe(USER_ID);
      expect(agents[0].user.name).toBe('Support Agent');
    });

    it('filters by availability when provided', async () => {
      agentFindMock.mockReturnValue(queryChain([]));

      await service.getAgents({ isAvailable: true });

      expect(agentFindMock).toHaveBeenCalledWith({ isAvailable: true });
    });

    it('filters by skills when provided', async () => {
      agentFindMock.mockReturnValue(queryChain([]));

      await service.getAgents({ skills: ['billing'] });

      expect(agentFindMock).toHaveBeenCalledWith({ skills: { $in: ['billing'] } });
    });
  });

  describe('getAgentById', () => {
    it('returns null when agent is not found', async () => {
      agentFindByIdMock.mockReturnValue(queryChain(null));

      const agent = await service.getAgentById('missing');
      expect(agent).toBeNull();
    });

    it('returns the agent with user data', async () => {
      agentFindByIdMock.mockReturnValue(queryChain(mockAgentDoc()));

      const agent = await service.getAgentById(AGENT_ID);
      expect(agent?.id).toBe(AGENT_ID);
      expect(agent?.user.email).toBe('agent@example.com');
    });
  });

  describe('createAgent', () => {
    it('throws 409 when the user is already an agent', async () => {
      agentFindOneMock.mockResolvedValue(mockAgentDoc());

      await expect(service.createAgent(USER_ID)).rejects.toMatchObject({
        message: 'User is already an agent',
        statusCode: 409,
      });
    });

    it('creates an agent and returns it', async () => {
      agentFindOneMock.mockResolvedValue(null);
      agentCreateMock.mockResolvedValue({ _id: { toString: () => AGENT_ID } });
      agentFindByIdMock.mockReturnValue(queryChain(mockAgentDoc()));

      const agent = await service.createAgent(USER_ID, ['billing'], 5);

      expect(agentCreateMock).toHaveBeenCalledWith({
        userId: expect.anything(),
        skills: ['billing'],
        maxConcurrentChats: 5,
      });
      expect(agent.id).toBe(AGENT_ID);
    });
  });

  describe('updateAgent', () => {
    it('throws 404 when agent does not exist', async () => {
      agentFindByIdAndUpdateMock.mockReturnValue(queryChain(null));

      await expect(service.updateAgent('missing', { skills: [] })).rejects.toMatchObject({
        message: 'Agent not found',
        statusCode: 404,
      });
    });

    it('updates and returns the agent', async () => {
      agentFindByIdAndUpdateMock.mockReturnValue(queryChain(mockAgentDoc({ skills: ['support'] })));

      const agent = await service.updateAgent(AGENT_ID, { skills: ['support'] });

      expect(agentFindByIdAndUpdateMock).toHaveBeenCalledWith(
        AGENT_ID,
        { skills: ['support'] },
        { new: true }
      );
      expect(agent?.skills).toEqual(['support']);
    });
  });

  describe('toggleAvailability', () => {
    it('throws 404 when agent does not exist', async () => {
      agentFindByIdMock.mockResolvedValue(null);

      await expect(service.toggleAvailability('missing')).rejects.toMatchObject({
        message: 'Agent not found',
        statusCode: 404,
      });
    });

    it('toggles isAvailable to false', async () => {
      const doc = mockAgentDoc({ isAvailable: true });
      agentFindByIdMock.mockResolvedValueOnce(doc);
      agentFindByIdMock.mockReturnValueOnce(queryChain(mockAgentDoc({ isAvailable: false })));

      const agent = await service.toggleAvailability(AGENT_ID);

      expect(doc.isAvailable).toBe(false);
      expect(agent?.isAvailable).toBe(false);
    });
  });

  describe('deleteAgent', () => {
    it('throws 404 when agent does not exist', async () => {
      agentFindByIdAndDeleteMock.mockResolvedValue(null);

      await expect(service.deleteAgent('missing')).rejects.toMatchObject({
        message: 'Agent not found',
        statusCode: 404,
      });
    });

    it('deletes the agent', async () => {
      agentFindByIdAndDeleteMock.mockResolvedValue(mockAgentDoc());

      await expect(service.deleteAgent(AGENT_ID)).resolves.toBeUndefined();
      expect(agentFindByIdAndDeleteMock).toHaveBeenCalledWith(AGENT_ID);
    });
  });

  describe('assignRoundRobin', () => {
    it('throws 404 when no agents are available', async () => {
      agentFindMock.mockReturnValue(queryChain([]));

      await expect(service.assignRoundRobin(CONV_ID)).rejects.toMatchObject({
        message: 'No available agents',
        statusCode: 404,
      });
    });

    it('assigns the least-loaded agent', async () => {
      agentFindMock.mockReturnValue(
        queryChain([
          mockAgentDoc({ _id: { toString: () => oid('agent-a') }, userId: mockPopulatedUser(), currentChats: 3 }),
          mockAgentDoc({ _id: { toString: () => oid('agent-b') }, userId: mockPopulatedUser(), currentChats: 1 }),
        ])
      );
      agentFindByIdAndUpdateMock.mockResolvedValue({});
      conversationFindByIdAndUpdateMock.mockResolvedValue({ participants: [] });
      // First call: findById (plain), second call: getAgentById → findById.populate().lean()
      agentFindByIdMock.mockResolvedValueOnce(mockAgentDoc({ currentChats: 2 }));
      agentFindByIdMock.mockReturnValue(queryChain(mockAgentDoc({ currentChats: 2 })));

      const agent = await service.assignRoundRobin(CONV_ID);

      expect(conversationFindByIdAndUpdateMock).toHaveBeenCalledWith(
        CONV_ID,
        expect.objectContaining({
          $addToSet: { participants: expect.anything() },
        }),
        { new: true }
      );
      expect(agent.id).toBe(AGENT_ID);
    });
  });

  describe('assignToAgent', () => {
    it('increments currentChats and adds agent as participant', async () => {
      agentFindByIdAndUpdateMock.mockResolvedValue({});
      conversationFindByIdAndUpdateMock.mockResolvedValue({ participants: [] });
      // First call: findById (plain result), second call: getAgentById → findById.populate().lean()
      agentFindByIdMock.mockResolvedValueOnce(mockAgentDoc());
      agentFindByIdMock.mockReturnValue(queryChain(mockAgentDoc()));

      const agent = await service.assignToAgent(CONV_ID, AGENT_ID);

      expect(agentFindByIdAndUpdateMock).toHaveBeenCalledWith(
        AGENT_ID,
        { $inc: { currentChats: 1 } }
      );
      expect(conversationFindByIdAndUpdateMock).toHaveBeenCalledWith(CONV_ID, {
        $set: { assignedAgent: expect.anything(), status: 'active' },
        $addToSet: { participants: expect.anything() },
      }, { new: true });
      expect(agent.id).toBe(AGENT_ID);
    });

    it('throws when the assigned agent cannot be fetched', async () => {
      agentFindByIdAndUpdateMock.mockResolvedValue({});
      conversationFindByIdAndUpdateMock.mockResolvedValue({ participants: [] });
      agentFindByIdMock.mockResolvedValueOnce(null);

      await expect(service.assignToAgent(CONV_ID, AGENT_ID)).rejects.toThrow('Agent not found');
    });
  });

  describe('unassignAgent', () => {
    it('decrements currentChats and unsets assignedAgent', async () => {
      agentFindByIdAndUpdateMock.mockResolvedValue({});
      conversationFindByIdAndUpdateMock.mockResolvedValue({});

      await service.unassignAgent(CONV_ID, AGENT_ID);

      expect(agentFindByIdAndUpdateMock).toHaveBeenCalledWith(
        AGENT_ID,
        { $inc: { currentChats: -1 } }
      );
      expect(conversationFindByIdAndUpdateMock).toHaveBeenCalledWith(CONV_ID, {
        $unset: { assignedAgent: '' },
      });
    });
  });
});