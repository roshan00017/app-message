import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { getSocket } from '@/services/socket';
import { SOCKET_EVENTS } from '@messaging/shared/constants';
import { cn, formatRelativeTime, getInitials } from '@/lib/utils';
import { MessageStatus } from './message-status';
import { TypingIndicator } from './typing-indicator';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  content: string;
  type: string;
  statuses: { recipientId: string; status: string; timestamp: Date }[];
  createdAt: Date;
  failed?: boolean;
  isOptimistic?: boolean;
}

interface PaginatedMessages {
  items: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Format date for separators
function formatDateSeparator(date: Date): string {
  const now = new Date();
  const messageDate = new Date(date);
  const diffDays = Math.floor(
    (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)
    return messageDate.toLocaleDateString('en-US', { weekday: 'long' });
  return messageDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year:
      messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Check if we need a date separator between two messages
function needsDateSeparator(
  prev: Message | null,
  curr: Message
): boolean {
  if (!prev) return true;
  const prevDate = new Date(prev.createdAt).toDateString();
  const currDate = new Date(curr.createdAt).toDateString();
  return prevDate !== currDate;
}

export function MessageList({
  conversationId,
  typingUserIds,
  userNames,
}: {
  conversationId: string;
  typingUserIds?: string[];
  userNames?: Record<string, string>;
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const parentRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const prevMessageCountRef = useRef(0);
  const queryClient = useQueryClient();

  const handleRetry = useCallback(
    (message: Message) => {
      // Remove the failed message from cache
      queryClient.setQueryData(
        ['messages', conversationId],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: page.items.filter((msg: any) => msg.id !== message.id),
            })),
          };
        }
      );

      // Resend via socket
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit(SOCKET_EVENTS.MESSAGE_SEND, {
          conversationId,
          content: message.content,
          type: 'text',
        });
      }
    },
    [conversationId, queryClient]
  );

  const { data, fetchPreviousPage, hasPreviousPage, isFetchingPreviousPage } =
    useInfiniteQuery({
      queryKey: ['messages', conversationId],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        if (pageParam) params.set('cursor', pageParam as string);
        params.set('limit', '50');
        const { data } = await api.get(
          `/conversations/${conversationId}/messages?${params}`
        );
        return data.data as PaginatedMessages;
      },
      // The API returns messages oldest→newest (latest at the bottom).
      // Loading older history PREPENDS pages, so we use getPreviousPageParam.
      initialPageParam: undefined as string | undefined,
      // No forward (newer) pagination: new messages arrive via the socket and
      // are merged by useConversationSocket. getNextPageParam must still be
      // defined because TanStack Query calls it when computing hasNextPage.
      getNextPageParam: () => undefined,
      getPreviousPageParam: (firstPage: PaginatedMessages) =>
        firstPage.nextCursor ?? undefined,
    });

  // Flatten all pages into a single message array (already oldest first —
  // previous pages are prepended by TanStack Query).
  const messages = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  // Build virtual items: messages + date separators interleaved
  const virtualItems = useMemo(() => {
    const items: Array<
      | { type: 'date'; key: string; date: string }
      | { type: 'message'; key: string; message: Message; index: number }
    > = [];

    messages.forEach((message, index) => {
      const prev = messages[index - 1];
      if (needsDateSeparator(prev, message)) {
        items.push({
          type: 'date',
          key: `date-${new Date(message.createdAt).toDateString()}`,
          date: formatDateSeparator(new Date(message.createdAt)),
        });
      }
      items.push({
        type: 'message',
        key: message.id,
        message,
        index,
      });
    });

    return items;
  }, [messages]);

  // Virtual scroll setup
  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = virtualItems[index];
      if (item?.type === 'date') return 48;
      return 72; // Estimated message height
    },
    overscan: 5,
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (
      messages.length > prevMessageCountRef.current &&
      shouldAutoScroll
    ) {
      virtualizer.scrollToIndex(virtualItems.length - 1, {
        align: 'end',
        behavior: 'smooth',
      });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, shouldAutoScroll, virtualizer, virtualItems.length]);

  // Detect when user scrolls up
  const handleScroll = () => {
    if (!parentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    setShouldAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
  };

  // Load older messages (prepended above the current history)
  const handleLoadMore = () => {
    if (hasPreviousPage && !isFetchingPreviousPage) {
      fetchPreviousPage();
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Load older messages button */}
      {hasPreviousPage && (
        <button
          onClick={handleLoadMore}
          disabled={isFetchingPreviousPage}
          className="border-b border-white/5 py-2.5 text-center text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 disabled:opacity-50"
        >
          {isFetchingPreviousPage ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-500 border-t-blue-400" />
              Loading...
            </span>
          ) : (
            'Load older messages'
          )}
        </button>
      )}

      {/* Virtual scroll container */}
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-canvas px-6 py-4"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = virtualItems[virtualRow.index];
            if (!item) return null;

            if (item.type === 'date') {
              return (
                <div
                  key={item.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="shrink-0 rounded-full border border-white/5 bg-cardx px-3 py-0.5 text-[11px] font-medium text-slate-500">
                    {item.date}
                  </span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
              );
            }

            const { message, index } = item;
            const isOwn = message.senderId === currentUserId;
            const prevMessage = messages[index - 1];
            const showAvatar =
              !isOwn &&
              (!prevMessage ||
                prevMessage.senderId !== message.senderId ||
                needsDateSeparator(prevMessage, message));
            const isConsecutive =
              prevMessage &&
              prevMessage.senderId === message.senderId &&
              !needsDateSeparator(prevMessage, message);

            return (
              <div
                key={item.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="animate-in fade-in duration-200"
              >
                <div
                  className={cn(
                    'flex gap-2',
                    isOwn ? 'flex-row-reverse' : 'flex-row',
                    isConsecutive ? 'mt-0.5' : 'mt-3'
                  )}
                >
                  {/* Avatar */}
                  {!isOwn && (
                    <div className="w-8 shrink-0">
                      {showAvatar && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-xs font-medium">
                            {message.senderName
                              ? getInitials(message.senderName)
                              : 'U'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={cn(
                      'group relative max-w-[75%] rounded-2xl px-3.5 py-2.5 leading-relaxed transition-all duration-200',
                      isOwn
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10'
                        : 'border border-white/5 bg-cardx text-slate-200 shadow-sm',
                      isOwn && 'rounded-tr-md',
                      !isOwn && 'rounded-tl-md',
                      isConsecutive &&
                        isOwn &&
                        'rounded-tr-2xl rounded-br-2xl',
                      isConsecutive &&
                        !isOwn &&
                        'rounded-tl-2xl rounded-bl-2xl',
                      message.failed && 'border-red-500/50 opacity-80'
                    )}
                  >
                    {/* Sender name */}
                    {!isOwn && showAvatar && message.senderName && (
                      <p className="mb-0.5 text-xs font-semibold text-blue-400">
                        {message.senderName}
                      </p>
                    )}

                    {/* Content */}
                    <p className="text-sm break-words leading-relaxed">
                      {message.content}
                    </p>

                    {/* Timestamp and status */}
                    <div
                      className={cn(
                        'mt-1 flex items-center gap-1 text-xs',
                        isOwn
                          ? 'justify-end text-white/70'
                          : 'text-slate-500'
                      )}
                    >
                      <span>
                        {formatRelativeTime(new Date(message.createdAt))}
                      </span>
                      {isOwn && !message.failed && (
                        <MessageStatus
                          status={
                            (message.statuses?.[0]?.status as
                              | 'sent'
                              | 'delivered'
                              | 'read') ?? 'sent'
                          }
                        />
                      )}
                    </div>

                    {/* Failed indicator + retry */}
                    {message.failed && isOwn && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[11px] text-red-300">
                          <AlertCircle className="h-3 w-3" />
                          Failed
                        </span>
                        <button
                          onClick={() => handleRetry(message)}
                          className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-white transition-colors hover:bg-white/20"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Typing indicator */}
        {typingUserIds && typingUserIds.length > 0 && (
          <TypingIndicator userIds={typingUserIds} userNames={userNames} />
        )}
      </div>
    </div>
  );
}
