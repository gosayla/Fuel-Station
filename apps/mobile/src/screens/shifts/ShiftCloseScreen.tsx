import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../../lib/api';
import { showAlert } from '../../lib/alert';
import { Colors, Typography, Radii, Spacing } from '../../theme';

function fmt(n: any) {
  return Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ShiftCloseScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const route = useRoute<any>();
  const shift = route.params?.shift;

  const openingCash   = Number(shift?.openingCash ?? 0);
  const cashRevenue   = Number(shift?.cashRevenue ?? 0);
  const cardRevenue   = Number(shift?.cardRevenue ?? 0);
  const creditRevenue = Number(shift?.creditRevenue ?? 0);
  const totalRevenue  = Number(shift?.totalRevenue ?? 0);
  const expectedCash  = openingCash + cashRevenue;

  const [actualCash, setActualCash] = useState(String(expectedCash.toFixed(2)));

  const actual     = parseFloat(actualCash) || 0;
  const discrepancy = actual - expectedCash;

  const mutation = useMutation({
    mutationFn: (body: any) => api.patch(`/shifts/${shift.id}/close`, body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift', shift.id] });
      navigation.goBack();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift', shift.id] });
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
    if (isNaN(actual) || actual < 0) {
      showAlert({ title: t('common.error'), message: t('common.invalidAmount'), variant: 'error' });
      return;
    }
    mutation.mutate({ actualCash: actual });
  };

  if (!shift) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.error}>{t('shifts.notFound')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={[s.header, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <MaterialCommunityIcons
            name={rtl ? 'arrow-right' : 'arrow-left'}
            size={24}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { textAlign: !rtl ? 'right' : 'left' }]}>{t('shifts.closeShift')}</Text>
          {shift.employeeName && (
            <Text style={[s.headerSub, { textAlign: !rtl ? 'right' : 'left' }]}>{shift.employeeName}</Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Shift Summary Card */}
        <View style={s.summaryCard}>
          <View style={[s.summaryRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <View style={s.dot} />
            <Text style={s.summaryTime}>
              {t('shifts.startedAt')}: {fmtDate(shift.startedAt)} · {fmtTime(shift.startedAt)}
            </Text>
          </View>

          <View style={s.sep} />

          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statVal}>{fmt(shift.totalLitersSold)}</Text>
              <Text style={s.statLbl}>{t('shifts.litersSold').toUpperCase()}</Text>
            </View>
            <View style={s.statDiv} />
            <View style={s.stat}>
              <Text style={s.statVal}>SAR {fmt(shift.totalRevenue)}</Text>
              <Text style={s.statLbl}>{t('shifts.revenue').toUpperCase()}</Text>
            </View>
            <View style={s.statDiv} />
            <View style={s.stat}>
              <Text style={s.statVal}>SAR {fmt(shift.cashRevenue)}</Text>
              <Text style={s.statLbl}>{t('shifts.cashRevenue').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Payment Breakdown Card */}
        <View style={s.breakdownCard}>
          <Text style={s.breakdownTitle}>{t('shifts.salesBreakdown').toUpperCase()}</Text>
          <View style={s.sep} />

          {[
            { key: 'cash',   label: t('common.cash'),   icon: 'cash',                 color: '#2E7D32', bg: '#E8F5E9', amount: cashRevenue   },
            { key: 'card',   label: t('common.card'),   icon: 'credit-card-outline',  color: '#1565C0', bg: '#E3F2FD', amount: cardRevenue   },
            { key: 'credit', label: t('common.credit'), icon: 'account-cash-outline', color: '#6D4C41', bg: '#EFEBE9', amount: creditRevenue },
          ].map(({ key, label, icon, color, bg, amount }, idx) => {
            const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
            return (
              <View key={key} style={[s.pmRow, idx > 0 && { borderTopWidth: 1, borderTopColor: '#F0F0F0' }, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
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

        {/* Cash Reconciliation Card */}
        <View style={s.cashCard}>
          <View style={[s.cashRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <Text style={s.cashLabel}>{t('shifts.openingCash')}</Text>
            <Text style={s.cashValue}>SAR {fmt(openingCash)}</Text>
          </View>
          <View style={[s.cashRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <Text style={s.cashLabel}>{t('shifts.cashRevenue')}</Text>
            <Text style={s.cashValue}>SAR {fmt(cashRevenue)}</Text>
          </View>
          <View style={s.sep} />
          <View style={[s.cashRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <Text style={[s.cashLabel, { fontWeight: '700' }]}>{t('shifts.expectedCash')}</Text>
            <Text style={[s.cashValue, { fontWeight: '700', color: Colors.textPrimary }]}>SAR {fmt(expectedCash)}</Text>
          </View>
        </View>

        {/* Actual Cash Input */}
        <View style={s.section}>
          <Text style={s.label}>{t('shifts.form.actualCash')}</Text>
          <Text style={s.hint}>{t('shifts.form.actualCashHint', { opening: fmt(openingCash), cash: fmt(cashRevenue) })}</Text>
          <View style={s.inputRow}>
            <Text style={s.currency}>SAR</Text>
            <TextInput
              style={[s.input, { textAlign: rtl ? 'right' : 'left' }]}
              keyboardType="decimal-pad"
              value={actualCash}
              onChangeText={setActualCash}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Live discrepancy */}
          {actualCash.length > 0 && (
            <View style={[s.discRow, { flexDirection: rtl ? 'row' : 'row-reverse', backgroundColor: discrepancy >= 0 ? Colors.successLight : Colors.dangerLight }]}>
              <MaterialCommunityIcons
                name={discrepancy >= 0 ? 'trending-up' : 'trending-down'}
                size={16}
                color={discrepancy >= 0 ? Colors.success : Colors.danger}
              />
              <Text style={[s.discText, { color: discrepancy >= 0 ? Colors.success : Colors.danger }]}>
                {t('shifts.discrepancy')}: {discrepancy >= 0 ? '+' : ''}SAR {fmt(Math.abs(discrepancy))}
              </Text>
            </View>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="clock-end" size={18} color="#fff" />
              <Text style={s.submitText}>{t('shifts.closing')}</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: Colors.bgPrimary },
  header:       {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    gap: 12,
  },
  backBtn:      { padding: 4 },
  headerTitle:  { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  headerSub:    { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  scroll:       { padding: Spacing.xl, gap: 16, paddingBottom: 60 },
  error:        { textAlign: 'center', marginTop: 60, color: Colors.textMuted },

  summaryCard:  { backgroundColor: '#fff', borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border ?? '#EBEBEB' },
  summaryRow:   { alignItems: 'center', gap: 8 },
  dot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  summaryTime:  { fontSize: 13, color: Colors.textMuted, flex: 1 },

  sep:          { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },

  statsRow:     { flexDirection: 'row' },
  stat:         { flex: 1, alignItems: 'center' },
  statVal:      { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  statLbl:      { fontSize: 9, color: Colors.textMuted, marginTop: 2, letterSpacing: 0.4 },
  statDiv:      { width: 1, backgroundColor: Colors.border },

  cashCard:     { backgroundColor: '#fff', borderRadius: Radii.lg, padding: Spacing.lg, gap: 8, borderWidth: 1, borderColor: Colors.border ?? '#EBEBEB' },
  cashRow:      { justifyContent: 'space-between', alignItems: 'center' },
  cashLabel:    { fontSize: 13, color: Colors.textMuted },
  cashValue:    { fontSize: 13, color: Colors.textSecondary },

  section:      { gap: 8 },
  label:        { fontSize: 12, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  hint:         { fontSize: 11, color: Colors.textMuted },
  inputRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border ?? '#EBEBEB' },
  currency:     { paddingHorizontal: 14, fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  input:        { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.textPrimary, paddingVertical: 14, paddingHorizontal: 4 },

  discRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radii.sm, paddingHorizontal: 10, paddingVertical: 6 },
  discText:     { fontSize: 13, fontWeight: '600' },

  breakdownCard:  { backgroundColor: '#fff', borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border ?? '#EBEBEB' },
  breakdownTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.6 },
  pmRow:          { paddingVertical: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pmIcon:         { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pmLabelRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  pmLabel:        { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  pmAmount:       { fontSize: 13, fontWeight: '700' },
  pmBarTrack:     { height: 4, backgroundColor: '#F0F0F0', borderRadius: 2, overflow: 'hidden' },
  pmBarFill:      { height: 4, borderRadius: 2 },
  pmPct:          { fontSize: 10, color: Colors.textMuted, marginTop: 3 },

  submitBtn:    { marginTop: 8, backgroundColor: Colors.danger, borderRadius: Radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  submitText:   { fontSize: 15, fontWeight: '700', color: '#fff' },
});
