import { cn, formatRelativeTime } from '@/lib/utils';
import { usePresenceStore } from '@/stores/usePresenceStore';

const DEFAULT_PRESENCE = { status: 'offline' as const, lastSeen: new Date(0) };

const statusConfig = {
  online: {
    color: 'bg-green-500',
    label: 'Online',
    pulse: true,
  },
  offline: {
    color: 'bg-gray-400',
    label: 'Offline',
    pulse: false,
  },
  busy: {
    color: 'bg-orange-500',
    label: 'Busy',
    pulse: false,
  },
  away: {
    color: 'bg-yellow-500',
    label: 'Away',
    pulse: false,
  },
} as const;

interface PresenceBadgeProps {
  userId: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PresenceBadge({
  userId,
  showLabel = false,
  size = 'sm',
  className,
}: PresenceBadgeProps) {
  const { status, lastSeen } = usePresenceStore((s) => s.statuses[userId] ?? DEFAULT_PRESENCE);
  const typedStatus = status as keyof typeof statusConfig;
  const config = statusConfig[typedStatus] ?? statusConfig.offline;

  const dotSize = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  }[size];

  const label =
    typedStatus === 'offline' && lastSeen && new Date(lastSeen).getTime() > 0
      ? `Last seen ${formatRelativeTime(new Date(lastSeen))}`
      : config.label;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="relative flex">
        {config.pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              config.color
            )}
          />
        )}
        <span className={cn('relative rounded-full', dotSize, config.color)} />
      </span>
      {showLabel && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
