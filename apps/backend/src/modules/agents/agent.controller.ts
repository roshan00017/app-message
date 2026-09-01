import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';

import { asyncHandler } from '../../middleware/async-handler.js';
import { AgentService } from './agent.service.js';

const agentService = new AgentService();

export const getAgents = asyncHandler(async (req: Request, res: Response) => {
  const { isAvailable, skills, status } = req.query;

  const filters: { isAvailable?: boolean; skills?: string[]; status?: string } = {};

  if (isAvailable !== undefined) {
    filters.isAvailable = isAvailable === 'true';
  }

  if (skills) {
    filters.skills = (skills as string).split(',');
  }

  if (status) {
    filters.status = status as string;
  }

  const agents = await agentService.getAgents(filters);
  res.json({ data: agents });
});

export const getAgentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const agent = await agentService.getAgentById(id);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  res.json({ data: agent });
});

export const createAgent = asyncHandler(async (req: Request, res: Response) => {
  const { userId, skills, maxConcurrentChats } = req.body;
  const agent = await agentService.createAgent(userId, skills, maxConcurrentChats);
  res.status(201).json({ data: agent });
});

export const updateAgent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { skills, maxConcurrentChats } = req.body;
  const agent = await agentService.updateAgent(id, { skills, maxConcurrentChats });
  res.json({ data: agent });
});

export const toggleAvailability = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Check if user is admin or the agent owner
  const agent = await agentService.getAgentById(id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const isAdmin = req.user?.role === 'admin';
  const isOwner = req.user?.id === agent.userId;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const updatedAgent = await agentService.toggleAvailability(id);
  res.json({ data: updatedAgent });
});

export const deleteAgent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await agentService.deleteAgent(id);
  res.json({ message: 'Agent deleted' });
});

export const assignAgent = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { algorithm, skills } = req.body;

  let agent;

  switch (algorithm) {
    case 'round-robin':
      agent = await agentService.assignRoundRobin(conversationId);
      break;
    case 'skill-based':
      agent = await agentService.assignBySkills(conversationId, skills || []);
      break;
    case 'load-balanced':
      agent = await agentService.assignLoadBalanced(conversationId);
      break;
    case 'hybrid':
      agent = await agentService.assignHybrid(conversationId, skills || []);
      break;
    default:
      agent = await agentService.assignRoundRobin(conversationId);
  }

  res.json({ data: agent });
});

export const setAgentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['online', 'offline', 'busy'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be online, offline, or busy' });
  }

  const agent = await agentService.getAgentById(id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const isAdmin = req.user?.role === 'admin';
  const isOwner = req.user?.id === agent.userId;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const updatedAgent = await agentService.setAgentStatus(id, status);
  res.json({ data: updatedAgent });
});

export const unassignAgent = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId, agentId } = req.params;
  await agentService.unassignAgent(conversationId, agentId);
  res.json({ message: 'Agent unassigned' });
});
