import { Bell, LogOut, Menu, MessageSquare, Search } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useTotalUnreadCount } from '@/hooks/use-unread-counts';
import { getInitials } from '@/lib/utils';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';
import { cn } from '@/lib/utils';

export function Header() {
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/5 bg-panel/40 px-4 backdrop-blur-xl md:px-6">
      {/* Mobile menu */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden text-slate-300"
        onClick={() => useUIStore.getState().toggleSidebar()}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Logo (mobile) */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500">
          <MessageSquare className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="font-bold text-slate-100">PulseChat</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-[200px] border-white/10 bg-cardx pl-8 text-slate-200 placeholder-slate-500 transition-all focus:w-[280px] focus:border-blue-500/50 focus:bg-cardx lg:w-[300px] lg:focus:w-[360px]"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative text-slate-300">
          <Bell className="h-5 w-5" />
          {totalUnread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full p-0 text-xs"
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </Badge>
          )}
        </Button>

        <Separator orientation="vertical" className="h-8" />

        {/* User info */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Avatar className="h-8 w-8 ring-2 ring-background">
              <AvatarImage src={user?.avatar ?? undefined} alt={user?.name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-xs text-white">
                {user?.name ? getInitials(user.name) : '?'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span
                className={cn(
                  'relative h-2 w-2 rounded-full',
                  connectionStatus === 'connected' && 'bg-green-500',
                  connectionStatus === 'reconnecting' && 'bg-yellow-500',
                  connectionStatus === 'disconnected' && 'bg-red-500',
                  connectionStatus === 'error' && 'bg-red-500',
                  connectionStatus === 'offline' && 'bg-red-500',
                  connectionStatus === 'connecting' && 'bg-yellow-500'
                )}
              >
                {connectionStatus === 'connected' && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-75" />
                )}
              </span>
              <span className="text-xs capitalize text-muted-foreground">{connectionStatus}</span>
            </div>
          </div>
        </div>

        {/* Logout */}
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
  );
}
