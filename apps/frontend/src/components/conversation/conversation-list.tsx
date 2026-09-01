import { memo, useState } from 'react';
import { Link, useMatchRoute } from '@tanstack/react-router';
import { Plus, Search, Users } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUnreadCounts } from '@/hooks/use-unread-counts';
import { cn, formatRelativeTime, getInitials } from '@/lib/utils';
import { usePresenceStore } from '@/stores/usePresenceStore';
import { useTypingStore, EMPTY_ARRAY } from '@/stores/useTypingStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { ConversationSummary } from '@messaging/shared/types';

const FILTERS = ['All', 'Waiting', 'Active', 'Closed', 'Unread'] as const;
type Filter = (typeof FILTERS)[number];

interface ConversationListProps {
  onCreateClick?: () => void;
  basePath?: string;
}

export function ConversationList({ onCreateClick, basePath }: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const matchRoute = useMatchRoute();
  const { data: unreadCounts } = useUnreadCounts();
  const typingMap = useTypingStore((s) => s.typing);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/conversations');
      return data.data as ConversationSummary[];
    },
  });

  const filtered = (conversations ?? [])
    .filter((c) => {
      if (!search) return true;
      const name = c.name ?? c.participants.map((p) => p.name).join(', ');
      return name.toLowerCase().includes(search.toLowerCase());
    })
    .filter((c) => {
      if (filter === 'Waiting') return c.status === 'waiting';
      if (filter === 'Active') return c.status === 'active';
      if (filter === 'Closed') return c.status === 'closed';
      if (filter === 'Unread') return (unreadCounts as Record<string, number>)?.[c.id] > 0;
      return true;
    });

  const activeCount = conversations?.length ?? 0;

  return (
    <div className="glass-panel flex h-full w-80 flex-col border-r border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
            Conversations
          </h2>
          {activeCount > 0 && (
            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400">
              {activeCount} Active
            </span>
          )}
        </div>
        {onCreateClick && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onCreateClick}
            className="text-slate-400 transition-colors hover:text-blue-400"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search chats, tags, users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-white/5 bg-cardx/60 py-1.5 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 transition-colors focus:border-blue-500/50 focus:bg-card"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-white/5 bg-cardx/60 p-1 text-[11px] font-medium text-slate-400">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'flex-1 rounded-md py-1 text-center transition-colors',
              filter === f ? 'bg-blue-600 text-white shadow-sm' : 'hover:text-slate-200'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <ScrollArea className="mt-1 flex-1">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg p-2">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="mb-3 rounded-full bg-muted p-3">
              {search ? (
                <Search className="h-6 w-6" />
              ) : (
                <Users className="h-6 w-6" />
              )}
            </div>
            <p className="text-sm font-medium">
              {search ? 'No conversations found' : 'No conversations yet'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search ? 'Try a different search term' : 'Start a new conversation'}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 p-1">
            {filtered.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                basePath={basePath}
                isActive={
                  basePath === '/customer/chat'
                    ? !!matchRoute({
                        to: '/customer/chat/$conversationId' as const,
                        params: { conversationId: conversation.id },
                      })
                    : basePath === '/agent/conversations'
                      ? !!matchRoute({
                          to: '/agent/conversations/$conversationId' as const,
                          params: { conversationId: conversation.id },
                        })
                      : !!matchRoute({
                          to: '/conversations/$conversationId' as const,
                          params: { conversationId: conversation.id },
                        })
                }
                unreadCount={
                  (unreadCounts as Record<string, number>)?.[conversation.id] ?? 0
                }
                typingUsers={(typingMap[conversation.id] as string[] | undefined) ?? EMPTY_ARRAY}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

const DEFAULT_PRESENCE = { status: 'offline' as const, lastSeen: new Date(0) };

const ConversationItem = memo(function ConversationItem({
  conversation,
  basePath,
  isActive,
  unreadCount,
  typingUsers,
}: {
  conversation: ConversationSummary;
  basePath?: string;
  isActive: boolean;
  unreadCount: number;
  typingUsers: string[];
}) {
  const otherParticipants = conversation.participants;
  const displayName =
    conversation.name ?? otherParticipants.map((p) => p.name).join(', ');
  const otherUser = otherParticipants[0];
  const userId = otherUser?.id ?? '';
  const presence = usePresenceStore((s) => (userId ? s.statuses[userId] : undefined) ?? DEFAULT_PRESENCE);
  const isOnline = presence.status === 'online';
  const isTyping = typingUsers.length > 0;

  return (
    <Link
      to={
        basePath === '/customer/chat'
          ? '/customer/chat/$conversationId'
          : basePath === '/agent/conversations'
            ? '/agent/conversations/$conversationId'
            : '/conversations/$conversationId'
      }
      params={{ conversationId: conversation.id }}
    >
      <div
        className={cn(
          'group relative flex cursor-pointer items-center gap-3 border-l-2 px-3 py-3 transition-all duration-200',
          isActive
            ? 'border-blue-500 bg-blue-600/10'
            : 'border-transparent hover:bg-white/5',
          unreadCount > 0 && 'font-medium'
        )}
      >
        {/* Avatar with presence dot */}
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10 transition-transform duration-200 group-hover:scale-105">
            <AvatarImage src={otherUser?.avatar ?? undefined} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-sm font-medium">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-panel',
              isOnline ? 'presence-pulse bg-emerald-500' : 'bg-gray-500'
            )}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={cn(
                  'truncate text-xs transition-colors',
                  unreadCount > 0 ? 'font-semibold text-white' : 'font-medium text-slate-200'
                )}
              >
                {displayName}
              </span>
              {conversation.status === 'waiting' && (
                <span className="shrink-0 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
                  Waiting
                </span>
              )}
              {conversation.status === 'closed' && (
                <span className="shrink-0 rounded-full bg-gray-500/20 px-1.5 py-0.5 text-[9px] font-medium text-gray-400">
                  Closed
                </span>
              )}
            </div>
            <span className="shrink-0 text-[10px] text-slate-500">
              {conversation.lastMessage
                ? formatRelativeTime(new Date(conversation.lastMessage.createdAt))
                : ''}
            </span>
          </div>

          {isTyping ? (
            <p className="flex items-center gap-1 text-xs italic text-blue-400">
              <span>typing</span>
              <span className="inline-flex gap-0.5">
                <span className="h-1 w-1 rounded-full bg-blue-400 typing-dot" />
                <span className="h-1 w-1 rounded-full bg-blue-400 typing-dot" />
                <span className="h-1 w-1 rounded-full bg-blue-400 typing-dot" />
              </span>
            </p>
          ) : (
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <p
                className={cn(
                  'truncate text-xs transition-colors',
                  unreadCount > 0 ? 'font-medium text-slate-100' : 'text-slate-400'
                )}
              >
                {conversation.lastMessage?.content ?? 'No messages yet'}
              </p>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white shadow-sm animate-bounce-in">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
});
