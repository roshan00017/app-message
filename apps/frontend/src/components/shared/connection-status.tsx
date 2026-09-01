import { useUIStore } from '@/stores/useUIStore';
import { cn } from '@/lib/utils';

const statusConfig = {
  connecting: {
    message: 'Connecting...',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-500',
    animate: true,
  },
  connected: {
    message: '',
    bgColor: '',
    textColor: '',
    dotColor: '',
    animate: false,
  },
  disconnected: {
    message: 'Connection lost. Retrying...',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-700',
    dotColor: 'bg-red-500',
    animate: true,
  },
  reconnecting: {
    message: 'Reconnecting...',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-500',
    animate: true,
  },
  error: {
    message: 'Connection error.',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-700',
    dotColor: 'bg-red-500',
    animate: false,
  },
  offline: {
    message: 'You are offline.',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-700',
    dotColor: 'bg-red-500',
    animate: false,
  },
};

export function ConnectionStatus() {
  const connectionStatus = useUIStore((s) => s.connectionStatus);
  const config = statusConfig[connectionStatus];

  if (!config.message) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 py-1.5 text-sm font-medium',
        'animate-in slide-in-from-top duration-300',
        config.bgColor,
        config.textColor
      )}
    >
      <span className="relative flex h-2 w-2">
        {config.animate && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              config.dotColor
            )}
          />
        )}
        <span
          className={cn('relative inline-flex h-2 w-2 rounded-full', config.dotColor)}
        />
      </span>
      <span>{config.message}</span>
    </div>
  );
}
