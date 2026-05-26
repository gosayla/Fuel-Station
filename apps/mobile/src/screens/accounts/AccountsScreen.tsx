import React, { useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { api } from '../../lib/api';
import { showAlert } from '../../lib/alert';
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
  const [collectOpen, setCollectOpen] = useState(false);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState<'cash' | 'card'>('cash');
  const [collectNotes, setCollectNotes] = useState('');
  const [collectAccountId, setCollectAccountId] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  const { data: creditSummary } = useQuery({
    queryKey: ['credit-summary'],
    queryFn: () => api.get('/accounts/credit-summary').then((r) => r.data),
  });

  const collectMutation = useMutation({
    mutationFn: (body: any) => api.post('/accounts/collect-credit', body).then((r) => r.data),
    onSuccess: () => {
      setCollectOpen(false);
      setCollectAmount('');
      setCollectNotes('');
      setCollectAccountId(null);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account-tx'] });
      queryClient.invalidateQueries({ queryKey: ['credit-summary'] });
    },
    onError: (err: any) => {
      showAlert({ title: t('common.error'), message: err?.response?.data?.message || t('common.error'), variant: 'error' });
    },
  });

  const selected = accounts?.find((a: any) => a.id === selId);
  const selCfg   = ACCOUNT_CFG[selected?.type] ?? ACCOUNT_CFG.bank;
  const selBal   = selected ? Number(selected.balance) : null;
  const totalBal = accounts?.reduce((sum: number, a: any) => sum + Number(a.balance), 0) ?? 0;
  const outstandingCredit = Number((creditSummary as any)?.outstanding ?? 0);
  const collectAccounts = (accounts ?? []).filter((a: any) => collectMethod === 'cash' ? a.type === 'safe' : a.type === 'bank');

  const submitCollectCredit = () => {
    const amount = Number(collectAmount || 0);
    if (!collectAccountId) {
      showAlert({ title: t('common.error'), message: t('common.selectAccount'), variant: 'error' });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      showAlert({ title: t('common.error'), message: t('common.invalidAmount'), variant: 'error' });
      return;
    }
    if (amount > outstandingCredit) {
      showAlert({ title: t('common.error'), message: `${t('accounts.maxAllowed', { defaultValue: 'Max allowed' })}: SAR ${outstandingCredit.toFixed(2)}`, variant: 'error' });
      return;
    }
    collectMutation.mutate({
      paymentMethod: collectMethod,
      toAccountId: collectAccountId,
      amount,
      notes: collectNotes.trim() || undefined,
    });
  };

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

        <View style={s.collectRow}>
          <View>
            <Text style={s.collectLabel}>{t('accounts.outstandingCredit', { defaultValue: 'Outstanding Credit' })}</Text>
            <Text style={s.collectValue}>SAR {outstandingCredit.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[s.collectBtn, outstandingCredit <= 0 && { opacity: 0.6 }]}
            onPress={() => setCollectOpen(true)}
            disabled={outstandingCredit <= 0}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="cash-check" size={16} color={Colors.bgPrimary} />
            <Text style={s.collectBtnText}>{t('accounts.collectCreditTitle', { defaultValue: 'Collect Credit' })}</Text>
          </TouchableOpacity>
        </View>

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

      <Modal visible={collectOpen} transparent animationType="fade" onRequestClose={() => setCollectOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{t('accounts.collectCreditTitle', { defaultValue: 'Collect Credit' })}</Text>
            <Text style={s.modalSub}>{t('accounts.outstandingCredit', { defaultValue: 'Outstanding Credit' })}: SAR {outstandingCredit.toFixed(2)}</Text>

            <Text style={s.modalLabel}>{t('accounts.collectionMethod', { defaultValue: 'Collection Method' })}</Text>
            <View style={s.methodRow}>
              <TouchableOpacity style={[s.methodBtn, collectMethod === 'cash' && s.methodBtnActive]} onPress={() => { setCollectMethod('cash'); setCollectAccountId(null); }}>
                <Text style={[s.methodBtnText, collectMethod === 'cash' && s.methodBtnTextActive]}>{t('common.cash')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.methodBtn, collectMethod === 'card' && s.methodBtnActive]} onPress={() => { setCollectMethod('card'); setCollectAccountId(null); }}>
                <Text style={[s.methodBtnText, collectMethod === 'card' && s.methodBtnTextActive]}>{t('common.card')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.modalLabel}>{t('common.selectAccount')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.accountPickRow}>
              {collectAccounts.map((a: any) => (
                <TouchableOpacity
                  key={a.id}
                  style={[s.accountPick, collectAccountId === a.id && s.accountPickActive]}
                  onPress={() => setCollectAccountId(a.id)}
                >
                  <Text style={[s.accountPickText, collectAccountId === a.id && s.accountPickTextActive]}>{a.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.modalLabel}>{t('common.amount')}</Text>
            <TextInput
              style={s.modalInput}
              keyboardType="decimal-pad"
              value={collectAmount}
              onChangeText={setCollectAmount}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={s.modalLabel}>{t('accounts.notes')} ({t('common.optional')})</Text>
            <TextInput
              style={s.modalInput}
              value={collectNotes}
              onChangeText={setCollectNotes}
              placeholder={t('accounts.form.reasonPlaceholder')}
              placeholderTextColor={Colors.textMuted}
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setCollectOpen(false)}>
                <Text style={s.modalCancelText}>{t('common.close')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalSubmit, collectMutation.isPending && { opacity: 0.7 }]} onPress={submitCollectCredit} disabled={collectMutation.isPending}>
                <Text style={s.modalSubmitText}>{t('accounts.collectCreditTitle', { defaultValue: 'Collect Credit' })}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  collectRow:   {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collectLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  collectValue: { fontSize: 18, color: Colors.warning, fontWeight: '800', marginTop: 2 },
  collectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.warning,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  collectBtnText: { color: Colors.bgPrimary, fontSize: 12, fontWeight: '800' },

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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  modalSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, marginBottom: 12 },
  modalLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Colors.bgPrimary,
  },
  methodBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  methodBtnText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  methodBtnTextActive: { color: Colors.primary },
  accountPickRow: { gap: 8 },
  accountPick: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.bgPrimary,
  },
  accountPickActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  accountPickText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  accountPickTextActive: { color: Colors.primary },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.bgPrimary,
    color: Colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    alignItems: 'center',
    paddingVertical: 11,
  },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 13 },
  modalSubmit: {
    flex: 1,
    borderRadius: Radii.md,
    backgroundColor: Colors.warning,
    alignItems: 'center',
    paddingVertical: 11,
  },
  modalSubmitText: { color: Colors.bgPrimary, fontWeight: '800', fontSize: 13 },
});
