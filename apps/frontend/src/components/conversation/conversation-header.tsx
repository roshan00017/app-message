import { useState } from 'react';
import { ChevronDown, Download, Info } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PresenceBadge } from '@/components/shared/presence-badge';
import { ExportDialog } from './export-dialog';
import { getInitials } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { cn } from '@/lib/utils';
import { useNavigate } from '@tanstack/react-router';

interface ConversationHeaderProps {
  conversationId: string;
  name: string;
  participantId?: string;
  participantAvatar?: string | null;
  status?: 'waiting' | 'active' | 'closed';
}

const STATUS_STYLES: Record<string, string> = {
  waiting: 'bg-amber-500/20 text-amber-400',
  active: 'bg-emerald-500/20 text-emerald-400',
  closed: 'bg-gray-500/20 text-gray-400',
};

export function ConversationHeader({
  conversationId,
  name,
  participantId,
  participantAvatar,
  status = 'active',
}: ConversationHeaderProps) {
  const navigate = useNavigate();
  const [exportOpen, setExportOpen] = useState(false);
  const connectionStatus = useUIStore((s) => s.connectionStatus);
  const connected = connectionStatus === 'connected';

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-white/5 bg-panel/40 px-6 backdrop-blur-md">
        {/* Target info */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-slate-300"
            onClick={() => navigate({ to: '/conversations' })}
          >
            <ChevronDown className="h-5 w-5 rotate-90" />
          </Button>
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={participantAvatar ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 font-medium">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            {participantId && (
              <div className="absolute -bottom-0.5 -right-0.5">
                <PresenceBadge userId={participantId} size="md" />
              </div>
            )}
          </div>
          <div className="ml-2">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white">{name}</h1>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', STATUS_STYLES[status] ?? STATUS_STYLES.active)}>
                {status}
              </span>
              <PresenceBadge userId={participantId ?? ''} size="sm" showLabel={false} />
            </div>
            <p className="text-[11px] text-slate-400">
              Room: <code className="font-mono text-slate-300">conv_{conversationId.slice(-6)}</code>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Connection pill */}
          <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-cardx px-2.5 py-1 text-[11px] text-slate-300">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'
              )}
            />
            <span className="font-mono">{connected ? 'Connected' : 'Reconnecting...'}</span>
          </div>

          {/* Export dropdown */}
          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportOpen(true)}
              className="border-white/5 bg-cardx px-3 text-xs text-slate-200 transition-colors hover:bg-white/10"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="border-white/5 bg-cardx px-3 text-xs text-slate-200 transition-colors hover:bg-white/10"
          >
            <Info className="mr-1.5 h-3.5 w-3.5" />
            Details
          </Button>
        </div>
      </header>

      <ExportDialog
        conversationId={conversationId}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
    </>
  );
}
