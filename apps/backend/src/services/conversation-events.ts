import { EventEmitter } from 'events';

export interface ConversationStatusChangeEvent {
  conversationId: string;
  status: 'waiting' | 'active' | 'closed';
  assignedAgent?: string | null;
  participants: string[];
}

export interface AgentAssignedEvent {
  conversationId: string;
  agentId: string;
  agentUserId: string;
  participants: string[];
}

class ConversationEventEmitter extends EventEmitter {
  emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }
}

export const conversationEvents = new ConversationEventEmitter();

// Event names
export const CONVERSATION_EVENTS = {
  STATUS_CHANGED: 'conversation:status-changed',
  AGENT_ASSIGNED: 'conversation:agent-assigned',
} as const;
