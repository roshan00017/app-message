import { useMemo, useEffect } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { AppLayout } from '@/components/layout/app-layout';
import { ConversationHeader } from '@/components/conversation/conversation-header';
import { ConversationList } from '@/components/conversation/conversation-list';
import { MessageInput } from '@/components/message/message-input';
import { MessageList } from '@/components/message/message-list';
import { useTypingStore, EMPTY_ARRAY } from '@/stores/useTypingStore';
import { useConversationSocket } from '@/hooks/use-conversation-socket';
import { api } from '@/services/api';
import type { ConversationSummary } from '@messaging/shared/types';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

export default function ConversationDetailPage() {
  const { conversationId } = useParams({ strict: false }) as { conversationId: string };
  const queryClient = useQueryClient();

  useConversationSocket(conversationId);

  // Mark conversation as read when opened
  useEffect(() => {
    if (!conversationId) return;

    api
      .patch(`/conversations/${conversationId}/read`)
      .then(() => {
        // Invalidate unread counts so the badge updates immediately
        queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
      })
      .catch(() => {
        // Silently ignore — not critical
      });
  }, [conversationId, queryClient]);

  const typingMap = useTypingStore((s) => s.typing);
  const typingUsers = typingMap[conversationId] ?? EMPTY_ARRAY;

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      // Fetch specific conversation by ID
      const { data } = await api.get(`/conversations/${conversationId}`);
      return data.data as ConversationSummary;
    },
    enabled: !!conversationId,
  });

  // Build a userId -> name map for resolving typing indicator names
  const userNameMap = useMemo(() => {
    if (!conversation?.participants) return {};
    const map: Record<string, string> = {};
    for (const p of conversation.participants) {
      map[p.id] = p.name;
    }
    return map;
  }, [conversation?.participants]);

  const displayName =
    conversation?.name ??
    conversation?.participants.map((p) => p.name).join(', ') ??
    'Unknown';
  const otherParticipant = conversation?.participants[0];
  const isClosed = conversation?.status === 'closed';

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left sidebar - conversation list */}
        <div className="hidden w-80 border-r md:block">
          <ConversationList />
        </div>

        {/* Right side - messages */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              <ConversationHeader
                conversationId={conversationId}
                name={displayName}
                participantId={otherParticipant?.id}
                participantAvatar={otherParticipant?.avatar}
                status={conversation?.status}
              />

              {/* Closed conversation banner */}
              {isClosed && (
                <div className="flex items-center justify-center border-b border-gray-500/20 bg-gray-500/5 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    <span>This conversation is closed.</span>
                  </div>
                </div>
              )}

              <MessageList
                conversationId={conversationId}
                typingUserIds={typingUsers}
                userNames={userNameMap}
              />

              {!isClosed && (
                <MessageInput conversationId={conversationId} />
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
