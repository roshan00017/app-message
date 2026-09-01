import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ConversationDetailPage from '@/pages/conversation-detail';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTypingStore } from '@/stores/useTypingStore';

vi.mock('@tanstack/react-router', () => ({
  useMatch: () => ({ params: { conversationId: 'conv-1' } }),
  useParams: () => ({ conversationId: 'conv-1' }),
}));

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      data: {
        data: {
          id: 'conv-1',
          name: '',
          type: 'direct',
          participants: [
            { id: 'user-2', name: 'Bob', avatar: null },
            { id: 'user-1', name: 'Alice', avatar: null },
          ],
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      },
    }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('@/components/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/components/conversation/conversation-list', () => ({
  ConversationList: () => <div data-testid="conversation-list" />,
}));

vi.mock('@/components/conversation/conversation-header', () => ({
  ConversationHeader: (props: Record<string, unknown>) => (
    <div data-testid="conversation-header">{String(props.name)}</div>
  ),
}));

vi.mock('@/components/message/message-list', () => ({
  MessageList: () => <div data-testid="message-list" />,
}));

vi.mock('@/components/message/message-input', () => ({
  MessageInput: () => <div data-testid="message-input" />,
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('ConversationDetailPage', () => {
  // Regression test for the "maximum update depth exceeded" bug.
  // The page previously called store.getTypingUsers() from the selector,
  // which returned a fresh [] reference each render → infinite re-render loop.
  it('renders without infinite re-render when nobody is typing', async () => {
    useAuthStore.setState({
      user: { id: 'user-1', name: 'Alice', email: 'a@b.com', role: 'user', status: 'offline', lastSeen: new Date() },
      isLoading: false,
    });
    useTypingStore.setState({ typing: {} });

    await act(async () => {
      render(<ConversationDetailPage />, { wrapper: createWrapper() });
    });

    // After the async fetch resolves, the content should render.
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-list')).toBeInTheDocument();
  });
});