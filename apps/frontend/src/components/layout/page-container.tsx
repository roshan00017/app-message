import * as React from 'react';

import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return <div className={cn('container mx-auto p-4 md:p-6', className)}>{children}</div>;
}
