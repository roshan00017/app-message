import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';

import { PresenceBadge } from '@/components/shared/presence-badge';
import { usePresenceStore } from '@/stores/usePresenceStore';

describe('PresenceBadge', () => {
  beforeEach(() => {
    usePresenceStore.setState({ statuses: {} });
  });

  it('renders offline for unknown users', () => {
    render(<PresenceBadge userId="ghost" showLabel />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders online label with pulse', () => {
    usePresenceStore.getState().setStatus('user-1', 'online', new Date());
    const { container } = render(<PresenceBadge userId="user-1" showLabel />);
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(container.querySelector('.animate-ping')).toBeInTheDocument();
  });

  it('renders busy status', () => {
    usePresenceStore.getState().setStatus('user-1', 'busy', new Date());
    render(<PresenceBadge userId="user-1" showLabel />);
    expect(screen.getByText('Busy')).toBeInTheDocument();
  });

  it('renders away status', () => {
    usePresenceStore.getState().setStatus('user-1', 'away', new Date());
    render(<PresenceBadge userId="user-1" showLabel />);
    expect(screen.getByText('Away')).toBeInTheDocument();
  });

  it('hides the label when showLabel is false', () => {
    usePresenceStore.getState().setStatus('user-1', 'online', new Date());
    const { container } = render(<PresenceBadge userId="user-1" />);
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
    expect(container.querySelector('span')).not.toBeNull();
  });

  it('renders "Last seen" for offline users with a past lastSeen', () => {
    usePresenceStore.getState().setStatus(
      'user-1',
      'offline',
      new Date(Date.now() - 60 * 60 * 1000)
    );
    render(<PresenceBadge userId="user-1" showLabel />);
    expect(screen.getByText(/Last seen/)).toBeInTheDocument();
  });

  it('applies size classes', () => {
    usePresenceStore.getState().setStatus('user-1', 'online', new Date());
    const { container } = render(<PresenceBadge userId="user-1" size="lg" />);
    expect(container.querySelector('.relative.rounded-full')).toHaveClass('h-4', 'w-4');
  });
});