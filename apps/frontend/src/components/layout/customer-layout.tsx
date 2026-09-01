import { ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { LogOut, MessageSquare } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useTotalUnreadCount } from '@/hooks/use-unread-counts';
import { getInitials } from '@/lib/utils';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';
import { cn } from '@/lib/utils';

interface CustomerLayoutProps {
  children: ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const connectionStatus = useUIStore((s) => s.connectionStatus);
  const totalUnread = useTotalUnreadCount();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      logout();
      navigate({ to: '/login' });
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Customer Header */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
        {/* Logo */}
        <Link to="/customer/chat" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">Support</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Unread badge */}
          {totalUnread > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-600">
              <MessageSquare className="h-3 w-3" />
              <span>{totalUnread} unread</span>
            </div>
          )}

          {/* Connection status */}
          <div className="hidden items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] text-muted-foreground sm:flex">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                connectionStatus === 'connected' ? 'bg-green-500' : 'bg-amber-500'
              )}
            />
            <span className="font-mono capitalize">{connectionStatus}</span>
          </div>

          {/* User info */}
          {user && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-xs text-white">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:block">{user.name}</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
