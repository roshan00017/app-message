import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';

import { AppLayout } from '@/components/layout/app-layout';
import { ConversationList } from '@/components/conversation/conversation-list';
import { NewConversationDialog } from '@/components/conversation/new-conversation-dialog';

export default function ConversationsPage() {
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Conversation sidebar */}
        <div className="w-full border-r md:w-80">
          <ConversationList onCreateClick={() => setNewDialogOpen(true)} />
        </div>

        {/* Empty state (desktop only) */}
        <div className="hidden flex-1 flex-col items-center justify-center bg-muted/20 md:flex">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <MessageSquarePlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Select a conversation
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose from the list or start a new one
            </p>
          </div>
        </div>
      </div>

      <NewConversationDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />
    </AppLayout>
  );
}
