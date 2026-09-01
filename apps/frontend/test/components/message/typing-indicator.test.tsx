import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TypingIndicator } from '@/components/message/typing-indicator';

describe('TypingIndicator', () => {
  it('renders null when empty or undefined', () => {
    const { container } = render(<TypingIndicator userIds={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders "is typing" for a single user with name map', () => {
    render(<TypingIndicator userIds={['u1']} userNames={{ u1: 'Alice' }} />);
    expect(screen.getByText('Alice is typing')).toBeInTheDocument();
  });

  it('renders "Someone is typing" when name not in map', () => {
    render(<TypingIndicator userIds={['u1']} />);
    expect(screen.getByText('Someone is typing')).toBeInTheDocument();
  });

  it('renders "X and Y are typing" for two users', () => {
    render(
      <TypingIndicator
        userIds={['u1', 'u2']}
        userNames={{ u1: 'Alice', u2: 'Bob' }}
      />
    );
    expect(screen.getByText('Alice and Bob are typing')).toBeInTheDocument();
  });

  it('renders "X and N others are typing" for more than two', () => {
    render(
      <TypingIndicator
        userIds={['u1', 'u2', 'u3']}
        userNames={{ u1: 'Alice', u2: 'Bob', u3: 'Carol' }}
      />
    );
    expect(screen.getByText('Alice and 2 others are typing')).toBeInTheDocument();
  });

  it('renders typing dots', () => {
    const { container } = render(<TypingIndicator userIds={['u1']} userNames={{ u1: 'Alice' }} />);
    expect(container.querySelectorAll('.typing-dot')).toHaveLength(3);
  });
});
