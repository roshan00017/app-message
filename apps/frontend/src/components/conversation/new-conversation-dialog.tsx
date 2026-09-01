import { MessageSquarePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from '@/hooks/use-toast';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewConversationDialog({ open, onOpenChange }: NewConversationDialogProps) {
  const queryClient = useQueryClient();

  const createConversation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/conversations', {
        type: 'direct',
        participantIds: [],
      });
      return data.data;
    },
    onSuccess: (conversation: any) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onOpenChange(false);
      toast({ title: 'Conversation started' });
      // Navigate to the new conversation if we have the ID
      if (conversation?.id) {
        window.location.href = `/customer/chat/${conversation.id}`;
      }
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to start conversation' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10">
            <MessageSquarePlus className="h-6 w-6 text-purple-600" />
          </div>
          <DialogTitle className="text-center">Start a Conversation</DialogTitle>
          <DialogDescription className="text-center">
            Connect with our support team. An agent will be assigned to help you.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createConversation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => createConversation.mutate()}
            disabled={createConversation.isPending}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
          >
            {createConversation.isPending ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Starting...
              </span>
            ) : (
              'Start Chat'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
