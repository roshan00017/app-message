import { Moon, Sun, Monitor } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useThemeStore } from '@/stores/useThemeStore';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const themes = [
  { value: 'light' as const, label: 'Light', icon: Sun, description: 'Light mode' },
  { value: 'dark' as const, label: 'Dark', icon: Moon, description: 'Dark mode' },
  { value: 'system' as const, label: 'System', icon: Monitor, description: 'Follow system' },
];

export function ThemeToggle({ open, onOpenChange }: ThemeToggleProps) {
  const { theme, setTheme } = useThemeStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Appearance</DialogTitle>
          <DialogDescription>Customize how Messages looks on your device</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          {themes.map((t) => {
            const isActive = theme === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  'group flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200',
                  isActive
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-transparent bg-muted/50 hover:bg-muted hover:shadow-sm'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground group-hover:text-foreground'
                  )}
                >
                  <t.icon className="h-5 w-5" />
                </div>
                <span className={cn('text-sm font-medium', isActive && 'text-primary')}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
