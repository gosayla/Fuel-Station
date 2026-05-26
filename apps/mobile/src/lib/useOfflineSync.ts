import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useOfflineQueueStore } from '../store/offline-queue.store';

/**
 * Mount this once at the app root.
 * When the device comes back online it flushes all pending offline sales
 * to the server one by one. Successfully uploaded sales are removed from
 * the queue; failed ones stay and will be retried on the next reconnection.
 */
export function useOfflineSync() {
  const queryClient = useQueryClient();
  const isSyncing = useRef(false);

  useEffect(() => {
    const flush = async () => {
      const { pending, removePending } = useOfflineQueueStore.getState();
      if (isSyncing.current || pending.length === 0) return;
      isSyncing.current = true;

      for (const item of pending) {
        try {
          await api.post('/sales', item.payload);
          removePending(item.id);
        } catch {
          // Leave failed items in queue; they'll retry next time
        }
      }

      // Refresh sales + shifts after sync
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      isSyncing.current = false;
    };

    // Subscribe to connectivity changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        flush();
      }
    });

    // Also try immediately in case we're already online
    NetInfo.fetch().then((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        flush();
      }
    });

    return unsubscribe;
  }, [queryClient]);
}
