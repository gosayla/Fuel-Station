import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format, formatDuration, intervalToDuration } from 'date-fns';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../../lib/api';
import { showAlert } from '../../lib/alert';
import { useAuthStore } from '../../store/auth.store';
import { Colors, Radii, Spacing, Shadows } from '../../theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmt(n: any) {
  return `SAR ${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function calcDuration(start: string, end?: string, ongoingLabel = 'Ongoing') {
  if (!end) return ongoingLabel;
  const d = intervalToDuration({ start: new Date(start), end: new Date(end) });
  return formatDuration(d, { format: ['hours', 'minutes'] }) || '<1 min';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { color: string; icon: string }> = {
  open:       { color: Colors.warning, icon: 'clock-outline'        },
  closed:     { color: Colors.navy,    icon: 'check-circle-outline'  },
  reconciled: { color: Colors.success, icon: 'check-all'             },
};

const PM_CFG: Record<string, { icon: string; color: string; bg: string }> = {
  cash:   { icon: 'cash',                   color: '#2E7D32',      bg: '#E8F5E9'        },
  card:   { icon: 'credit-card-outline',    color: Colors.navy,    bg: Colors.navyLight },
  credit: { icon: 'account-cash-outline',   color: '#6D4C41',      bg: '#EFEBE9'        },
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

function SectionHeading({
  title,
  icon,
  count,
}: {
  title: string;
  icon: string;
  count?: number;
}) {
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  return (
    <View style={[s.sectionRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
      <View style={s.sectionIconBg}>
        <MaterialCommunityIcons name={icon} size={15} color={Colors.primary} />
      </View>
      <Text style={s.sectionTitle}>{title.toUpperCase()}</Text>
      {count != null && (
        <View style={s.countBadge}>
          <Text style={s.countText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ShiftDetailScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const shift = route.params?.shift as any;
  const userRole = useAuthStore(s => s.user?.role);
  const canReconcile = userRole === 'owner' || userRole === 'manager' || userRole === 'accountant';

  // reconcileMutation removed — now navigates to CollectShiftScreen which calls POST /accounts/collect

  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ['shift-sales', shift?.id],
    queryFn: () => api.get(`/sales/shift/${shift.id}`).then((r) => r.data),
    enabled: !!shift?.id,
  });

  const { data: ps } = useQuery({
    queryKey: ['shift-payment-summary', shift?.id],
    queryFn: () => api.get(`/sales/shift/${shift.id}/summary`).then((r) => r.data),
    enabled: !!shift?.id,
  });

  if (!shift) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: Colors.textMuted }}>{t('shifts.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg = STATUS_CFG[shift.status] ?? STATUS_CFG.open;
  const disc = Number(shift.discrepancy ?? 0);
  const totalPay = ps
    ? Number(ps.cash || 0) + Number(ps.card || 0) + Number(ps.credit || 0)
    : Number(shift.totalRevenue || 0);

  const payMethods = [
    { key: 'cash',   label: t('common.cash'),   ...PM_CFG.cash   },
    { key: 'card',   label: t('common.card'),   ...PM_CFG.card   },
    { key: 'credit', label: t('common.credit'), ...PM_CFG.credit },
  ];

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Top bar ── */}
      <View style={[s.topBar, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name={rtl ? 'arrow-right' : 'arrow-left'} size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.topTitle}>{t('shifts.details')}</Text>
        <View style={[s.statusBadge, { backgroundColor: statusCfg.color + '18' }]}>
          <MaterialCommunityIcons name={statusCfg.icon} size={13} color={statusCfg.color} />
          <Text style={[s.statusText, { color: statusCfg.color }]}>
            {t(`shifts.status.${shift.status}`).toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* ── Hero (white card) ── */}
        <View style={s.heroCard}>
          <View style={[s.empRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <View style={s.empAvatar}>
              <Text style={s.empInitials}>
                {(shift.employeeName ?? shift.employeeId ?? '?')
                  .split(' ')
                  .slice(0, 2)
                  .map((w: string) => w[0]?.toUpperCase() ?? '')
                  .join('')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.empName, { textAlign: !rtl ? 'right' : 'left' }]}>{shift.employeeName ?? shift.employeeId}</Text>
              <Text style={[s.empTime, { textAlign: !rtl ? 'right' : 'left' }]}>
                {format(new Date(shift.startedAt), 'EEE, MMM d · hh:mm a')}
                {shift.closedAt
                  ? ` → ${format(new Date(shift.closedAt), 'hh:mm a')}`
                  : ` (${t('shifts.ongoing')})`}
              </Text>
            </View>
          </View>
          <View style={[s.durationRow, { flexDirection: !rtl ? 'row' : 'row-reverse' }]}>
            <View style={[s.durationBadge, { backgroundColor: Colors.primaryLight }]}>
              <MaterialCommunityIcons name="timer-outline" size={14} color={Colors.primary} />
              <Text style={s.durationText}>
                {calcDuration(shift.startedAt, shift.closedAt, t('shifts.ongoing'))}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.body}>
          {/* ── Summary tiles ── */}
          <SectionHeading title={t('shifts.revenue')} icon="chart-box-outline" />
          <View style={[s.tileRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <View style={[s.tile, { borderTopColor: Colors.primary }]}>
              <MaterialCommunityIcons name="cash-multiple" size={22} color={Colors.primary} />
              <Text style={s.tileVal}>{fmtAmt(shift.totalRevenue)}</Text>
              <Text style={s.tileLbl}>{t('shifts.revenue')}</Text>
            </View>
            <View style={[s.tile, { borderTopColor: Colors.navy }]}>
              <MaterialCommunityIcons name="gas-cylinder" size={22} color={Colors.navy} />
              <Text style={[s.tileVal, { color: Colors.navy }]}>
                {Number(shift.totalLitersSold || 0).toFixed(0)} {t('common.liters')}
              </Text>
              <Text style={s.tileLbl}>{t('shifts.litersSold')}</Text>
            </View>
            <View style={[s.tile, { borderTopColor: '#6D4C41' }]}>
              <MaterialCommunityIcons name="cash-register" size={22} color="#6D4C41" />
              <Text style={[s.tileVal, { color: '#6D4C41' }]}>{fmtAmt(shift.openingCash)}</Text>
              <Text style={s.tileLbl}>{t('shifts.openingCash')}</Text>
            </View>
          </View>

          {/* ── Reconciliation row ── */}
          {shift.status !== 'open' && shift.actualCash != null && (
            <View style={[s.card, s.reconcileCard, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
              <View style={s.reconcileCell}>
                <Text style={s.reconcileLbl}>{t('shifts.expectedCash')}</Text>
                <Text style={s.reconcileVal}>{fmtAmt(shift.expectedCash)}</Text>
              </View>
              <View style={s.reconcileDivider} />
              <View style={s.reconcileCell}>
                <Text style={s.reconcileLbl}>{t('shifts.closingCash')}</Text>
                <Text style={s.reconcileVal}>{fmtAmt(shift.actualCash)}</Text>
              </View>
              <View style={s.reconcileDivider} />
              <View style={s.reconcileCell}>
                <Text style={s.reconcileLbl}>{t('shifts.discrepancy')}</Text>
                <Text
                  style={[
                    s.reconcileVal,
                    { color: disc === 0 ? Colors.success : disc > 0 ? Colors.success : Colors.danger },
                  ]}
                >
                  {disc >= 0 ? '+' : ''}
                  {fmtAmt(disc)}
                </Text>
              </View>
            </View>
          )}

          {/* ── Payment breakdown ── */}
          <View style={{ marginTop: 22 }}>
            <SectionHeading title={t('shifts.salesBreakdown')} icon="chart-pie" />
            <View style={s.card}>
              {payMethods.map(({ key, label, icon, color, bg }, idx) => {
                const amt = ps ? Number(ps[key] || 0) : 0;
                const cnt = ps ? Number(ps[`${key}Count`] || 0) : 0;
                const pct = totalPay > 0 ? (amt / totalPay) * 100 : 0;
                return (
                  <View
                    key={key}
                    style={[s.pmRow, idx > 0 && { borderTopWidth: 1, borderTopColor: Colors.border }, { flexDirection: rtl ? 'row' : 'row-reverse' }]}
                  >
                    <View style={[s.pmIconBg, { backgroundColor: bg }]}>
                      <MaterialCommunityIcons name={icon} size={16} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={[s.pmLabelRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                        <Text style={s.pmLabel}>{label}</Text>
                        <Text style={[s.pmAmount, { color }]}>{fmtAmt(amt)}</Text>
                      </View>
                      <View style={[s.pmBarTrack, { transform: [{ scaleX: I18nManager.isRTL === rtl ? 1 : -1 }] }]}>
                        <View
                          style={[s.pmBarFill, { width: `${pct}%` as any, backgroundColor: color }]}
                        />
                      </View>
                      <Text style={s.pmMeta}>
                        {cnt} {t('sales.transactions').toLowerCase()} · {pct.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Sales records ── */}
          <View style={{ marginTop: 22 }}>
            <SectionHeading
              title={t('shifts.salesRecords')}
              icon="receipt"
              count={sales?.length ?? 0}
            />
            {salesLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
            ) : !sales?.length ? (
              <View style={s.emptyCard}>
                <MaterialCommunityIcons
                  name="receipt"
                  size={40}
                  color={Colors.textMuted}
                />
                <Text style={s.emptyText}>{t('shifts.noSales')}</Text>
              </View>
            ) : (
              <View style={s.card}>
                {sales.map((sale: any, i: number) => {
                  const pmCfg = PM_CFG[sale.paymentMethod] ?? PM_CFG.cash;
                  return (
                    <View
                      key={sale.id}
                      style={[s.saleRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.border }, { flexDirection: rtl ? 'row' : 'row-reverse' }]}
                    >
                      <View style={[s.saleIconBg, { backgroundColor: pmCfg.bg }]}>
                        <MaterialCommunityIcons name={pmCfg.icon} size={16} color={pmCfg.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.saleLiters, { textAlign: !rtl ? 'right' : 'left' }]}>
                          {Number(sale.liters).toFixed(1)} {t('common.liters')}
                        </Text>
                        <Text style={s.salePriceHint}>
                          {t('common.pricePerLiter')} SAR {Number(sale.pricePerLiter).toFixed(3)}
                        </Text>
                      </View>
                      <View style={s.saleRightCol}>
                        <Text style={s.saleTime}>
                          {format(new Date(sale.createdAt), 'hh:mm a')}
                        </Text>
                        <Text style={[s.saleAmt, { color: pmCfg.color }]}>
                          {fmtAmt(sale.totalAmount)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── Close Shift CTA (only when open) ── */}
      {shift.status === 'open' && (
        <View style={s.footer}>
          <TouchableOpacity
            style={s.closeBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ShiftClose', { shift })}
          >
            <MaterialCommunityIcons name="clock-end" size={18} color="#fff" />
            <Text style={s.closeBtnText}>{t('shifts.closeShift')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Reconcile CTA (closed + manager/owner/accountant only) ── */}
      {shift.status === 'closed' && canReconcile && (
        <View style={s.footer}>
          <TouchableOpacity
            style={s.reconcileBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CollectShift', { shift })}
          >
            <MaterialCommunityIcons name="check-all" size={18} color="#fff" />
            <Text style={s.reconcileBtnText}>{t('accounts.collectTitle')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bgPrimary },
  scroll: { paddingBottom: 48 },

  // Shift action footer
  footer:          { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, backgroundColor: Colors.bgPrimary },
  closeBtn:        { backgroundColor: Colors.danger, borderRadius: Radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, ...Shadows.card },
  closeBtnText:    { fontSize: 15, fontWeight: '700', color: '#fff' },
  reconcileBtn:    { backgroundColor: Colors.success, borderRadius: Radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, ...Shadows.card },
  reconcileBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
  },
  backBtn:    { padding: 4 },
  topTitle:   { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radii.full,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  // Hero (white)
  heroCard: {
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: 4,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    gap: 14,
  },
  empRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  empAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  empInitials: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  empName:     { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  empTime:     { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  durationRow: { flexDirection: 'row', alignItems: 'center' },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radii.full, paddingHorizontal: 12, paddingVertical: 6 },
  durationText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  body: { padding: Spacing.xl },

  // Section heading
  sectionRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
  sectionIconBg: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { flex: 1, fontSize: 11, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.8 },
  countBadge:   { backgroundColor: Colors.primaryLight, borderRadius: Radii.full, paddingHorizontal: 8, paddingVertical: 3 },
  countText:    { fontSize: 12, fontWeight: '700', color: Colors.primary },

  // Summary tiles
  tileRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tile: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radii.lg,
    padding: Spacing.md, alignItems: 'center', gap: 5, borderTopWidth: 3,
  },
  tileVal: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  tileLbl: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },

  // Card
  card: { backgroundColor: Colors.bgCard, borderRadius: Radii.lg, padding: Spacing.lg },

  // Reconcile
  reconcileCard:    { flexDirection: 'row', alignItems: 'center' },
  reconcileCell:    { flex: 1, alignItems: 'center' },
  reconcileDivider: { width: 1, height: 30, backgroundColor: Colors.border },
  reconcileLbl:     { fontSize: 10, color: Colors.textSecondary, marginBottom: 4 },
  reconcileVal:     { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  // Payment breakdown
  pmRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  pmIconBg:   { width: 38, height: 38, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  pmLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pmLabel:    { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  pmAmount:   { fontSize: 13, fontWeight: '700' },
  pmBarTrack: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  pmBarFill:  { height: '100%', borderRadius: 3 },
  pmMeta:     { fontSize: 10, color: Colors.textMuted },

  // Sales list
  emptyCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radii.lg,
    padding: Spacing.xl, alignItems: 'center', gap: 12,
  },
  emptyText:    { fontSize: 13, color: Colors.textMuted },
  saleRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  saleIconBg:   { width: 36, height: 36, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  saleRightCol: { gap: 4, alignItems: 'flex-end' },
  saleLiters:   { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  saleTime:     { fontSize: 11, color: Colors.textMuted },
  salePriceHint: { fontSize: 11, color: Colors.textSecondary },
  saleAmt:      { fontSize: 15, fontWeight: '800' },
});
