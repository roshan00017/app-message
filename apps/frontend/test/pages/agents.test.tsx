import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import AgentsPage from '@/pages/agents';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: 'agent-1',
            userId: 'user-1',
            user: {
              id: 'user-1',
              name: 'Alice Agent',
              email: 'alice@example.com',
              avatar: null,
              role: 'agent',
              status: 'online',
            },
            skills: ['billing', 'support'],
            maxConcurrentChats: 5,
            currentChats: 2,
            isAvailable: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    }),
  },
}));

vi.mock('@/components/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/components/shared/presence-badge', () => ({
  PresenceBadge: () => <span data-testid="presence-badge" />,
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

describe('AgentsPage', () => {
  // Regression test for the TypeError crash at agents.tsx (getInitials(undefined)).
  // The backend returns AgentWithUser with a nested `user` object, not a flat agent.
  it('renders agent cards from the nested AgentWithUser shape without crashing', async () => {
    await act(async () => {
      render(<AgentsPage />, { wrapper: createWrapper() });
    });

    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(await screen.findByText('Alice Agent')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('billing')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });
});