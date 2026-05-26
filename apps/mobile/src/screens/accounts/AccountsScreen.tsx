import React, { useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { api } from '../../lib/api';
import { Colors, Typography, Radii, Spacing, Shadows } from '../../theme';

const ACCOUNT_CFG: Record<string, { icon: string; color: string; bg: string }> = {
  safe:   { icon: 'safe',        color: Colors.primary, bg: Colors.primaryLight },
  bank:   { icon: 'bank',        color: Colors.navy,    bg: '#E3F2FD'           },
  credit: { icon: 'credit-card', color: Colors.warning, bg: Colors.warningLight },
};

const TX_ICONS: Record<string, string> = {
  collection: 'cash-plus',
  transfer:   'bank-transfer',
  expense:    'cash-minus',
  purchase:   'cart',
};

function TxRow({ tx }: { tx: any }) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const isCredit = tx.type === 'credit';
  const catLabel = t(`accounts.categories.${tx.category}`, {
    defaultValue: (tx.category as string).charAt(0).toUpperCase() + (tx.category as string).slice(1),
  });
  return (
    <View style={s.txRow}>
      <View style={[s.txIconWrap, { backgroundColor: isCredit ? Colors.primaryLight : Colors.dangerLight }]}>
        <MaterialCommunityIcons
          name={TX_ICONS[tx.category] ?? 'swap-horizontal'}
          size={18}
          color={isCredit ? Colors.primary : Colors.danger}
        />
      </View>
      <View style={s.txMid}>
        <Text style={s.txCat}>{catLabel}</Text>
        {tx.notes ? <Text style={s.txNote} numberOfLines={1}>{tx.notes}</Text> : null}
        <Text style={s.txDate}>{format(new Date(tx.createdAt), 'MMM d, hh:mm a')}</Text>
      </View>
      <Text style={[s.txAmt, { color: isCredit ? Colors.primary : Colors.danger }]}>
        {isCredit ? '+' : '–'}SAR {Number(tx.amount).toFixed(2)}
      </Text>
    </View>
  );
}

export function AccountsScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const [selId, setSelId] = useState<string | null>(null);

  const { data: accounts, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data),
    onSuccess: (d: any[]) => { if (d?.length && !selId) setSelId(d[0].id); },
  } as any);

  const { data: txs, isLoading: txLoading } = useQuery({
    queryKey: ['account-tx', selId],
    queryFn: () => api.get(`/accounts/${selId}/transactions`).then(r => r.data),
    enabled: !!selId,
  });

  const selected = accounts?.find((a: any) => a.id === selId);
  const selCfg   = ACCOUNT_CFG[selected?.type] ?? ACCOUNT_CFG.bank;
  const selBal   = selected ? Number(selected.balance) : null;
  const totalBal = accounts?.reduce((sum: number, a: any) => sum + Number(a.balance), 0) ?? 0;

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerLabel}>{t('accounts.title').toUpperCase()}</Text>
        <View style={[s.headerRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
          <Text style={s.headerTitle}>{t('accounts.title')}</Text>
          <View style={[s.totalPill, { alignItems: rtl ? 'flex-start' : 'flex-end' }]}>
            <Text style={s.totalPillLabel}>TOTAL</Text>
            <Text style={s.totalPillVal}>
              SAR {totalBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {/* ── Account selector tabs ── */}
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
            {accounts?.map((a: any) => {
              const cfg = ACCOUNT_CFG[a.type] ?? ACCOUNT_CFG.bank;
              const active = selId === a.id;
              return (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setSelId(a.id)}
                  activeOpacity={0.8}
                  style={[s.tab, active && { backgroundColor: cfg.color, borderColor: cfg.color }, { flexDirection: rtl ? 'row' : 'row-reverse' }]}
                >
                  <MaterialCommunityIcons name={cfg.icon} size={15} color={active ? '#fff' : cfg.color} />
                  <Text style={[s.tabText, active && { color: '#fff' }]}>{a.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Selected account hero ── */}
        {selected && (
          <View style={[s.heroCard, { borderColor: selCfg.color + '40', flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <View style={[s.heroIconWrap, { backgroundColor: selCfg.bg }]}>
              <MaterialCommunityIcons name={selCfg.icon} size={28} color={selCfg.color} />
            </View>
            <View style={s.heroInfo}>
              <Text style={s.heroName}>{selected.name}</Text>
              <Text style={[s.heroBalance, { color: (selBal ?? 0) >= 0 ? selCfg.color : Colors.danger }]}>
                {'SAR'}{' '}
                {(selBal ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[s.heroBadge, { backgroundColor: selCfg.bg }]}>
              <Text style={[s.heroBadgeText, { color: selCfg.color }]}>
                {txs?.length ?? 0} {t('accounts.transactions', { defaultValue: 'txns' })}
              </Text>
            </View>
          </View>
        )}

        {/* ── Transactions ── */}
        {selId && (
          <View style={s.txSection}>
            <Text style={s.txSectionTitle}>
              {t('accounts.transactionsFor', { name: selected?.name, defaultValue: `Transactions — ${selected?.name}` })}
            </Text>
            {txLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
            ) : txs?.length === 0 ? (
              <View style={s.empty}>
                <MaterialCommunityIcons name="swap-horizontal" size={40} color={Colors.textMuted} />
                <Text style={s.emptyText}>{t('accounts.noTransactions')}</Text>
              </View>
            ) : (
              <View style={s.txList}>
                {txs?.map((tx: any) => <TxRow key={tx.id} tx={tx} />)}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: Colors.bgPrimary },

  // Header
  header:       { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  headerLabel:  { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  headerRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  headerTitle:  { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  totalPill:    { alignItems: 'flex-end' },
  totalPillLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  totalPillVal: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },

  content:      { paddingBottom: 40 },

  // Account tabs
  tabsRow:      { paddingHorizontal: Spacing.xl, gap: 10, paddingBottom: Spacing.md },
  tab:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radii.full, backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: Colors.border },
  tabText:      { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  // Hero card
  heroCard:     { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.xl, backgroundColor: Colors.bgCard, borderRadius: Radii.xl, padding: Spacing.lg, gap: Spacing.md, borderWidth: 1.5, marginBottom: Spacing.lg },
  heroIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  heroInfo:     { flex: 1 },
  heroName:     { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  heroBalance:  { fontSize: 22, fontWeight: '800' },
  heroBadge:    { borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 4 },
  heroBadgeText:{ fontSize: 11, fontWeight: '700' },

  // Transactions
  txSection:       { paddingHorizontal: Spacing.xl },
  txSectionTitle:  { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.md, letterSpacing: 0.3 },
  txList:          { gap: 8 },
  txRow:           { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radii.lg, paddingHorizontal: Spacing.md, paddingVertical: 12, gap: 12 },
  txIconWrap:      { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  txMid:           { flex: 1 },
  txCat:           { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  txNote:          { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  txDate:          { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  txAmt:           { fontSize: 15, fontWeight: '800' },

  empty:           { alignItems: 'center', marginTop: 48, gap: 10 },
  emptyText:       { fontSize: 13, color: Colors.textMuted },
});
