import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { AppState, I18nManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { MMKV } from 'react-native-mmkv';
import { I18nextProvider } from 'react-i18next';
import { initI18n, RTL_LANGUAGES, type SupportedLanguage } from '@fuel-station/shared';
import { AppNavigator } from './navigation/AppNavigator';
import { AppAlert } from './lib/alert';
import { useOfflineSync } from './lib/useOfflineSync';

// ── Persistent storage (MMKV — synchronous, no async/await needed) ────────
const mmkv = new MMKV({ id: 'fuel-station' });
const LANG_KEY = 'fuel_station_lang';

const mobileStorage = {
  get: () => mmkv.getString(LANG_KEY) ?? null,
  set: (lang: string) => mmkv.set(LANG_KEY, lang),
};

// ── Read saved language before first render ───────────────────────────────
const savedLang = (mobileStorage.get() ?? 'en') as SupportedLanguage;

// ── Apply RTL layout direction on startup ─────────────────────────────────
// forceRTL takes full effect when called before the root component mounts.
// Changing language mid-session that flips RTL requires an app restart.
I18nManager.allowRTL(true);
I18nManager.forceRTL(RTL_LANGUAGES.includes(savedLang));

// ── Init i18n with persisted language + MMKV backend ─────────────────────
const i18n = initI18n(savedLang, mobileStorage);

// ─────────────────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 0 } },
});

function SyncManager() {
  useOfflineSync();
  return null;
}

export default function App() {
  // Refetch when app comes back from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', status => {
      focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <SyncManager />
          <AppNavigator onNavigationStateChange={() => focusManager.setFocused(true)} />
          <AppAlert />
        </QueryClientProvider>
      </I18nextProvider>
    </GestureHandlerRootView>
  );
}
