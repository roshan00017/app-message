import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { Suspense, useEffect } from 'react';

import { SocketProvider } from '@/contexts/socket-context';
import { ConnectionStatus } from '@/components/shared/connection-status';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

function ThemeInitializer() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  return null;
}

// The connection banner only makes sense for authenticated users. On the
// login/register screens the socket is intentionally not connected, so
// showing "Connecting..." there is misleading.
function ConnectionStatusGate() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return <ConnectionStatus />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <Suspense fallback={<PageLoader />}>
            <RouterProvider router={router} />
          </Suspense>
          <ThemeInitializer />
          <ConnectionStatusGate />
          <Toaster />
        </SocketProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
