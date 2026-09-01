import { registerAuthPaths } from '../modules/auth/auth.openapi.js';
import { registerConversationPaths } from '../modules/conversations/conversations.openapi.js';
import { registerAgentPaths } from '../modules/agents/agents.openapi.js';
import { registerNotificationPaths } from '../modules/notifications/notifications.openapi.js';
import { registry } from './registry.js';

/** Call once before building the document: registers every module's contract. */
export function registerAllPaths(): void {
  registerAuthPaths(registry);
  registerConversationPaths(registry);
  registerAgentPaths(registry);
  registerNotificationPaths(registry);
}
