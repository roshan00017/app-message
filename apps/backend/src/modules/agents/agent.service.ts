import mongoose from 'mongoose';

import { AgentModel } from '../../models/agent.model.js';
import { ConversationModel } from '../../models/conversation.model.js';
import { conversationEvents, CONVERSATION_EVENTS } from '../../services/conversation-events.js';
import { logger } from '../../utils/logger.js';

export interface AgentWithUser {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    status: string;
  };
  skills: string[];
  maxConcurrentChats: number;
  currentChats: number;
  isAvailable: boolean;
  agentStatus: 'online' | 'offline' | 'busy';
  createdAt: Date;
  updatedAt: Date;
}

interface PopulatedUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  avatar: string | null;
  status: string;
}

export class AgentService {
  async getAgents(filters?: {
    isAvailable?: boolean;
    skills?: string[];
    status?: string;
  }): Promise<AgentWithUser[]> {
    const query: Record<string, unknown> = {};

    if (filters?.isAvailable !== undefined) {
      query.isAvailable = filters.isAvailable;
    }

    if (filters?.skills?.length) {
      query.skills = { $in: filters.skills };
    }

    const agents = await AgentModel.find(query)
      .populate('userId', 'name email avatar status')
      .sort({ currentChats: 1, createdAt: -1 })
      .lean();

    return agents.map((agent) => {
      const user = agent.userId as unknown as PopulatedUser;
      return {
        id: (agent._id as mongoose.Types.ObjectId).toString(),
        userId: user._id.toString(),
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          status: user.status,
        },
        skills: agent.skills,
        maxConcurrentChats: agent.maxConcurrentChats,
        currentChats: agent.currentChats,
        isAvailable: agent.isAvailable,
        agentStatus: (agent as any).status ?? 'offline',
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      };
    });
  }

  async getAgentById(agentId: string): Promise<AgentWithUser | null> {
    const agent = await AgentModel.findById(agentId)
      .populate('userId', 'name email avatar status')
      .lean();

    if (!agent) return null;

    const user = agent.userId as unknown as PopulatedUser;
    return {
      id: (agent._id as mongoose.Types.ObjectId).toString(),
      userId: user._id.toString(),
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
      },
      skills: agent.skills,
      maxConcurrentChats: agent.maxConcurrentChats,
      currentChats: agent.currentChats,
      isAvailable: agent.isAvailable,
      agentStatus: (agent as any).status ?? 'offline',
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }

  async createAgent(
    userId: string,
    skills: string[] = [],
    maxConcurrentChats = 5
  ): Promise<AgentWithUser> {
    const existing = await AgentModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (existing) {
      throw Object.assign(new Error('User is already an agent'), { statusCode: 409 });
    }

    const agent = await AgentModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      skills,
      maxConcurrentChats,
    });

    logger.info({ agentId: agent._id, userId }, 'Agent created');

    const result = await this.getAgentById((agent._id as mongoose.Types.ObjectId).toString());

    if (!result) {
      throw new Error('Failed to fetch created agent');
    }

    return result;
  }

  async updateAgent(
    agentId: string,
    data: { skills?: string[]; maxConcurrentChats?: number }
  ): Promise<AgentWithUser> {
    const agent = await AgentModel.findByIdAndUpdate(agentId, data, { new: true })
      .populate('userId', 'name email avatar status')
      .lean();

    if (!agent) {
      throw Object.assign(new Error('Agent not found'), { statusCode: 404 });
    }

    logger.info({ agentId }, 'Agent updated');

    const user = agent.userId as unknown as PopulatedUser;
    return {
      id: (agent._id as mongoose.Types.ObjectId).toString(),
      userId: user._id.toString(),
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
      },
      skills: agent.skills,
      maxConcurrentChats: agent.maxConcurrentChats,
      currentChats: agent.currentChats,
      isAvailable: agent.isAvailable,
      agentStatus: (agent as any).status ?? 'offline',
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }

  async toggleAvailability(agentId: string): Promise<AgentWithUser> {
    const agent = await AgentModel.findById(agentId);

    if (!agent) {
      throw Object.assign(new Error('Agent not found'), { statusCode: 404 });
    }

    agent.isAvailable = !agent.isAvailable;
    await agent.save();

    logger.info({ agentId, isAvailable: agent.isAvailable }, 'Agent availability toggled');

    const result = await this.getAgentById(agentId);
    if (!result) throw new Error('Failed to fetch agent');
    return result;
  }

  async setAgentStatus(
    agentId: string,
    status: 'online' | 'offline' | 'busy'
  ): Promise<AgentWithUser> {
    const agent = await AgentModel.findByIdAndUpdate(
      agentId,
      { status, isAvailable: status !== 'busy' },
      { new: true }
    );

    if (!agent) {
      throw Object.assign(new Error('Agent not found'), { statusCode: 404 });
    }

    logger.info({ agentId, status }, 'Agent status updated');

    const result = await this.getAgentById(agentId);
    if (!result) throw new Error('Failed to fetch agent');
    return result;
  }

  async deleteAgent(agentId: string): Promise<void> {
    const agent = await AgentModel.findByIdAndDelete(agentId);
    if (!agent) {
      throw Object.assign(new Error('Agent not found'), { statusCode: 404 });
    }
    logger.info({ agentId }, 'Agent deleted');
  }

  async getAvailableAgents(skills?: string[]): Promise<AgentWithUser[]> {
    return this.getAgents({ isAvailable: true, skills });
  }

  async assignRoundRobin(conversationId: string): Promise<AgentWithUser> {
    const agents = await this.getAvailableAgents();

    if (agents.length === 0) {
      throw Object.assign(new Error('No available agents'), { statusCode: 404 });
    }

    const agent = agents.reduce((min, current) =>
      current.currentChats < min.currentChats ? current : min
    );

    return this.assignToAgent(conversationId, agent.id);
  }

  async assignBySkills(conversationId: string, requiredSkills: string[]): Promise<AgentWithUser> {
    const agents = await this.getAvailableAgents(requiredSkills);

    if (agents.length === 0) {
      return this.assignRoundRobin(conversationId);
    }

    const agent = agents.reduce((min, current) =>
      current.currentChats < min.currentChats ? current : min
    );

    return this.assignToAgent(conversationId, agent.id);
  }

  async assignLoadBalanced(conversationId: string): Promise<AgentWithUser> {
    const agents = await this.getAvailableAgents();

    if (agents.length === 0) {
      throw Object.assign(new Error('No available agents'), { statusCode: 404 });
    }

    const sorted = agents.sort(
      (a, b) => b.maxConcurrentChats - b.currentChats - (a.maxConcurrentChats - a.currentChats)
    );

    const agent = sorted[0];

    if (agent.currentChats >= agent.maxConcurrentChats) {
      throw Object.assign(new Error('All agents at capacity'), { statusCode: 409 });
    }

    return this.assignToAgent(conversationId, agent.id);
  }

  async assignHybrid(conversationId: string, requiredSkills: string[]): Promise<AgentWithUser> {
    const agents = await this.getAvailableAgents(requiredSkills);

    if (agents.length === 0) {
      return this.assignLoadBalanced(conversationId);
    }

    const available = agents.filter((a) => a.currentChats < a.maxConcurrentChats);

    if (available.length === 0) {
      throw Object.assign(new Error('All skill-matched agents at capacity'), { statusCode: 409 });
    }

    const agent = available.reduce((min, current) =>
      current.currentChats < min.currentChats ? current : min
    );

    return this.assignToAgent(conversationId, agent.id);
  }

  async assignToAgent(conversationId: string, agentId: string): Promise<AgentWithUser> {
    try {
      const agent = await AgentModel.findById(agentId);
      if (!agent) throw Object.assign(new Error('Agent not found'), { statusCode: 404 });

      // Atomically assign: set agent, add to participants, and transition
      // waiting → active in a single operation to avoid race conditions.
      const updated = await ConversationModel.findByIdAndUpdate(
        conversationId,
        {
          $set: { assignedAgent: agent._id, status: 'active' },
          $addToSet: { participants: agent.userId },
        },
        { new: true },
      );

      if (!updated) {
        throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
      }

      await AgentModel.findByIdAndUpdate(agentId, { $inc: { currentChats: 1 } });

      const result = await this.getAgentById(agentId);
      if (!result) throw new Error('Agent not found after assignment');

      // Emit real-time events so the agent sees the conversation instantly
      const participantIds = updated.participants.map((p) => p.toString());
      const agentUserId = agent.userId.toString();

      conversationEvents.emit(CONVERSATION_EVENTS.AGENT_ASSIGNED, {
        conversationId,
        agentId,
        agentUserId,
        participants: participantIds,
      });

      conversationEvents.emit(CONVERSATION_EVENTS.STATUS_CHANGED, {
        conversationId,
        status: 'active',
        assignedAgent: agentId,
        participants: participantIds,
      });

      logger.info({ conversationId, agentId }, 'Agent assigned to conversation');
      return result;
    } catch (error) {
      logger.error({ err: error, conversationId, agentId }, 'Failed to assign agent');
      throw error;
    }
  }

  async unassignAgent(conversationId: string, agentId: string): Promise<void> {
    try {
      await AgentModel.findByIdAndUpdate(agentId, { $inc: { currentChats: -1 } });
      await ConversationModel.findByIdAndUpdate(conversationId, { $unset: { assignedAgent: '' } });

      logger.info({ conversationId, agentId }, 'Agent unassigned');
    } catch (error) {
      logger.error({ err: error, conversationId, agentId }, 'Failed to unassign agent');
      throw error;
    }
  }
}
