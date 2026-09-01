import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';

import type { Agent } from '@messaging/shared/types';
import { AppLayout } from '@/components/layout/app-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PresenceBadge } from '@/components/shared/presence-badge';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { getInitials } from '@/lib/utils';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';

export default function AgentsPage() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data } = await api.get('/agents');
      return data.data as Agent[];
    },
  });

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agent Management</h1>
            <p className="text-muted-foreground">
              Manage support agents and their availability
            </p>
          </div>
          {agents && (
            <Badge variant="secondary" className="text-sm">
              {agents.length} agents
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : !agents?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="mb-4 rounded-2xl bg-muted p-4">
              <Users className="h-8 w-8" />
            </div>
            <p className="text-lg font-medium">No agents yet</p>
            <p className="mt-1 text-sm">Agents will appear here once registered</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent, index) => (
              <Card
                key={agent.id}
                className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                  <div className="relative">
                    <Avatar className="h-12 w-12 transition-transform duration-200 group-hover:scale-105">
                      <AvatarImage src={agent.user.avatar ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 font-medium">
                        {getInitials(agent.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <PresenceBadge userId={agent.user.id} size="md" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{agent.user.name}</CardTitle>
                    <p className="truncate text-sm text-muted-foreground">{agent.user.email}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Status & Load */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge
                      variant={agent.isAvailable ? 'default' : 'secondary'}
                      className={cn(
                        agent.isAvailable && 'bg-green-500/10 text-green-700 hover:bg-green-500/20'
                      )}
                    >
                      {agent.isAvailable ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>

                  {/* Chat Load */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Active Chats</span>
                      <span className="font-medium">
                        {agent.currentChats} / {agent.maxConcurrentChats}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          agent.currentChats / agent.maxConcurrentChats > 0.8
                            ? 'bg-red-500'
                            : agent.currentChats / agent.maxConcurrentChats > 0.5
                              ? 'bg-amber-500'
                              : 'bg-green-500'
                        )}
                        style={{
                          width: `${Math.min(
                            (agent.currentChats / agent.maxConcurrentChats) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Skills */}
                  {agent.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {agent.skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="text-xs"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
