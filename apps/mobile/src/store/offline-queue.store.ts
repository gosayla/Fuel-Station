import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const mmkv = new MMKV({ id: 'offline-queue' });

const mmkvStorage = createJSONStorage(() => ({
  getItem: (key: string) => mmkv.getString(key) ?? null,
  setItem: (key: string, value: string) => mmkv.set(key, value),
  removeItem: (key: string) => mmkv.delete(key),
}));

export interface PendingSale {
  id: string;
  payload: {
    tankId: string;
    liters: number;
    pricePerLiter: number;
    paymentMethod: string;
    shiftId?: string;
  };
  createdAt: string;
}

interface OfflineQueueState {
  pending: PendingSale[];
  addPending: (payload: PendingSale['payload']) => void;
  removePending: (id: string) => void;
  clearAll: () => void;
}

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set) => ({
      pending: [],
      addPending: (payload) =>
        set((state) => ({
          pending: [
            ...state.pending,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              payload,
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      removePending: (id) =>
        set((state) => ({
          pending: state.pending.filter((p) => p.id !== id),
        })),
      clearAll: () => set({ pending: [] }),
    }),
    {
      name: 'offline-queue',
      storage: mmkvStorage,
    },
  ),
);
