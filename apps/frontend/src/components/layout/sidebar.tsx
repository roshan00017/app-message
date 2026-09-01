import { Link } from '@tanstack/react-router';
import {
  BarChart3,
  MessageSquare,
  Users,
  X,
  LayoutDashboard,
  Headphones,
  MessageCircle,
  Settings2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';

// Customer nav items (simple chat-focused)
const customerNavItems = [
  { to: '/customer/chat' as const, icon: MessageCircle, label: 'Chat' },
  { to: '/customer/settings' as const, icon: Settings2, label: 'Settings' },
];

// Agent nav items
const agentNavItems = [
  { to: '/agent/dashboard' as const, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agent/conversations' as const, icon: MessageSquare, label: 'Conversations' },
  { to: '/agent/settings' as const, icon: Settings2, label: 'Settings' },
];

// Admin nav items
const adminNavItems = [
  { to: '/admin/dashboard' as const, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/agents' as const, icon: Users, label: 'Agents' },
  { to: '/admin/conversations' as const, icon: MessageSquare, label: 'Conversations' },
  { to: '/admin/analytics' as const, icon: BarChart3, label: 'Analytics' },
  { to: '/agent/settings' as const, icon: Settings2, label: 'Settings' },
];

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  const isAdmin = user?.role === 'admin';
  const isAgent = user?.role === 'agent' || isAdmin;
  // Select nav items based on role
  const navItems = isAdmin ? adminNavItems : isAgent && !isAdmin ? agentNavItems : customerNavItems;

  const brandLabel = isAdmin
    ? 'Admin Panel'
    : isAgent
      ? 'Agent Dashboard'
      : 'Support Chat';

  const BrandIcon = isAdmin ? Users : isAgent ? Headphones : MessageCircle;

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-background/95 backdrop-blur-xl transition-all duration-300 ease-in-out',
          'md:relative md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link to={isAdmin ? '/admin/dashboard' : isAgent ? '/agent/dashboard' : '/customer/chat'} className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20">
              <BrandIcon className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-100">{brandLabel}</span>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to}>
                {({ isActive }) => (
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-2.5 transition-all duration-200',
                      isActive && 'bg-primary/10 text-primary hover:bg-primary/15'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {isActive && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </Button>
                )}
              </Link>
            ))}

            <Separator className="my-3" />
          </nav>
        </ScrollArea>

        {/* User info at bottom */}
        {user && (
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-medium text-white">
                  {user.name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
