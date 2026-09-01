import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Clock, CheckCircle, XCircle, Users, ChevronDown } from 'lucide-react';

import { AppLayout } from '@/components/layout/app-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PresenceBadge } from '@/components/shared/presence-badge';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { toast } from '@/hooks/use-toast';
import { cn, getInitials } from '@/lib/utils';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Agent, ConversationSummary } from '@messaging/shared/types';
import { Link } from '@tanstack/react-router';

const AVAILABILITY_OPTIONS = [
  { value: true, label: 'Available', color: 'bg-green-500' },
  { value: false, label: 'Unavailable', color: 'bg-gray-500' },
] as const;

export default function AgentDashboardPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);

  // Fetch agent profile
  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data } = await api.get('/agents');
      return data.data as Agent[];
    },
  });

  // Find current user's agent profile
  const myAgent = agents?.find((a) => a.userId === user?.id);

  // Toggle availability mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async () => {
      if (!myAgent) throw new Error('No agent profile found');
      const { data } = await api.patch(`/agents/${myAgent.id}/toggle-availability`);
      return data.data as Agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({ title: 'Availability updated' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to update availability' });
    },
  });

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/conversations');
      return data.data as ConversationSummary[];
    },
  });

  // Filter conversations assigned to current agent
  const assignedConversations = conversations?.filter(
    (c) => c.assignedAgent && c.participants.some((p) => p.id === user?.id)
  ) ?? [];

  const waitingConversations = assignedConversations.filter((c) => c.status === 'waiting');
  const activeConversations = assignedConversations.filter((c) => c.status === 'active');
  const closedConversations = assignedConversations.filter((c) => c.status === 'closed');

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agent Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your assigned conversations
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Availability Dropdown */}
            {myAgent && (
              <div className="relative">
                <Button
                  variant={myAgent.isAvailable ? 'default' : 'outline'}
                  onClick={() => setAvailabilityOpen(!availabilityOpen)}
                  disabled={toggleAvailabilityMutation.isPending}
                  className={cn(
                    'gap-2',
                    myAgent.isAvailable
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'text-muted-foreground'
                  )}
                >
                  <span className={cn(
                    'h-2 w-2 rounded-full',
                    myAgent.isAvailable ? 'bg-white' : 'bg-gray-400'
                  )} />
                  {myAgent.isAvailable ? 'Available' : 'Unavailable'}
                  <ChevronDown className="h-3 w-3" />
                </Button>
                {availabilityOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-background shadow-xl">
                    {AVAILABILITY_OPTIONS.map((option) => (
                      <button
                        key={String(option.value)}
                        onClick={() => {
                          if (myAgent.isAvailable !== option.value) {
                            toggleAvailabilityMutation.mutate();
                          }
                          setAvailabilityOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted',
                          myAgent.isAvailable === option.value && 'bg-muted font-medium'
                        )}
                      >
                        <span className={cn('h-2 w-2 rounded-full', option.color)} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Badge variant="secondary" className="text-sm">
              {assignedConversations.length} conversations
            </Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedConversations.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waiting</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{waitingConversations.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{activeConversations.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Closed</CardTitle>
              <XCircle className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{closedConversations.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Assigned Conversations */}
        <h2 className="mb-4 text-lg font-semibold">Assigned Conversations</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : assignedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="mb-4 rounded-2xl bg-muted p-4">
              <Users className="h-8 w-8" />
            </div>
            <p className="text-lg font-medium">No assigned conversations</p>
            <p className="mt-1 text-sm">Conversations will appear here once assigned to you</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignedConversations.map((conversation) => (
              <Link
                key={conversation.id}
                to="/agent/conversations/$conversationId"
                params={{ conversationId: conversation.id }}
              >
                <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conversation.participants[0]?.avatar ?? undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 font-medium">
                          {getInitials(conversation.participants.map(p => p.name).join(', '))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <PresenceBadge userId={conversation.participants[0]?.id ?? ''} size="md" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {conversation.name ?? conversation.participants.map(p => p.name).join(', ')}
                      </CardTitle>
                      <p className="truncate text-sm text-muted-foreground">
                        {conversation.lastMessage?.content ?? 'No messages yet'}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          conversation.status === 'active' ? 'default' :
                          conversation.status === 'waiting' ? 'secondary' : 'outline'
                        }
                        className={
                          conversation.status === 'active' ? 'bg-green-500/10 text-green-700' :
                          conversation.status === 'waiting' ? 'bg-amber-500/10 text-amber-700' : ''
                        }
                      >
                        {conversation.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {conversation.lastMessage
                          ? new Date(conversation.lastMessage.createdAt).toLocaleTimeString()
                          : ''}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
