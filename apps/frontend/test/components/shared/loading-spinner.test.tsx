import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingSpinner } from '@/components/shared/loading-spinner';

describe('LoadingSpinner', () => {
  it('renders a spinner container', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('applies the default md size', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-8', 'w-8', 'border-3');
  });

  it('applies sm size', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-4', 'w-4', 'border-2');
  });

  it('applies lg size', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-12', 'w-12', 'border-4');
  });

  it('merges custom className', () => {
    const { container } = render(<LoadingSpinner className="my-custom" />);
    expect(container.firstChild).toHaveClass('my-custom');
  });
});