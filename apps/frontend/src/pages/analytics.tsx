import { useEffect, useState, useRef } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Activity, BarChart3, MessageSquare, Users, TrendingUp, Zap } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { api } from '@/services/api';
import { useSocketContext } from '@/contexts/socket-context';
import { SOCKET_EVENTS } from '@messaging/shared/constants';
import { cn } from '@/lib/utils';

interface RealtimeMetrics {
  activeUsers: number;
  messagesPerMinute: number;
  messagesPerHour: number;
  onlineUsers: number;
  activeConversations: number;
  avgResponseTime: number;
}

interface MetricPoint {
  time: string;
  messages: number;
  users: number;
}

// Animated counter component
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    prevValue.current = value;
  }, [value]);

  return <span className={className}>{displayValue}</span>;
}

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-sm">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function AnalyticsPage() {
  const { on } = useSocketContext();
  const [chartData, setChartData] = useState<MetricPoint[]>([]);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['analytics', 'realtime'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/realtime');
      return data.data as RealtimeMetrics;
    },
    refetchInterval: 10000,
  });

  // Listen for real-time analytics updates via socket
  useEffect(() => {
    const unsub = on(SOCKET_EVENTS.ANALYTICS_UPDATE, (data: unknown) => {
      const m = data as RealtimeMetrics;
      const now = new Date().toLocaleTimeString();
      setChartData((prev) => {
        const next = [...prev, { time: now, messages: m.messagesPerMinute, users: m.onlineUsers }];
        return next.slice(-20);
      });
    });

    return unsub;
  }, [on]);

  // Subscribe to analytics room on mount
  useEffect(() => {
    import('@/services/socket').then(({ getSocket }) => {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit(SOCKET_EVENTS.ANALYTICS_SUBSCRIBE);
      }
    });
  }, []);

  const stats = [
    {
      title: 'Active Users',
      value: metrics?.activeUsers ?? 0,
      icon: Users,
      description: 'Currently active',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      gradient: 'from-blue-500/20 to-blue-600/5',
    },
    {
      title: 'Online Users',
      value: metrics?.onlineUsers ?? 0,
      icon: Activity,
      description: 'Connected now',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      gradient: 'from-emerald-500/20 to-emerald-600/5',
    },
    {
      title: 'Messages/min',
      value: metrics?.messagesPerMinute ?? 0,
      icon: MessageSquare,
      description: 'Current rate',
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
      gradient: 'from-violet-500/20 to-violet-600/5',
    },
    {
      title: 'Active Conversations',
      value: metrics?.activeConversations ?? 0,
      icon: BarChart3,
      description: 'In progress',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      gradient: 'from-amber-500/20 to-amber-600/5',
    },
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Real-time Analytics</h1>
            <p className="text-muted-foreground">Live metrics and activity monitoring</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-600">Live</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <Card
                  key={stat.title}
                  className={cn(
                    'relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5',
                    `bg-gradient-to-br ${stat.gradient}`
                  )}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={cn('rounded-lg p-2', stat.bgColor)}>
                      <stat.icon className={cn('h-4 w-4', stat.color)} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <AnimatedNumber
                      value={stat.value}
                      className="text-3xl font-bold tracking-tight"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Live Messages Chart */}
              <Card className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-violet-500/10 p-2">
                      <TrendingUp className="h-4 w-4 text-violet-500" />
                    </div>
                    <CardTitle className="text-base">Messages Activity</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="messagesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="messages"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          fill="url(#messagesGradient)"
                          name="Messages/min"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Zap className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p className="text-sm">Waiting for real-time data...</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Live Users Chart */}
              <Card className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-emerald-500/10 p-2">
                      <Users className="h-4 w-4 text-emerald-500" />
                    </div>
                    <CardTitle className="text-base">Online Users</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="users"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="url(#usersGradient)"
                          name="Online Users"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Zap className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p className="text-sm">Waiting for real-time data...</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bottom Stats */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-blue-500/10 p-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                    </div>
                    <CardTitle className="text-base">Messages per Hour</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <AnimatedNumber
                    value={metrics?.messagesPerHour ?? 0}
                    className="text-4xl font-bold tracking-tight"
                  />
                  <p className="mt-1 text-sm text-muted-foreground">Last 60 minutes</p>
                </CardContent>
              </Card>

              <Card className="transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-amber-500/10 p-2">
                      <Activity className="h-4 w-4 text-amber-500" />
                    </div>
                    <CardTitle className="text-base">Avg Response Time</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold tracking-tight">
                    {metrics?.avgResponseTime
                      ? `${(metrics.avgResponseTime / 1000).toFixed(1)}s`
                      : '0s'}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Agent response time</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
