import { Check, CheckCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

interface MessageStatusProps {
  status: 'sent' | 'delivered' | 'read';
  className?: string;
}

export function MessageStatus({ status, className }: MessageStatusProps) {
  if (status === 'sent') {
    return <Check className={cn('h-3 w-3', className)} />;
  }

  if (status === 'delivered') {
    return <CheckCheck className={cn('h-3 w-3', className)} />;
  }

  // read - blue double check
  return <CheckCheck className={cn('h-3 w-3 text-blue-500', className)} />;
}
