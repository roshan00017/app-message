import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { MessageInput } from '@/components/message/message-input';
import { useAuthStore } from '@/stores/useAuthStore';

vi.mock('@/services/socket', () => ({
  getSocket: vi.fn(() => ({
    connected: false,
    emit: vi.fn(),
  })),
  SOCKET_EVENTS: {
    TYPING_START: 'typing:start',
    TYPING_STOP: 'typing:stop',
    MESSAGE_SEND: 'message:send',
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('MessageInput', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'user-1', name: 'Alice', email: 'a@b.com', role: 'user', status: 'offline', lastSeen: new Date() },
      isLoading: false,
    });
  });

  it('renders the textarea and send button', () => {
    render(<MessageInput conversationId="conv-1" />, { wrapper: createWrapper() });
    expect(screen.getByPlaceholderText(/Reply/)).toBeInTheDocument();
  });

  it('disables send button when content is empty', () => {
    render(<MessageInput conversationId="conv-1" />, { wrapper: createWrapper() });
    const sendButton = screen.getAllByRole('button').find((b) =>
      (b as HTMLButtonElement).disabled
    );
    expect(sendButton).toBeDefined();
  });

  it('allows typing text into the textarea', async () => {
    const user = userEvent.setup();
    render(<MessageInput conversationId="conv-1" />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText(/Reply/);
    await user.type(textarea, 'Hello world');

    expect(textarea).toHaveValue('Hello world');
  });

  it('calls onSendMessage with trimmed content when sending', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput conversationId="conv-1" onSendMessage={onSend} />, {
      wrapper: createWrapper(),
    });

    const textarea = screen.getByPlaceholderText(/Reply/);
    await user.type(textarea, '  Hello  ');

    const sendButton = screen.getAllByRole('button').find(
      (b) => b.textContent?.includes('Send')
    );
    await user.click(sendButton!);

    expect(onSend).toHaveBeenCalledWith('Hello');
  });

  it('does not send empty or whitespace-only messages', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput conversationId="conv-1" onSendMessage={onSend} />, {
      wrapper: createWrapper(),
    });

    const textarea = screen.getByPlaceholderText(/Reply/);
    await user.type(textarea, '   ');
    const sendButton = screen.getAllByRole('button').find(
      (b) => b.textContent?.includes('Send')
    );
    if (sendButton) {
      await user.click(sendButton);
    }

    expect(onSend).not.toHaveBeenCalled();
  });

  it('sends on Enter key without shift', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput conversationId="conv-1" onSendMessage={onSend} />, {
      wrapper: createWrapper(),
    });

    const textarea = screen.getByPlaceholderText(/Reply/);
    await user.type(textarea, 'Hi there{enter}');

    expect(onSend).toHaveBeenCalledWith('Hi there');
  });
});