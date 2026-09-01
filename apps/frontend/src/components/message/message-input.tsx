import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SOCKET_EVENTS } from '@messaging/shared/constants';
import { Send, Smile, Paperclip } from 'lucide-react';
import { getSocket } from '@/services/socket';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from '@/hooks/use-toast';

const TYPING_DEBOUNCE_MS = 300;
const TYPING_THROTTLE_MS = 1000;
const TYPING_AUTO_STOP_MS = 3000;

interface MessageInputProps {
  conversationId: string;
  onSendMessage?: (content: string) => void;
}

export function MessageInput({ conversationId, onSendMessage }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const autoStopTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastEmitTimeRef = useRef(0);

  const emitTypingStart = useCallback(() => {
    const socket = getSocket();
    if (!socket?.connected) return;

    const now = Date.now();
    if (now - lastEmitTimeRef.current >= TYPING_THROTTLE_MS) {
      socket.emit(SOCKET_EVENTS.TYPING_START, { conversationId });
      lastEmitTimeRef.current = now;
    }
  }, [conversationId]);

  const emitTypingStop = useCallback(() => {
    const socket = getSocket();
    if (!socket?.connected) return;
    socket.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId });
  }, [conversationId]);

  const handleTypingStart = useCallback(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => emitTypingStart(), TYPING_DEBOUNCE_MS);

    if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
    autoStopTimeoutRef.current = setTimeout(() => emitTypingStop(), TYPING_AUTO_STOP_MS);
  }, [emitTypingStart, emitTypingStop]);

  const handleTypingStop = useCallback(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
    emitTypingStop();
  }, [emitTypingStop]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
      emitTypingStop();
    };
  }, [conversationId, emitTypingStop]);

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    // Optimistic message ID
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage = {
      id: optimisticId,
      conversationId,
      senderId: currentUserId ?? '',
      content: trimmed,
      type: 'text',
      statuses: [],
      createdAt: new Date(),
      isOptimistic: true,
    };

    setIsSending(true);

    // Optimistically insert the message into the cache
    queryClient.setQueryData(
      ['messages', conversationId],
      (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any, i: number) => {
            if (i !== old.pages.length - 1) return page;
            return { ...page, items: [...page.items, optimisticMessage] };
          }),
        };
      }
    );

    // Optimistically update conversation's lastMessage
    queryClient.setQueryData(['conversations'], (old: any) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return old.map((conv: any) =>
          conv.id === conversationId
            ? { ...conv, lastMessage: { id: optimisticId, content: trimmed, senderId: currentUserId, createdAt: new Date() } }
            : conv
        );
      }
      // Handle paginated query data
      if (old.pages) {
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((conv: any) =>
              conv.id === conversationId
                ? { ...conv, lastMessage: { id: optimisticId, content: trimmed, senderId: currentUserId, createdAt: new Date() } }
                : conv
            ),
          })),
        };
      }
      return old;
    });

    try {
      onSendMessage?.(trimmed);

      const socket = getSocket();
      if (socket?.connected) {
        socket.emit(SOCKET_EVENTS.MESSAGE_SEND, {
          conversationId,
          content: trimmed,
          type: 'text',
        });
      }

      setContent('');
      handleTypingStop();

      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch {
      // Mark the message as failed instead of removing it
      queryClient.setQueryData(
        ['messages', conversationId],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: page.items.map((msg: any) =>
                msg.id === optimisticId
                  ? { ...msg, failed: true, isOptimistic: false }
                  : msg
              ),
            })),
          };
        }
      );
      toast({
        variant: 'destructive',
        title: 'Failed to send message',
        description: 'Tap the message to retry.',
      });
    } finally {
      setIsSending(false);
    }
  }, [content, isSending, conversationId, onSendMessage, handleTypingStop, queryClient, currentUserId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
      handleTypingStart();
    },
    [handleTypingStart]
  );

  const kbd =
    'rounded border border-white/10 bg-cardx px-1 py-0.5 text-[10px] text-slate-300';

  return (
    <div className="border-t border-white/5 bg-panel/60 p-4 backdrop-blur-md">
      <div
        className={cn(
          'rounded-xl border border-white/10 bg-cardx p-2.5 transition-all duration-200',
          isFocused
            ? 'border-blue-500/60 shadow-inner'
            : 'focus-within:border-blue-500/40'
        )}
      >
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Reply... (Type '/' for canned responses, Shift+Enter for newline)"
          className="min-h-[24px] max-h-[120px] resize-none border-0 bg-transparent px-1 py-1 text-xs text-slate-100 placeholder-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0"
          rows={1}
          disabled={isSending}
        />

        <div className="mt-1 flex items-center justify-between border-t border-white/5 pt-2">
          {/* Composer tools */}
          <div className="flex items-center gap-1 text-slate-400">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>

          {/* Send action */}
          <div className="flex items-center gap-3">
            <p className="text-[11px] text-slate-500">
              Press <kbd className={kbd}>⌘ Enter</kbd>
            </p>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!content.trim() || isSending}
              className={cn(
                'bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1.5 text-xs font-semibold shadow-md shadow-blue-500/20 transition-all',
                !content.trim() && 'opacity-50',
                content.trim() && 'hover:from-blue-500 hover:to-indigo-500'
              )}
            >
              {isSending ? (
                <div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
