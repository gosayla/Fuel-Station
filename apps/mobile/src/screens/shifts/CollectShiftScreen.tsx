import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { api } from '../../lib/api';
import { showAlert } from '../../lib/alert';
import { Colors, Radii, Spacing, Shadows } from '../../theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: any) {
  return Number(n ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Account Picker ───────────────────────────────────────────────────────────

const ACCOUNT_TYPE_ICON: Record<string, string> = {
  safe:   'safe',
  bank:   'bank',
  credit: 'credit-card',
};

const ACCOUNT_TYPE_COLOR: Record<string, string> = {
  safe:   Colors.primary,
  bank:   Colors.navy,
  credit: Colors.warning,
};

function AccountPicker({
  label,
  placeholder,
  accounts,
  value,
  onChange,
  rtl,
}: {
  label: string;
  placeholder: string;
  accounts: any[];
  value: string | null;
  onChange: (id: string) => void;
  rtl: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = accounts.find((a: any) => a.id === value);

  return (
    <>
      <View style={ps.field}>
        <Text style={[ps.fieldLabel, { textAlign: rtl ? 'left' : 'right' }]}>{label}</Text>
        <TouchableOpacity
          style={[ps.picker, { flexDirection: rtl ? 'row' : 'row-reverse' }]}
          onPress={() => setOpen(true)}
          activeOpacity={0.7}
        >
          {selected ? (
            <>
              <MaterialCommunityIcons
                name={ACCOUNT_TYPE_ICON[selected.type] ?? 'bank'}
                size={16}
                color={ACCOUNT_TYPE_COLOR[selected.type] ?? Colors.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={[ps.pickerText, { textAlign: rtl ? 'left' : 'right' }]}>{selected.name}</Text>
              </View>
              <Text style={ps.pickerBalance}>SAR {fmt(selected.balance)}</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.textMuted} />
              <Text style={[ps.pickerPlaceholder, { flex: 1, textAlign: rtl ? 'left' : 'right' }]}>
                {placeholder}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={ps.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={ps.sheet}>
            <Text style={ps.sheetTitle}>{label}</Text>
            <FlatList
              data={accounts}
              keyExtractor={(a: any) => a.id}
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity
                  style={[
                    ps.sheetItem,
                    item.id === value && { backgroundColor: Colors.primaryLight },
                    { flexDirection: rtl ? 'row' : 'row-reverse' },
                  ]}
                  onPress={() => { onChange(item.id); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <View style={[ps.sheetIconBg, { backgroundColor: (ACCOUNT_TYPE_COLOR[item.type] ?? Colors.textMuted) + '18' }]}>
                    <MaterialCommunityIcons
                      name={ACCOUNT_TYPE_ICON[item.type] ?? 'bank'}
                      size={18}
                      color={ACCOUNT_TYPE_COLOR[item.type] ?? Colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[ps.sheetItemName, { textAlign: rtl ? 'left' : 'right' }]}>{item.name}</Text>
                    <Text style={[ps.sheetItemBal, { textAlign: rtl ? 'left' : 'right' }]}>SAR {fmt(item.balance)}</Text>
                  </View>
                  {item.id === value && (
                    <MaterialCommunityIcons name="check-circle" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function CollectShiftScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const route = useRoute<any>();
  const shift = route.params?.shift as any;

  // ── State ──
  const [cashReceived, setCashReceived] = useState('');
  const [cashAccountId, setCashAccountId] = useState<string | null>(null);
  const [bankAccountId, setBankAccountId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // ── Data ──
  const { data: ps, isLoading: psLoading } = useQuery({
    queryKey: ['shift-payment-summary', shift?.id],
    queryFn: () => api.get(`/sales/shift/${shift.id}/summary`).then((r) => r.data),
    enabled: !!shift?.id,
    retry: 1,
  });

  const { data: posPs, isLoading: posPsLoading } = useQuery({
    queryKey: ['shift-pos-payment-summary', shift?.id],
    queryFn: () => api.get(`/pos/sales/shift/${shift.id}/summary`).then((r) => r.data),
    enabled: !!shift?.id,
    retry: 1,
  });

  const { data: accounts, isLoading: acctLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then((r) => r.data),
  });

  // ── Derived values ──
  const hasSummaryData = !!ps || !!posPs;
  const expectedCash = hasSummaryData
    ? Number(ps?.cash ?? 0) + Number(posPs?.cash ?? 0)
    : Number(shift?.cashRevenue ?? 0);
  const cardAmount = hasSummaryData
    ? Number(ps?.card ?? 0) + Number(posPs?.card ?? 0)
    : Number(shift?.cardRevenue ?? 0);
  const creditAmount = hasSummaryData
    ? Number(ps?.credit ?? 0) + Number(posPs?.credit ?? 0)
    : Number(shift?.creditRevenue ?? 0);
  const totalRevenue = expectedCash + cardAmount + creditAmount;

  const received     = parseFloat(cashReceived) || 0;
  const discrepancy  = received - expectedCash;

  const safeAccounts   = (accounts ?? []).filter((a: any) => a.type === 'safe');
  const bankAccounts   = (accounts ?? []).filter((a: any) => a.type === 'bank');

  // ── Mutation ──
  const mutation = useMutation({
    mutationFn: (body: any) => api.post('/accounts/collect', body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      navigation.goBack();
      navigation.goBack(); // go back past ShiftDetail too
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (err: any) => {
      showAlert({
        title: t('common.error'),
        message: err.response?.data?.message || t('common.error'),
        variant: 'error',
      });
    },
  });

  const handleSubmit = () => {
    if (!cashAccountId) {
      showAlert({ title: t('common.error'), message: t('accounts.selectSafe'), variant: 'error' });
      return;
    }
    if (cashReceived === '' || isNaN(received) || received < 0) {
      showAlert({ title: t('common.error'), message: t('common.invalidAmount'), variant: 'error' });
      return;
    }
    mutation.mutate({
      shiftId:        shift.id,
      cashAccountId,
      bankAccountId:   cardAmount > 0 ? (bankAccountId ?? undefined) : undefined,
      amountReceived:  received,
      notes:           notes.trim() || undefined,
    });
  };

  const isLoading = acctLoading;

  if (!shift) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.error}>{t('shifts.notFound')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ── */}
      <View style={[s.header, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <MaterialCommunityIcons
            name={rtl ? 'arrow-right' : 'arrow-left'}
            size={24}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { textAlign: !rtl ? 'right' : 'left' }]}>
            {t('accounts.collectTitle')}
          </Text>
          {shift.employeeName && (
            <Text style={[s.headerSub, { textAlign: !rtl ? 'right' : 'left' }]}>
              {shift.employeeName} · {format(new Date(shift.startedAt), 'MMM d, hh:mm a')}
            </Text>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* ── Sales Breakdown ── */}
          <View style={s.card}>
            <Text style={[s.cardTitle, { textAlign: rtl ? 'left' : 'right' }]}>
              {t('shifts.salesBreakdown').toUpperCase()}
            </Text>
            <View style={s.sep} />

            {[
              { key: 'cash',   label: t('common.cash'),   icon: 'cash',                 color: '#2E7D32', bg: '#E8F5E9', amount: expectedCash },
              { key: 'card',   label: t('common.card'),   icon: 'credit-card-outline',  color: Colors.navy,            bg: Colors.navyLight, amount: cardAmount   },
              { key: 'credit', label: t('common.credit'), icon: 'account-cash-outline', color: '#6D4C41', bg: '#EFEBE9', amount: creditAmount  },
            ].map(({ key, label, icon, color, bg, amount }, idx) => {
              const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
              return (
                <View
                  key={key}
                  style={[
                    s.pmRow,
                    idx > 0 && { borderTopWidth: 1, borderTopColor: Colors.border ?? '#EBEBEB' },
                    { flexDirection: rtl ? 'row' : 'row-reverse' },
                  ]}
                >
                  <View style={[s.pmIcon, { backgroundColor: bg }]}>
                    <MaterialCommunityIcons name={icon as any} size={16} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={[s.pmLabelRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                      <Text style={s.pmLabel}>{label}</Text>
                      <Text style={[s.pmAmount, { color }]}>SAR {fmt(amount)}</Text>
                    </View>
                    <View style={s.pmBarTrack}>
                      <View style={[s.pmBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                    </View>
                    <Text style={s.pmPct}>{pct.toFixed(0)}%</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* ── Cash Collection ── */}
          <View style={s.card}>
            <Text style={[s.cardTitle, { textAlign: rtl ? 'left' : 'right' }]}>
              {t('accounts.cashToSafe').toUpperCase()}
            </Text>
            <View style={s.sep} />

            {/* Expected */}
            <View style={[s.infoRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
              <Text style={s.infoLabel}>{t('accounts.amountExpected')}</Text>
              <Text style={s.infoValue}>SAR {fmt(expectedCash)}</Text>
            </View>

            {/* Received input */}
            <View style={s.fieldWrap}>
              <Text style={[s.fieldLabel, { textAlign: rtl ? 'left' : 'right' }]}>
                {t('accounts.amountReceived')}
              </Text>
              <View style={[s.inputRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                <Text style={s.currency}>SAR</Text>
                <TextInput
                  style={[s.input, { textAlign: rtl ? 'right' : 'left' }]}
                  keyboardType="decimal-pad"
                  value={cashReceived}
                  onChangeText={setCashReceived}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            {/* Live discrepancy */}
            {cashReceived.length > 0 && (
              <View
                style={[
                  s.discRow,
                  { flexDirection: rtl ? 'row' : 'row-reverse', backgroundColor: discrepancy >= 0 ? Colors.successLight : Colors.dangerLight },
                ]}
              >
                <MaterialCommunityIcons
                  name={discrepancy >= 0 ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={discrepancy >= 0 ? Colors.success : Colors.danger}
                />
                <Text style={[s.discText, { color: discrepancy >= 0 ? Colors.success : Colors.danger }]}>
                  {discrepancy >= 0 ? t('accounts.surplus') : t('accounts.shortage')}:{' '}
                  {discrepancy >= 0 ? '+' : ''}SAR {fmt(discrepancy)}
                </Text>
              </View>
            )}
          </View>

          {/* ── Account Selection ── */}
          <View style={s.card}>
            <Text style={[s.cardTitle, { textAlign: rtl ? 'left' : 'right' }]}>
              {t('accounts.title').toUpperCase()}
            </Text>
            <View style={s.sep} />

            <AccountPicker
              label={t('accounts.cashToSafe')}
              placeholder={t('accounts.selectSafe')}
              accounts={safeAccounts}
              value={cashAccountId}
              onChange={setCashAccountId}
              rtl={rtl}
            />

            {cardAmount > 0 && (
              <AccountPicker
                label={t('accounts.cardToBank')}
                placeholder={t('accounts.selectBank')}
                accounts={bankAccounts}
                value={bankAccountId}
                onChange={setBankAccountId}
                rtl={rtl}
              />
            )}
            {cardAmount === 0 && (
              <View style={[s.infoRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                <Text style={s.infoLabel}>{t('accounts.cardToBank')}</Text>
                <Text style={s.noSalesBadge}>{t('accounts.noCardSales')}</Text>
              </View>
            )}

            {creditAmount > 0 && (
              <View style={[s.infoRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                <Text style={s.infoLabel}>{t('accounts.creditReceivableLabel', { defaultValue: 'Credit (Receivable)' })}</Text>
                <Text style={s.noSalesBadge}>{t('accounts.pendingCollection', { defaultValue: 'Pending collection' })}</Text>
              </View>
            )}
            {creditAmount === 0 && (
              <View style={[s.infoRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                <Text style={s.infoLabel}>{t('accounts.creditToCredit')}</Text>
                <Text style={s.noSalesBadge}>{t('accounts.noCreditSales')}</Text>
              </View>
            )}
          </View>

          {/* ── Notes ── */}
          <View style={s.card}>
            <Text style={[s.fieldLabel, { textAlign: rtl ? 'left' : 'right', marginBottom: 8 }]}>
              {t('accounts.notes')}
            </Text>
            <TextInput
              style={[s.notesInput, { textAlign: rtl ? 'right' : 'left' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('accounts.form.reasonPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[s.submitBtn, mutation.isPending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={mutation.isPending}
            activeOpacity={0.85}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="check-all" size={18} color="#fff" />
                <Text style={s.submitText}>{t('accounts.confirmCollection')}</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bgPrimary },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error:       { textAlign: 'center', marginTop: 60, color: Colors.textMuted },
  scroll:      { padding: Spacing.xl, gap: 16, paddingBottom: 60 },

  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border ?? '#EBEBEB',
  },
  backBtn:    { padding: 4 },
  headerTitle:{ fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  headerSub:  { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  card:       { backgroundColor: '#fff', borderRadius: Radii.lg, padding: Spacing.lg, ...Shadows.card },
  cardTitle:  { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.6 },
  sep:        { height: 1, backgroundColor: Colors.border ?? '#EBEBEB', marginVertical: Spacing.md },

  // Payment breakdown rows
  pmRow:      { paddingVertical: 10, gap: 12, alignItems: 'center' },
  pmIcon:     { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pmLabelRow: { alignItems: 'center', marginBottom: 4 },
  pmLabel:    { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  pmAmount:   { fontSize: 14, fontWeight: '700' },
  pmBarTrack: { height: 4, backgroundColor: Colors.border ?? '#EBEBEB', borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  pmBarFill:  { height: 4, borderRadius: 2 },
  pmPct:      { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  // Info rows
  infoRow:    { paddingVertical: 10, alignItems: 'center' },
  infoLabel:  { flex: 1, fontSize: 13, color: Colors.textMuted },
  infoValue:  { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  noSalesBadge: { fontSize: 12, color: Colors.textMuted, backgroundColor: Colors.bgPrimary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

  // Fields
  fieldWrap:   { marginTop: 12 },
  fieldLabel:  { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  inputRow:    { alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.border ?? '#EBEBEB', borderRadius: Radii.md, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: Colors.bgPrimary },
  currency:    { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  input:       { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.textPrimary, paddingVertical: 10 },
  notesInput:  { borderWidth: 1, borderColor: Colors.border ?? '#EBEBEB', borderRadius: Radii.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.bgPrimary, minHeight: 80 },

  // Discrepancy
  discRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: Radii.sm, marginTop: 10 },
  discText:    { fontSize: 13, fontWeight: '600' },

  // Submit
  submitBtn:   { backgroundColor: Colors.success, borderRadius: Radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, ...Shadows.card },
  submitText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── Picker Styles ────────────────────────────────────────────────────────────

const ps = StyleSheet.create({
  field:        { marginTop: 12 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  picker:       { alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.border ?? '#EBEBEB', borderRadius: Radii.md, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Colors.bgPrimary },
  pickerText:   { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  pickerBalance:{ fontSize: 12, color: Colors.textMuted },
  pickerPlaceholder: { fontSize: 14, color: Colors.textMuted },

  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: 40, maxHeight: '60%' },
  sheetTitle:   { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  sheetItem:    { paddingVertical: 14, alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.border ?? '#EBEBEB' },
  sheetIconBg:  { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sheetItemName:{ fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  sheetItemBal: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
