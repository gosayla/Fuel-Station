import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StatusBar,
  I18nManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { subDays, format, eachDayOfInterval } from 'date-fns';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../../lib/api';
import { Colors, Radii, Spacing, Shadows } from '../../theme';
import { useAuthStore } from '../../store/auth.store';
import { t } from 'i18next';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function fmtShort(n: number) {
  const num = Number(n) || 0;
  const abs = Math.abs(num);
  if (abs >= 1_000_000) return `SAR ${(num / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `SAR ${(num / 1_000).toFixed(1)}k`;
  return `SAR ${num.toFixed(0)}`;
}

function fmtFull(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0,
  }).format(n);
}

// ─── Header ───────────────────────────────────────────────────────────────────

function DashboardHeader({
  user,
  onAvatarPress,
}: {
  user: { name: string; role: string } | null;
  onAvatarPress: () => void;
}) {
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const dateStr = new Date().toLocaleDateString(i18n.language, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  return (
    <View style={sh.header}>
      <View style={[sh.headerRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <View style={{ flex: 1, alignItems: !rtl ? 'flex-end' : 'flex-start' }}>
          <Text style={sh.headerLabel}>{t('auth.welcome').toUpperCase()},</Text>
          <Text style={sh.headerName}>{user?.name?.split(' ')[0] ?? ''}</Text>
          <Text style={sh.headerDate}>{dateStr}</Text>
        </View>
        <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8} style={sh.avatar}>
          <Text style={sh.avatarText}>{getInitials(user?.name ?? '?')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  return (
    <View style={[sh.sectionRow, { flexDirection: rtl ? 'row' : 'row-reverse', justifyContent: 'space-between' }]}>
      <Text style={sh.sectionLabel}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={sh.sectionAction}>{action} ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── KPI Strip ───────────────────────────────────────────────────────────────

function KpiStrip({
  items,
}: {
  items: { label: string; value: string; icon: string; accent: string }[];
}) {
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  return (
    <View style={[sh.kpiStrip, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={sh.kpiDivider} />}
          <View style={sh.kpiCell}>
            <View style={[sh.kpiIconSm, { backgroundColor: item.accent + '18' }]}>
              <MaterialCommunityIcons name={item.icon} size={15} color={item.accent} />
            </View>
            <Text style={[sh.kpiValueSm, { color: item.accent }]}>{item.value}</Text>
            <Text style={sh.kpiLabelSm}>{item.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Weekly Bar Chart ─────────────────────────────────────────────────────────

function WeekBarChart({ values, labels, todayIdx }: { values: number[]; labels: string[]; todayIdx: number }) {
  const max = Math.max(...values, 1);
  const H = 80;
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  return (
    <View>
      <View style={{ flexDirection: rtl ? 'row' : 'row-reverse', alignItems: 'flex-end', height: H, gap: 5 }}>
        {values.map((v, i) => {
          const barH = Math.max((v / max) * H, v > 0 ? 6 : 3);
          const isToday = i === todayIdx;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: H }}>
              <View style={{
                width: '60%', height: barH, borderRadius: 6,
                backgroundColor: v === 0 ? '#EBEBEB' : isToday ? Colors.primary : Colors.primary + '40',
              }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: rtl ? 'row' : 'row-reverse', gap: 5, marginTop: 8 }}>
        {labels.map((lbl, i) => (
          <Text key={i} style={{
            flex: 1, textAlign: 'center', fontSize: 11,
            fontWeight: i === todayIdx ? '700' : '500',
            color: i === todayIdx ? Colors.primary : Colors.textMuted,
          }}>{lbl}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.max(0, Math.min(percent, 100));
  return (
    <View style={{ height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden', transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}>
      <View style={{ height: '100%', width: `${clamped}%`, backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}

// ─── Management Dashboard ─────────────────────────────────────────────────────

function ManagementDashboard() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const today = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => subDays(today, 6), [today]);

  const { data: kpis, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => api.get('/reports/dashboard').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: weeklyData } = useQuery({
    queryKey: ['dashboard-weekly', weekStart.toISOString()],
    queryFn: () =>
      api.get('/reports/sales', { params: { from: weekStart.toISOString(), to: today.toISOString() } })
        .then((r) => r.data),
    refetchInterval: 300_000,
  });

  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: weekStart, end: today });
    const byDayMap: Record<string, number> = {};
    (weeklyData?.byDay ?? []).forEach((d: any) => { byDayMap[d.date] = d.revenue; });
    return {
      values: days.map((d) => byDayMap[format(d, 'yyyy-MM-dd')] ?? 0),
      labels: days.map((d) => format(d, 'EEE').slice(0, 1).toUpperCase()),
      todayIdx: days.length - 1,
    };
  }, [weeklyData, weekStart, today]);

  const rev = kpis?.totalSalesToday ?? 0;
  const exp = kpis?.totalExpensesToday ?? 0;
  const prof = kpis?.netProfitToday ?? 0;
  const liters = kpis?.totalLitersSoldToday ?? 0;
  const profMarginPct = rev > 0 ? Math.round((prof / rev) * 100) : 0;
  const totalBal = (kpis?.safeBalance ?? 0) + (kpis?.bankBalance ?? 0);
  const L = isLoading;
  const marginColor = profMarginPct >= 20 ? Colors.primary : profMarginPct >= 10 ? Colors.warning : Colors.danger;

  return (
    <SafeAreaView style={sh.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgPrimary} translucent={false} />
      <ScrollView
        contentContainerStyle={sh.scrollContent}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.primary} colors={[Colors.primary]} />}
      >
        <DashboardHeader user={user} onAvatarPress={() => navigation.navigate('Profile')} />

        {/* ── Hero Revenue Card ── */}
        <View style={[sh.heroCard, { flexDirection: !rtl ? 'row' : 'row-reverse' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[sh.heroLabel, {textAlign: !rtl ? 'right' : 'left'}]}>{t('dashboard.todaySummary').toUpperCase()}</Text>
            <Text style={[sh.heroValue, {textAlign: !rtl ? 'right' : 'left'}]}>{L ? '—' : fmtShort(rev)}</Text>
            <Text style={[sh.heroSub, {textAlign: !rtl ? 'right' : 'left'}]}>
              {t('dashboard.netProfit')}: {L ? '—' : fmtShort(prof)} · {L ? '—' : `${Math.round(liters)}L`}
            </Text>
          </View>
          <View style={[sh.heroIconCircle, !rtl ? { marginStart: 12 } : { marginEnd: 12 }]}>
            <MaterialCommunityIcons name="cash-multiple" size={30} color="#fff" />
          </View>
        </View>

        <View style={sh.body}>
          {/* ── KPI Strip ── */}
          <SectionLabel title={t('dashboard.todaySummary').toUpperCase()} />
          <KpiStrip
            items={[
              { label: t('dashboard.revenue'),    value: L ? '…' : fmtShort(rev),               icon: 'cash-multiple',         accent: Colors.primary  },
              { label: t('dashboard.litersToday'), value: L ? '…' : `${Math.round(liters)}L`,   icon: 'gas-cylinder',          accent: Colors.navy     },
              { label: t('dashboard.netProfit'),  value: L ? '…' : fmtShort(prof),              icon: 'trending-up',           accent: '#2E7D32'        },
              { label: t('dashboard.expenses'),   value: L ? '…' : fmtShort(exp),               icon: 'receipt',               accent: Colors.danger   },
            ]}
          />

          {/* ── Weekly Revenue Chart ── */}
          <View style={sh.card}>
            <View style={[sh.cardHeader, { flexDirection: rtl ? 'row' : 'row-reverse', justifyContent: 'space-between' }]}>
              <Text style={sh.cardTitle}>{t('dashboard.weeklyRevenue').toUpperCase()}</Text>
              <View style={sh.revBadge}>
                <Text style={sh.revBadgeText}>{fmtShort(weeklyData?.totalRevenue ?? 0)}</Text>
              </View>
            </View>
            {chartData.values.every((v) => v === 0) ? (
              <View style={sh.emptyChart}>
                <MaterialCommunityIcons name="chart-timeline-variant-shimmer" size={32} color={Colors.textMuted} />
                <Text style={sh.emptyText}>{t('common.noData')}</Text>
              </View>
            ) : (
              <WeekBarChart values={chartData.values} labels={chartData.labels} todayIdx={chartData.todayIdx} />
            )}
          </View>

          {/* ── Profit Margin ── */}
          <View style={sh.card}>
            <View style={[sh.cardHeader, { flexDirection: rtl ? 'row' : 'row-reverse', justifyContent: 'space-between' }]}>
              <Text style={sh.cardTitle}>{t('dashboard.profitMargin').toUpperCase()}</Text>
              <Text style={[sh.marginPct, { color: marginColor }]}>{L ? '—' : `${profMarginPct}%`}</Text>
            </View>
            <ProgressBar percent={L ? 0 : profMarginPct} color={marginColor} />
            <Text style={sh.marginHint}>{t('dashboard.basedOnToday')}</Text>
          </View>

          {/* ── Account Balances ── */}
          <SectionLabel title={t('dashboard.accountBalances').toUpperCase()} />
          <View style={sh.card}>
            <View style={[sh.balRow, {flexDirection: rtl ? 'row' : 'row-reverse'}]}>
              <View style={[sh.balIconBg, !rtl ? { marginStart: 12 } : { marginEnd: 12 }, { backgroundColor: Colors.primaryLight }]}>
                <MaterialCommunityIcons name="safe-square-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={sh.balLabel}>{t('dashboard.safeCash')}</Text>
              <Text style={[sh.balAmt, { textAlign: rtl ? 'right' : 'left', color: Colors.primary }]}>{L ? '—' : fmtFull(kpis?.safeBalance ?? 0)}</Text>
            </View>
            <View style={sh.divider} />
            <View style={[sh.balRow, {flexDirection: rtl ? 'row' : 'row-reverse'}]}>
              <View style={[sh.balIconBg, !rtl ? { marginStart: 12 } : { marginEnd: 12 }, { backgroundColor: Colors.navyLight }]}>
                <MaterialCommunityIcons name="bank-outline" size={20} color={Colors.navy} />
              </View>
              <Text style={sh.balLabel}>{t('accounts.types.bank')}</Text>
              <Text style={[sh.balAmt, { textAlign: rtl ? 'right' : 'left', color: Colors.navy }]}>{L ? '—' : fmtFull(kpis?.bankBalance ?? 0)}</Text>
            </View>
            <View style={sh.divider} />
            <View style={[sh.balRow, {flexDirection: rtl ? 'row' : 'row-reverse'}]}>
              <View style={[sh.balIconBg, !rtl ? { marginStart: 12 } : { marginEnd: 12 }, { backgroundColor: '#F5F5F5' }]}>
                <MaterialCommunityIcons name="sigma" size={20} color={Colors.textSecondary} />
              </View>
              <Text style={[sh.balLabel, { fontWeight: '700', color: Colors.textPrimary }]}>{t('dashboard.totalBalance')}</Text>
              <Text style={[sh.balAmt, { textAlign: rtl ? 'right' : 'left', color: Colors.textPrimary, fontSize: 16, fontWeight: '800' }]}>{L ? '—' : fmtFull(totalBal)}</Text>
            </View>
          </View>

          {/* ── Alerts ── */}
          {!L && (kpis?.openShiftsCount > 0 || kpis?.lowTanksCount > 0) && (
            <View>
              <SectionLabel title={t('dashboard.alerts').toUpperCase()} />
              {kpis?.openShiftsCount > 0 && (
                <View style={[sh.alertCard, {flexDirection: rtl ? 'row' : 'row-reverse'}, rtl ? { borderStartWidth: 4, borderStartColor: Colors.warning } : { borderEndWidth: 4, borderEndColor: Colors.warning } ]}>
                  <View style={[sh.alertIconBg, { backgroundColor: Colors.warningLight }]}>
                    <MaterialCommunityIcons name="clock-alert-outline" size={18} color={Colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[sh.alertTitle, { color: Colors.warning }]}>{t('dashboard.openShifts', { count: kpis.openShiftsCount })}</Text>
                    <Text style={sh.alertSub}>{t('dashboard.pendingReconciliation')}</Text>
                  </View>
                </View>
              )}
              {kpis?.lowTanksCount > 0 && (
                <View style={[sh.alertCard, {flexDirection: rtl ? 'row' : 'row-reverse', marginTop: 10}, rtl ? { borderStartWidth: 4, borderStartColor: Colors.danger } : { borderEndWidth: 4, borderEndColor: Colors.danger } ]}>
                  <View style={[sh.alertIconBg, { backgroundColor: Colors.dangerLight }]}>
                    <MaterialCommunityIcons name="fuel" size={18} color={Colors.danger} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[sh.alertTitle, { color: Colors.danger }]}>{t('dashboard.lowTanks', { count: kpis.lowTanksCount })}</Text>
                    <Text style={sh.alertSub}>{t('dashboard.belowThreshold')}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Employee Dashboard ───────────────────────────────────────────────────────

function EmployeeDashboard() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  const { data: myShifts, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['my-shifts'],
    queryFn: () => api.get('/shifts/my').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const activeShift = useMemo(() => {
    if (!Array.isArray(myShifts) || myShifts.length === 0) return null;
    return myShifts.find((s: any) => s.status === 'open') ?? null;
  }, [myShifts]);

  const shiftDuration = useMemo(() => {
    if (!activeShift?.startedAt) return null;
    const ms = Date.now() - new Date(activeShift.startedAt).getTime();
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  }, [activeShift]);

  const shiftRevenue = activeShift?.totalRevenue ?? 0;
  const shiftLiters = activeShift?.totalLitersSold ?? 0;
  const openingCash = activeShift?.openingCash ?? 0;
  const recentShifts: any[] = useMemo(
    () => (Array.isArray(myShifts) ? myShifts.slice(0, 4) : []),
    [myShifts],
  );

  return (
    <SafeAreaView style={sh.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgPrimary} translucent={false} />
      <ScrollView
        contentContainerStyle={sh.scrollContent}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.primary} colors={[Colors.primary]} />}
      >
        <DashboardHeader user={user} onAvatarPress={() => navigation.navigate('Profile')} />

        {/* ── Active Shift Hero ── */}
        {!isLoading && activeShift && (
          <View style={sh.heroCard}>
            <View style={{ flex: 1 }}>
              <Text style={sh.heroLabel}>{t('dashboard.currentShift').toUpperCase()}</Text>
              <View style={sh.activeBadge}>
                <View style={sh.activeDot} />
                <Text style={sh.activeBadgeText}>{t('shifts.status.open').toUpperCase()}</Text>
              </View>
              <Text style={sh.heroSub}>
                {t('shifts.startedAt')}:{' '}
                {new Date(activeShift.startedAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {shiftDuration && (
              <View style={sh.durationPill}>
                <MaterialCommunityIcons name="timer-outline" size={14} color="#fff" />
                <Text style={sh.durationPillText}>{shiftDuration}</Text>
              </View>
            )}
          </View>
        )}

        <View style={sh.body}>
          {/* ── Current Shift ── */}
          <SectionLabel title={t('dashboard.currentShift').toUpperCase()} />
          {isLoading ? (
            <View style={[sh.card, sh.loadingCard]}>
              <Text style={sh.loadingDots}>…</Text>
            </View>
          ) : activeShift ? (
            <View style={sh.card}>
              <View style={sh.metricsStrip}>
                <View style={sh.metricCell}>
                  <MaterialCommunityIcons name="cash-multiple" size={22} color={Colors.primary} />
                  <Text style={sh.metricVal}>{fmtShort(shiftRevenue)}</Text>
                  <Text style={sh.metricLbl}>{t('dashboard.revenue')}</Text>
                </View>
                <View style={sh.metricDivider} />
                <View style={sh.metricCell}>
                  <MaterialCommunityIcons name="gas-cylinder" size={22} color={Colors.navy} />
                  <Text style={[sh.metricVal, { color: Colors.navy }]}>{Math.round(shiftLiters)}L</Text>
                  <Text style={sh.metricLbl}>{t('dashboard.litersToday')}</Text>
                </View>
                <View style={sh.metricDivider} />
                <View style={sh.metricCell}>
                  <MaterialCommunityIcons name="cash-register" size={22} color="#6D4C41" />
                  <Text style={[sh.metricVal, { color: '#6D4C41' }]}>{fmtShort(openingCash)}</Text>
                  <Text style={sh.metricLbl}>{t('shifts.openingCash')}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[sh.card, sh.noShiftCard]}>
              <MaterialCommunityIcons name="clock-remove-outline" size={44} color={Colors.textMuted} />
              <Text style={sh.noShiftText}>{t('dashboard.noActiveShift')}</Text>
            </View>
          )}

          {/* ── Quick Actions ── */}
          <View>
            <SectionLabel title={t('dashboard.quickActions').toUpperCase()} />
            <View style={sh.actionsRow}>
              <TouchableOpacity
                style={[sh.actionBtn, { backgroundColor: Colors.primary }]}
                onPress={() => navigation.navigate('SaleForm')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={22} color="#fff" />
                <Text style={sh.actionBtnText}>{t('sales.newSale')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[sh.actionBtn, { backgroundColor: Colors.navy }]}
                onPress={() => navigation.navigate('Shifts')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="clock-outline" size={22} color="#fff" />
                <Text style={sh.actionBtnText}>{t('nav.shifts')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Recent Shifts ── */}
          {recentShifts.length > 0 && (
            <View>
              <SectionLabel title={t('dashboard.recentShifts').toUpperCase()} />
              <View style={sh.card}>
                {recentShifts.map((shift: any, i: number) => {
                  const dotColor =
                    shift.status === 'open' ? Colors.primary
                    : shift.status === 'reconciled' ? Colors.success
                    : Colors.warning;
                  return (
                    <View key={shift.id} style={[sh.shiftRow, i > 0 && sh.shiftRowBorder]}>
                      <View style={[sh.shiftRowDot, { backgroundColor: dotColor }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={sh.shiftRowDate}>
                          {new Date(shift.startedAt).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Text>
                        <Text style={sh.shiftRowStatus}>
                          {t(`shifts.status.${shift.status}`)} · {fmtShort(shift.totalRevenue ?? 0)}
                        </Text>
                      </View>
                      <View style={sh.shiftRowRight}>
                        <MaterialCommunityIcons name="gas-cylinder" size={12} color={Colors.textMuted} />
                        <Text style={sh.shiftRowLiters}>{Math.round(shift.totalLitersSold ?? 0)}L</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'employee') return <EmployeeDashboard />;
  return <ManagementDashboard />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sh = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  scrollContent: { paddingBottom: 48 },
  body: { padding: Spacing.xl, gap: 16 },

  // White header
  header: {
    //backgroundColor: Colors.bgCard,
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 12 : 16,
    paddingBottom: Spacing.xl,
    //borderBottomWidth: 1,
    //borderBottomColor: Colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  headerName: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  headerDate: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginStart: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  // Teal hero card
  heroCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: 4,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.strong,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    elevation: 14,
  },
  heroLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 6 },
  heroValue: { fontSize: 36, fontWeight: '900', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  heroIconCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 4 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  activeBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  durationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: Radii.full, paddingHorizontal: 12, paddingVertical: 6,
  },
  durationPillText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Section label
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.8 },
  sectionAction: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // KPI grid
  // KPI horizontal strip
  kpiStrip:   { flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: Radii.lg, paddingVertical: Spacing.md },
  kpiCell:    { flex: 1, alignItems: 'center', gap: 4 },
  kpiDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 6 },
  kpiIconSm:  { width: 30, height: 30, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  kpiValueSm: { fontSize: 15, fontWeight: '800' },
  kpiLabelSm: { fontSize: 9, color: Colors.textSecondary, fontWeight: '500', textAlign: 'center', letterSpacing: 0.2 },

  // Card
  card: { backgroundColor: Colors.bgCard, borderRadius: Radii.lg, padding: Spacing.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.8 },
  revBadge: { backgroundColor: Colors.primaryLight, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 4 },
  revBadgeText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  emptyChart: { height: 80, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 12, color: Colors.textMuted },
  marginPct: { fontSize: 20, fontWeight: '800' },
  marginHint: { fontSize: 10, color: Colors.textMuted, marginTop: 8 },

  // Balance list rows
  balRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  balIconBg: { width: 36, height: 36, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  balLabel: { flex: 1, fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  balAmt: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Colors.border },

  // Alerts
  alertCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radii.lg,
    padding: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  alertIconBg: { width: 36, height: 36, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 14, fontWeight: '700' },
  alertSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  // Loading / no shift
  loadingCard: { height: 100, alignItems: 'center', justifyContent: 'center' },
  loadingDots: { fontSize: 28, color: Colors.textMuted },
  noShiftCard: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  noShiftText: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },

  // Metrics strip
  metricsStrip: { flexDirection: 'row' },
  metricCell: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 4 },
  metricDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  metricVal: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  metricLbl: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },

  // Quick actions
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: Radii.lg,
    ...Shadows.strong, shadowColor: Colors.primary, shadowOpacity: 0.35, elevation: 10,
  },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Recent shifts list
  shiftRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  shiftRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  shiftRowDot: { width: 9, height: 9, borderRadius: 5 },
  shiftRowDate: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  shiftRowStatus: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  shiftRowRight: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  shiftRowLiters: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
});
