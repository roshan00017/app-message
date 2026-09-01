export interface RealtimeMetrics {
  activeUsers: number;
  messagesPerMinute: number;
  messagesPerHour: number;
  onlineUsers: number;
  activeConversations: number;
  averageResponseTime: number;
}

export interface AgentMetricsData {
  agentId: string;
  name: string;
  totalChats: number;
  averageResponseTime: number;
  satisfactionScore: number;
  messagesHandled: number;
  isAvailable: boolean;
}
