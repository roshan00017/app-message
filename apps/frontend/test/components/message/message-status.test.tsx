import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MessageStatus } from '@/components/message/message-status';

describe('MessageStatus', () => {
  it('renders a single check for sent', () => {
    const { container } = render(<MessageStatus status="sent" />);
    expect(container.querySelector('svg.lucide-check')).toBeInTheDocument();
    expect(container.querySelector('svg.lucide-check-check')).not.toBeInTheDocument();
  });

  it('renders a double check for delivered', () => {
    const { container } = render(<MessageStatus status="delivered" />);
    expect(container.querySelector('svg.lucide-check-check')).toBeInTheDocument();
  });

  it('renders a double check for read', () => {
    const { container } = render(<MessageStatus status="read" />);
    expect(container.querySelector('svg.lucide-check-check')).toBeInTheDocument();
  });

  it('read status uses blue color', () => {
    const { container } = render(<MessageStatus status="read" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-blue-500');
  });

  it('accepts a className prop', () => {
    const { container } = render(<MessageStatus status="sent" className="mt-1" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('mt-1');
  });
});