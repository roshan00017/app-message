import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { MessageSquare, Filter, Search, RefreshCw, UserPlus, X, Users, UserCheck, CheckSquare, Square, Trash2 } from 'lucide-react';

import { AppLayout } from '@/components/layout/app-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { toast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/utils';
import { api } from '@/services/api';
import type { Agent, ConversationSummary } from '@messaging/shared/types';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'waiting' | 'active' | 'closed';

export default function AdminConversationsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assigningConversation, setAssigningConversation] = useState<string | null>(null);
  const [batchAssigning, setBatchAssigning] = useState(false);
  const [skillFilter, setSkillFilter] = useState<string>('');

  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['admin-conversations', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      const { data } = await api.get(`/conversations/admin/all?${params.toString()}`);
      return data.data as ConversationSummary[];
    },
  });

  const closeConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/conversations/${id}/close`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      toast({ title: 'Conversation closed' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to close conversation' });
    },
  });

  // Fetch agents for assignment
  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data } = await api.get('/agents');
      return data.data as Agent[];
    },
  });

  // Assign agent mutation
  const assignAgentMutation = useMutation({
    mutationFn: async ({ conversationId }: { conversationId: string; agentId: string }) => {
      await api.post(`/agents/assign/${conversationId}`, {
        algorithm: 'round-robin',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({ title: 'Agent assigned' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to assign agent' });
    },
  });

  // Unassign agent mutation
  const unassignAgentMutation = useMutation({
    mutationFn: async ({ conversationId, agentId }: { conversationId: string; agentId: string }) => {
      await api.delete(`/agents/unassign/${conversationId}/${agentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({ title: 'Agent unassigned' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to unassign agent' });
    },
  });

  // Batch close mutation
  const batchCloseMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.post(`/conversations/${id}/close`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      setSelectedIds(new Set());
      toast({ title: `${selectedIds.size} conversations closed` });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to close some conversations' });
    },
  });

  // Batch assign mutation
  const batchAssignMutation = useMutation({
    mutationFn: async ({ conversationIds }: { conversationIds: string[]; agentId: string }) => {
      await Promise.all(
        conversationIds.map((id) =>
          api.post(`/agents/assign/${id}`, { algorithm: 'round-robin' })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setSelectedIds(new Set());
      setBatchAssigning(false);
      toast({ title: `Assigned agent to ${selectedIds.size} conversations` });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to assign agent to some conversations' });
    },
  });

  // Get all unique skills from agents
  const allSkills = [...new Set(agents?.flatMap((a) => a.skills) ?? [])];

  // Filter available agents by skill
  const availableAgents = (agents ?? [])
    .filter((a) => a.isAvailable)
    .filter((a) => !skillFilter || a.skills.includes(skillFilter));

  const filtered = (conversations ?? []).filter((c) => {
    if (!search) return true;
    const name = c.name ?? c.participants.map((p) => p.name).join(', ');
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const waitingCount = conversations?.filter((c) => c.status === 'waiting').length ?? 0;
  const activeCount = conversations?.filter((c) => c.status === 'active').length ?? 0;
  const closedCount = conversations?.filter((c) => c.status === 'closed').length ?? 0;

  const STATUS_STYLES: Record<string, string> = {
    waiting: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    active: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    closed: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  }, [selectedIds.size, filtered]);

  const hasSelection = selectedIds.size > 0;
  const allSelected = selectedIds.size === filtered.length && filtered.length > 0;

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Conversation Management</h1>
            <p className="text-muted-foreground">
              Manage and monitor all conversations
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversations?.length ?? 0}</div>
            </CardContent>
          </Card>
          <Card className={cn(waitingCount > 0 && 'border-amber-500/50')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waiting</CardTitle>
              <span className="h-2 w-2 rounded-full bg-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{waitingCount}</div>
              {waitingCount > 0 && (
                <p className="text-xs text-amber-600">Needs attention</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Closed</CardTitle>
              <span className="h-2 w-2 rounded-full bg-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{closedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              {(['all', 'waiting', 'active', 'closed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    statusFilter === status
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Batch actions bar */}
        {hasSelection && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBatchAssigning(true)}
            >
              <UserPlus className="mr-1 h-3 w-3" />
              Assign Agent
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => batchCloseMutation.mutate(Array.from(selectedIds))}
              disabled={batchCloseMutation.isPending}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Close Selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        )}

        {/* Conversation list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="mb-4 rounded-2xl bg-muted p-4">
              <MessageSquare className="h-8 w-8" />
            </div>
            <p className="text-lg font-medium">No conversations found</p>
            <p className="mt-1 text-sm">
              {search ? 'Try a different search term' : 'No conversations match the selected filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Select all header */}
            <div className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground">
              <button onClick={toggleSelectAll} className="shrink-0">
                {allSelected ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
              <span>Select all ({filtered.length})</span>
            </div>

            {filtered.map((conversation) => (
              <Card
                key={conversation.id}
                className={cn(
                  'transition-all hover:shadow-md',
                  selectedIds.has(conversation.id) && 'ring-2 ring-primary'
                )}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Checkbox */}
                  <button onClick={() => toggleSelect(conversation.id)} className="shrink-0">
                    {selectedIds.has(conversation.id) ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conversation.participants[0]?.avatar ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 font-medium">
                        {getInitials(conversation.participants.map((p) => p.name).join(', '))}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">
                        {conversation.name ?? conversation.participants.map((p) => p.name).join(', ')}
                      </h3>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] capitalize', STATUS_STYLES[conversation.status])}
                      >
                        {conversation.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.lastMessage?.content ?? 'No messages yet'}
                    </p>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{conversation.participants.length} participants</span>
                      {conversation.lastMessage && (
                        <span>{new Date(conversation.lastMessage.createdAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to="/conversations/$conversationId"
                      params={{ conversationId: conversation.id }}
                    >
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                    {conversation.status === 'waiting' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssigningConversation(conversation.id)}
                      >
                        <UserPlus className="mr-1 h-3 w-3" />
                        Assign
                      </Button>
                    )}
                    {conversation.assignedAgent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const agent = agents?.find((a) => a.id === conversation.assignedAgent);
                          if (agent) {
                            unassignAgentMutation.mutate({
                              conversationId: conversation.id,
                              agentId: agent.id,
                            });
                          }
                        }}
                        disabled={unassignAgentMutation.isPending}
                      >
                        <UserCheck className="mr-1 h-3 w-3" />
                        Unassign
                      </Button>
                    )}
                    {conversation.status !== 'closed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => closeConversationMutation.mutate(conversation.id)}
                        disabled={closeConversationMutation.isPending}
                      >
                        <X className="mr-1 h-3 w-3" />
                        Close
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Assign Agent Dialog */}
      {assigningConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Assign Agent</h2>
              <Button variant="ghost" size="icon" onClick={() => { setAssigningConversation(null); setSkillFilter(''); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Select an available agent to assign to this conversation.
            </p>
            {/* Skills filter */}
            {allSkills.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Filter by skill:</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSkillFilter('')}
                    className={cn(
                      'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                      !skillFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    All
                  </button>
                  {allSkills.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => setSkillFilter(skill)}
                      className={cn(
                        'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                        skillFilter === skill ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {availableAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => {
                    assignAgentMutation.mutate({
                      conversationId: assigningConversation,
                      agentId: agent.id,
                    });
                    setAssigningConversation(null);
                    setSkillFilter('');
                  }}
                  disabled={assignAgentMutation.isPending}
                  className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={agent.user.avatar ?? undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                      {getInitials(agent.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{agent.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {agent.currentChats}/{agent.maxConcurrentChats} chats
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {agent.skills.length > 0 ? (
                      agent.skills.slice(0, 2).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-[10px]">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">General</Badge>
                    )}
                    {agent.skills.length > 2 && (
                      <Badge variant="secondary" className="text-[10px]">+{agent.skills.length - 2}</Badge>
                    )}
                  </div>
                </button>
              ))}
              {availableAgents.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">No available agents</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Assign Agent Dialog */}
      {batchAssigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Assign Agent to {selectedIds.size} Conversations</h2>
              <Button variant="ghost" size="icon" onClick={() => { setBatchAssigning(false); setSkillFilter(''); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Select an available agent to assign to all selected conversations.
            </p>
            {/* Skills filter */}
            {allSkills.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Filter by skill:</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSkillFilter('')}
                    className={cn(
                      'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                      !skillFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    All
                  </button>
                  {allSkills.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => setSkillFilter(skill)}
                      className={cn(
                        'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                        skillFilter === skill ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {availableAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => {
                    batchAssignMutation.mutate({
                      conversationIds: Array.from(selectedIds),
                      agentId: agent.id,
                    });
                  }}
                  disabled={batchAssignMutation.isPending}
                  className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={agent.user.avatar ?? undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                      {getInitials(agent.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{agent.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {agent.currentChats}/{agent.maxConcurrentChats} chats
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {agent.skills.length > 0 ? (
                      agent.skills.slice(0, 2).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-[10px]">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">General</Badge>
                    )}
                  </div>
                </button>
              ))}
              {availableAgents.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">No available agents</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
