import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useLocation,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { lazy, useEffect } from 'react';

import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSocketSync } from '@/hooks/use-socket-sync';
import { usePushEvents } from '@/hooks/use-push-events';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function RootLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <LoadingSpinner size="lg" />
    </div>
  );
}

/** Maps user role to the default landing path after login. */
function defaultPathForRole(role?: string): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'agent':
      return '/agent/dashboard';
    default:
      return '/customer/chat';
  }
}

/** Returns true when the path belongs to a protected route group. */
function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith('/customer') ||
    pathname.startsWith('/agent') ||
    pathname.startsWith('/admin') ||
    // Legacy paths for backwards-compat (will redirect)
    pathname === '/conversations' ||
    pathname.startsWith('/conversations/') ||
    pathname === '/agents' ||
    pathname === '/analytics' ||
    pathname === '/settings' ||
    pathname === '/agent-dashboard'
  );
}

function isGuestPath(pathname: string): boolean {
  return pathname === '/login' || pathname === '/register';
}

// ---------------------------------------------------------------------------
// Root Layout — rendered INSIDE router context
// ---------------------------------------------------------------------------

function RootLayout() {
  useSocketSync();
  usePushEvents();

  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  // Redirect after auth settles
  useEffect(() => {
    if (isLoading) return;

    if (isProtectedPath(location.pathname) && !user) {
      router.navigate({ to: '/login' });
    } else if (isGuestPath(location.pathname) && user) {
      router.navigate({ to: defaultPathForRole(user.role) });
    } else if (location.pathname === '/' && user) {
      router.navigate({ to: defaultPathForRole(user.role) });
    }
  }, [isLoading, user, location.pathname]);

  if (isLoading) return <RootLoading />;
  if (isProtectedPath(location.pathname) && !user) return <RootLoading />;
  if (isGuestPath(location.pathname) && user) return <RootLoading />;

  return <Outlet />;
}

const rootRoute = createRootRoute({
  component: RootLayout,
  errorComponent: ({ error, reset }: ErrorComponentProps) => (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="max-w-md text-center">
        <div className="mb-6 text-6xl">💥</div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Something went wrong</h1>
        <p className="mb-6 text-muted-foreground">
          {error?.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="max-w-md text-center">
        <div className="mb-6 text-6xl">🔍</div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Page not found</h1>
        <p className="mb-6 text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a
          href="/login"
          className="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Go to Login
        </a>
      </div>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function authGuard() {
  const { user, isLoading } = useAuthStore.getState();
  if (!isLoading && !user) {
    throw redirect({ to: '/login' });
  }
}

function guestGuard() {
  const { user, isLoading } = useAuthStore.getState();
  if (!isLoading && user) {
    throw redirect({ to: defaultPathForRole(user.role) });
  }
}

function requireRole(...roles: string[]) {
  return () => {
    const { user, isLoading } = useAuthStore.getState();
    if (!isLoading && !user) throw redirect({ to: '/login' });
    if (!isLoading && user && !roles.includes(user.role)) {
      throw redirect({ to: defaultPathForRole(user.role) });
    }
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Root redirect
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    throw redirect({ to: defaultPathForRole(user?.role) });
  },
});

// Guest routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: guestGuard,
  component: lazy(() => import('@/pages/login')),
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  beforeLoad: guestGuard,
  component: lazy(() => import('@/pages/register')),
});

// ---------------------------------------------------------------------------
// Customer routes — accessible by all roles (customer, agent, admin)
// ---------------------------------------------------------------------------

const customerChatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/customer/chat',
  beforeLoad: requireRole('user'),
  component: lazy(() => import('@/pages/customer-chat')),
});

const customerChatDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/customer/chat/$conversationId',
  beforeLoad: requireRole('user'),
  component: lazy(() => import('@/pages/customer-conversation-detail')),
});

const customerSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/customer/settings',
  beforeLoad: requireRole('user'),
  component: lazy(() => import('@/pages/settings')),
});

// ---------------------------------------------------------------------------
// Agent routes
// ---------------------------------------------------------------------------

const agentDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agent/dashboard',
  beforeLoad: requireRole('agent', 'admin'),
  component: lazy(() => import('@/pages/agent-dashboard')),
});

const agentConversationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agent/conversations',
  beforeLoad: requireRole('agent', 'admin'),
  component: lazy(() => import('@/pages/conversations')),
});

const agentConversationDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agent/conversations/$conversationId',
  beforeLoad: requireRole('agent', 'admin'),
  component: lazy(() => import('@/pages/conversation-detail')),
});

const agentSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agent/settings',
  beforeLoad: requireRole('agent', 'admin'),
  component: lazy(() => import('@/pages/settings')),
});

// ---------------------------------------------------------------------------
// Admin routes
// ---------------------------------------------------------------------------

const adminDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/dashboard',
  beforeLoad: requireRole('admin'),
  component: lazy(() => import('@/pages/admin-dashboard')),
});

const adminAgentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/agents',
  beforeLoad: requireRole('admin'),
  component: lazy(() => import('@/pages/agents')),
});

const adminConversationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/conversations',
  beforeLoad: requireRole('admin'),
  component: lazy(() => import('@/pages/admin-conversations')),
});

const adminAnalyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/analytics',
  beforeLoad: requireRole('admin'),
  component: lazy(() => import('@/pages/analytics')),
});

// ---------------------------------------------------------------------------
// Legacy route redirects (keep old paths working via redirects)
// ---------------------------------------------------------------------------

const legacyConversationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/conversations',
  beforeLoad: authGuard,
  component: lazy(() => import('@/pages/conversations')),
});

const legacyConversationDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/conversations/$conversationId',
  beforeLoad: authGuard,
  component: lazy(() => import('@/pages/conversation-detail')),
});

const legacyAgentDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agent-dashboard',
  beforeLoad: authGuard,
  component: lazy(() => import('@/pages/agent-dashboard')),
});

const legacyAgentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agents',
  beforeLoad: authGuard,
  component: lazy(() => import('@/pages/agents')),
});

const legacyAnalyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  beforeLoad: authGuard,
  component: lazy(() => import('@/pages/analytics')),
});

const legacySettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  beforeLoad: authGuard,
  component: lazy(() => import('@/pages/settings')),
});

// ---------------------------------------------------------------------------
// Route Tree
// ---------------------------------------------------------------------------

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,

  // Customer routes
  customerChatRoute,
  customerChatDetailRoute,
  customerSettingsRoute,

  // Agent routes
  agentDashboardRoute,
  agentConversationsRoute,
  agentConversationDetailRoute,
  agentSettingsRoute,

  // Admin routes
  adminDashboardRoute,
  adminAgentsRoute,
  adminConversationsRoute,
  adminAnalyticsRoute,

  // Legacy routes (backwards compat)
  legacyConversationsRoute,
  legacyConversationDetailRoute,
  legacyAgentDashboardRoute,
  legacyAgentsRoute,
  legacyAnalyticsRoute,
  legacySettingsRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
