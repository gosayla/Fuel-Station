import React, { useCallback } from 'react';
import { View, Text, SafeAreaView, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format, formatDuration, intervalToDuration, type Locale } from 'date-fns';
import { ar, bn, hi, enUS } from 'date-fns/locale';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Colors, Typography, Radii, Spacing, Shadows } from '../../theme';

const STATUS_CFG_BASE: Record<string, { color: string; icon: string }> = {
  open:       { color: Colors.warning, icon: 'clock-outline'       },
  closed:     { color: Colors.navy,    icon: 'check-circle-outline' },
  reconciled: { color: Colors.success, icon: 'check-all'           },
};

const DATEFNS_LOCALE: Record<string, Locale> = { ar, bn, hi, ur: ar, en: enUS };

function dur(start: string, end?: string, ongoing = 'Ongoing', locale: Locale = enUS) {
  if (!end) return ongoing;
  const d = intervalToDuration({ start: new Date(start), end: new Date(end) });
  return formatDuration(d, { format: ['hours', 'minutes'], locale }) || '<1 min';
}

function ShiftCard({ shift, onPress }: { shift: any; onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const baseCfg = STATUS_CFG_BASE[shift.status] ?? STATUS_CFG_BASE.open;
  const cfg = { ...baseCfg, label: t(`shifts.status.${shift.status}`) };
  const fmt = (n: any) => {
    const amount = Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return rtl ? `${amount} ريال` : `SAR ${amount}`;
  };

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      {/* Row: avatar + name/time + status badge + chevron */}
      <View style={[s.empRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <View style={[s.avatar, { backgroundColor: baseCfg.color + '18' }]}>
          <MaterialCommunityIcons name="account" size={20} color={baseCfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.empName, { textAlign: !rtl ? 'right' : 'left' }]}>{shift.employeeName ?? shift.employeeId}</Text>
          <Text style={[s.time, { textAlign: !rtl ? 'right' : 'left' }]}>
            {format(new Date(shift.startedAt), 'MMM d, hh:mm a')}
            {shift.closedAt ? ` → ${format(new Date(shift.closedAt), 'hh:mm a')}` : ''}
          </Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: baseCfg.color + '18' }]}>
          <Text style={[s.statusText, { color: baseCfg.color }, { textAlign: !rtl ? 'right' : 'left' }]}>{cfg.label.toUpperCase()}</Text>
        </View>
        <MaterialCommunityIcons
          name={rtl ? 'chevron-left' : 'chevron-right'}
          size={18}
          color={Colors.textMuted}
          style={{ marginStart: !rtl ? 0 : 4, marginEnd: !rtl ? 4 : 0 }}
        />
      </View>

      <View style={s.sep} />

      {/* Stats row */}
      <View style={[s.statsRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <View style={s.stat}>
          <Text style={s.statVal}>{fmt(shift.totalRevenue)}</Text>
          <Text style={s.statLbl}>{t('shifts.revenue').toUpperCase()}</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statVal}>{Number(shift.totalLitersSold).toFixed(0)} {t('common.liters')}</Text>
          <Text style={s.statLbl}>{t('shifts.litersSold').toUpperCase()}</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statVal}>{dur(shift.startedAt, shift.closedAt, t('shifts.ongoing'), DATEFNS_LOCALE[i18n.language] ?? enUS)}</Text>
          <Text style={s.statLbl}>{t('shifts.duration').toUpperCase()}</Text>
        </View>
        {shift.discrepancy != null && (
          <View style={s.stat}>
            <Text style={[s.statVal, { color: Number(shift.discrepancy) !== 0 ? Colors.danger : Colors.success }]}>
              {Number(shift.discrepancy) >= 0 ? '+' : ''}{fmt(shift.discrepancy)}
            </Text>
            <Text style={s.statLbl}>{t('shifts.discrepancy').toUpperCase()}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function ActiveShiftBanner({ shift, onClose }: { shift: any; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const fmt = (n: any) => {
    const amount = Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return rtl ? `${amount} ريال` : `SAR ${amount}`;
  };
  const startTime = new Date(shift.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const startDate = new Date(shift.startedAt).toLocaleDateString([], { day: 'numeric', month: 'short' });

  return (
    <View style={s.activeBanner}>
      <View style={[s.activeTitleRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={s.pulsingDot} />
          <Text style={s.activeBannerTitle}>{t('shifts.activeShift').toUpperCase()}</Text>
        </View>
        <Text style={s.activeBannerTime}>{startDate} · {startTime}</Text>
      </View>

      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: Spacing.sm }} />

      <View style={s.activeBannerStats}>
        <View style={s.activeStat}>
          <Text style={s.activeStatVal}>{Number(shift.totalLitersSold ?? 0).toFixed(0)} {t('common.liters')}</Text>
          <Text style={s.activeStatLbl}>{t('shifts.litersSold').toUpperCase()}</Text>
        </View>
        <View style={s.activeStatDiv} />
        <View style={s.activeStat}>
          <Text style={s.activeStatVal}>{fmt(shift.totalRevenue)}</Text>
          <Text style={s.activeStatLbl}>{t('shifts.revenue').toUpperCase()}</Text>
        </View>
        <View style={s.activeStatDiv} />
        <View style={s.activeStat}>
          <Text style={s.activeStatVal}>{fmt(shift.cashRevenue)}</Text>
          <Text style={s.activeStatLbl}>{t('shifts.cashRevenue').toUpperCase()}</Text>
        </View>
      </View>

      <TouchableOpacity style={s.closeShiftBtn} onPress={onClose} activeOpacity={0.8}>
        <MaterialCommunityIcons name="clock-end" size={16} color="#fff" />
        <Text style={s.closeShiftBtnText}>{t('shifts.closeShift')}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function ShiftsScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const user = useAuthStore(s => s.user);
  const isEmployee = user?.role === 'employee';
  const endpoint = isEmployee ? '/shifts/my' : '/shifts';

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['shifts', isEmployee ? 'my' : 'all'],
    queryFn: () => api.get(endpoint).then(r => Array.isArray(r.data) ? r.data : []),
    refetchInterval: 30_000,
  });

  // Refetch immediately every time this screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const openCount = data?.filter((s: any) => s.status === 'open').length ?? 0;

  // Current user's active shift
  const myOpenShift = data?.find((s: any) =>
    s.status === 'open' && (isEmployee || s.employeeId === user?.id),
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={[s.header, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerLabel}>{t('nav.shifts').toUpperCase()}</Text>
          <Text style={s.headerTitle}>{t('shifts.title')}</Text>
        </View>
        {openCount > 0 && (
          <View style={s.openChip}>
            <View style={s.dot} />
            <Text style={s.openText}>{t('shifts.openCount', { n: openCount })}</Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.primary} />}
        >
          {/* Active shift banner */}
          {myOpenShift && (
            <ActiveShiftBanner
              shift={myOpenShift}
              onClose={() => navigation.navigate('ShiftClose', { shift: myOpenShift })}
            />
          )}

          {isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
          ) : data?.length === 0 ? (
            <View style={s.empty}>
              <MaterialCommunityIcons name="clock-outline" size={48} color={Colors.textMuted} />
              <Text style={s.emptyText}>{t('shifts.noShifts')}</Text>
            </View>
          ) : (
            data?.map((sh: any) => (
              <ShiftCard
                key={sh.id}
                shift={sh}
                onPress={() => navigation.navigate('ShiftDetail', { shift: sh })}
              />
            ))
          )}
        </ScrollView>

        {/* Start Shift FAB — only when no active shift for current user */}
        {!myOpenShift && (
          <TouchableOpacity
            style={[s.fab, rtl ? { end: 24 } : { start: 24 }]}
            onPress={() => navigation.navigate('ShiftStart')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="clock-plus-outline" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bgPrimary },
  header:      {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  openChip:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.warningLight, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 4, gap: 5 },
  dot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.warning },
  openText:    { fontSize: 11, fontWeight: '700', color: Colors.warning },
  list:        { padding: Spacing.xl, gap: 12, paddingBottom: 40 },
  card:        { backgroundColor: '#fff', borderRadius: Radii.lg, padding: Spacing.lg },
  empRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:      { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  empName:     { ...Typography.bodyMd },
  time:        { ...Typography.small, marginTop: 2 },
  statusBadge: { borderRadius: Radii.sm, paddingHorizontal: 8, paddingVertical: 4 },
  statusText:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  sep:         { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  statsRow:    { flexDirection: 'row' },
  stat:        { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  statVal:     { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  statLbl:     { fontSize: 9, color: Colors.textMuted, marginTop: 2, letterSpacing: 0.4, textAlign: 'center' },
  empty:       { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText:   { ...Typography.body, color: Colors.textMuted },

  // Active shift banner
  activeBanner:      { backgroundColor: Colors.primary, borderRadius: Radii.lg, padding: Spacing.lg, gap: 12 },
  activeTitleRow:    { alignItems: 'center', justifyContent: 'space-between' },
  pulsingDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  activeBannerTitle: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.8 },
  activeBannerTime:  { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  activeBannerStats: { flexDirection: 'row' },
  activeStat:        { flex: 1, alignItems: 'center' },
  activeStatVal:     { fontSize: 13, fontWeight: '700', color: '#fff' },
  activeStatLbl:     { fontSize: 9, color: 'rgba(255,255,255,0.65)', marginTop: 2, letterSpacing: 0.4 },
  activeStatDiv:     { width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  closeShiftBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: Radii.sm, paddingVertical: 10 },
  closeShiftBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
