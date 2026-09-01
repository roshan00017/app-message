import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UnreadBadgeProps {
  count: number;
  className?: string;
}

export function UnreadBadge({ count, className }: UnreadBadgeProps) {
  if (count <= 0) return null;

  return (
    <Badge
      variant="destructive"
      className={cn(
        'h-5 min-w-[20px] justify-center rounded-full px-1 text-xs',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </Badge>
  );
}
