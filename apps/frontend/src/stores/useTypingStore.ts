import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const EMPTY_ARRAY: string[] = [];

interface TypingState {
  typing: Record<string, string[]>;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  clearTyping: (conversationId: string) => void;
  getTypingUsers: (conversationId: string) => string[];
}

export const useTypingStore = create<TypingState>()(
  devtools((set, get) => ({
    typing: {},

    setTyping: (conversationId, userId, isTyping) =>
      set((state) => {
        const current = state.typing[conversationId] ?? [];

        if (isTyping) {
          if (current.includes(userId)) return state;
          return {
            typing: {
              ...state.typing,
              [conversationId]: [...current, userId],
            },
          };
        }

        const updated = current.filter((id) => id !== userId);
        if (updated.length === current.length) return state;
        return {
          typing: {
            ...state.typing,
            [conversationId]: updated,
          },
        };
      }),

    clearTyping: (conversationId) =>
      set((state) => {
        if (!state.typing[conversationId]?.length) return state;
        return {
          typing: {
            ...state.typing,
            [conversationId]: [],
          },
        };
      }),

    getTypingUsers: (conversationId) => get().typing[conversationId] ?? EMPTY_ARRAY,
  }))
);

export { EMPTY_ARRAY };
