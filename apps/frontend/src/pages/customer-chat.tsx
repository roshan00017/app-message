import { useState } from 'react';
import { MessageSquarePlus, Headphones } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { CustomerLayout } from '@/components/layout/customer-layout';
import { ConversationList } from '@/components/conversation/conversation-list';
import { NewConversationDialog } from '@/components/conversation/new-conversation-dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import type { ConversationSummary } from '@messaging/shared/types';

export default function CustomerChatPage() {
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/conversations');
      return data.data as ConversationSummary[];
    },
  });

  const hasConversations = (conversations?.length ?? 0) > 0;

  return (
    <CustomerLayout>
      <div className="flex h-full">
        {/* Conversation sidebar — only show if customer has conversations */}
        {hasConversations && (
          <div className="hidden w-80 border-r md:block">
            <ConversationList basePath="/customer/chat" />
          </div>
        )}

        {/* Main area */}
        <div className="flex flex-1 flex-col items-center justify-center bg-muted/20 p-8">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
              <Headphones className="h-10 w-10 text-blue-500" />
            </div>

            <h2 className="text-2xl font-bold text-foreground">
              Welcome to Support
            </h2>
            <p className="mt-2 text-muted-foreground">
              How can we help you today? Start a conversation with our support team.
            </p>

            <Button
              onClick={() => setNewDialogOpen(true)}
              className="mt-6 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Start Conversation
            </Button>

            {hasConversations && (
              <p className="mt-4 text-xs text-muted-foreground">
                Or select an existing conversation from the sidebar
              </p>
            )}
          </div>
        </div>
      </div>

      <NewConversationDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />
    </CustomerLayout>
  );
}
