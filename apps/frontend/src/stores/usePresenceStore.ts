import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface PresenceState {
  statuses: Record<
    string,
    {
      status: 'online' | 'offline' | 'busy' | 'away';
      lastSeen: Date;
    }
  >;

  setStatus: (userId: string, status: string, lastSeen: Date) => void;
  setBulkStatuses: (statuses: Record<string, { status: string; lastSeen: Date }>) => void;
  getStatus: (userId: string) => { status: string; lastSeen: Date };
}

export const usePresenceStore = create<PresenceState>()(
  devtools((set, get) => ({
    statuses: {},

    setStatus: (userId, status, lastSeen) =>
      set((state) => ({
        statuses: {
          ...state.statuses,
          [userId]: {
            status: status as PresenceState['statuses'][string]['status'],
            lastSeen: new Date(lastSeen),
          },
        },
      })),

    setBulkStatuses: (statuses) =>
      set((state) => {
        const updated = { ...state.statuses };
        Object.entries(statuses).forEach(([userId, data]) => {
          updated[userId] = {
            status: data.status as PresenceState['statuses'][string]['status'],
            lastSeen: new Date(data.lastSeen),
          };
        });
        return { statuses: updated };
      }),

    getStatus: (userId) =>
      get().statuses[userId] || {
        status: 'offline',
        lastSeen: new Date(0),
      },
  }))
);
