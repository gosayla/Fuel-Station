import React from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../lib/api';
import { Colors, Radii, Spacing, Shadows } from '../../theme';

const FUEL_COLORS: Record<string, string> = {
  petrol_91: '#f59e0b',
  petrol_95: '#3b82f6',
  diesel:    '#6b7280',
  premium:   '#8b5cf6',
};

const FUEL_LABELS: Record<string, string> = {
  petrol_91: 'tanks.petrol91',
  petrol_95: 'tanks.petrol95',
  diesel:    'tanks.diesel',
  premium:   'tanks.premium',
};

function PurchaseCard({ purchase, tanks }: { purchase: any; tanks: any[] }) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const tank = (tanks as any[]).find((tk: any) => tk.id === purchase.tankId);
  const fuelColor = FUEL_COLORS[tank?.fuelType] ?? Colors.primary;

  return (
    <View style={s.card}>
      {/* Top row: icon + supplier + cost badge */}
      <View style={[s.cardTop, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <View style={[s.iconWrap, { backgroundColor: fuelColor + '22' }]}>
          <MaterialCommunityIcons name="truck-delivery" size={20} color={fuelColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[s.supplierName, { textAlign: rtl ? 'left' : 'right' }]}
            numberOfLines={1}
          >
            {purchase.supplierName}
          </Text>
          {purchase.invoiceNumber ? (
            <Text style={[s.invoiceNum, { textAlign: rtl ? 'left' : 'right' }]}>
              #{purchase.invoiceNumber}
            </Text>
          ) : null}
        </View>
        <View style={[s.costBadge, { backgroundColor: Colors.primaryLight }]}>
          <Text style={s.costText}>
            SAR {Number(purchase.totalCost).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      </View>

      {/* Bottom row: fuel type + liters + date */}
      <View style={[s.cardBottom, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <View style={s.chip}>
          <MaterialCommunityIcons name="gas-station" size={12} color={fuelColor} />
          <Text style={[s.chipText, { color: fuelColor }]}>
            {tank ? t(FUEL_LABELS[tank.fuelType] ?? tank.fuelType) : '—'}
          </Text>
        </View>
        <View style={s.chip}>
          <MaterialCommunityIcons name="water-outline" size={12} color={Colors.textSecondary} />
          <Text style={s.chipText}>
            {Number(purchase.liters).toLocaleString('en-US', { maximumFractionDigits: 0 })}{' '}
            {t('common.liters')}
          </Text>
        </View>
        <Text style={s.dateText}>
          {format(new Date(purchase.deliveredAt), 'MMM d, yyyy')}
        </Text>
      </View>
    </View>
  );
}

export function PurchasesScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();

  const { data: purchases = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get('/purchases').then(r => r.data),
  });

  const { data: tanks = [] } = useQuery({
    queryKey: ['tanks'],
    queryFn: () => api.get('/tanks').then(r => r.data),
  });

  const totalCost   = (purchases as any[]).reduce((s, p) => s + Number(p.totalCost), 0);
  const totalLiters = (purchases as any[]).reduce((s, p) => s + Number(p.liters), 0);

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ── */}
      <View style={[s.header, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons
            name={rtl ? 'arrow-right' : 'arrow-left'}
            size={24}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerLabel}>{t('nav.purchases').toUpperCase()}</Text>
          <View style={[s.headerRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <Text style={s.headerTitle}>{t('purchases.title')}</Text>
            {(purchases as any[]).length > 0 && (
              <View style={s.countBadge}>
                <Text style={s.countText}>{(purchases as any[]).length}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Summary strip ── */}
      {!isLoading && (purchases as any[]).length > 0 && (
        <View style={[s.summaryRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
          <View style={s.summaryItem}>
            <Text style={s.summaryVal}>{(purchases as any[]).length}</Text>
            <Text style={s.summaryLbl}>{t('purchases.deliveries').toUpperCase()}</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryVal}>
              {totalLiters.toLocaleString('en-US', { maximumFractionDigits: 0 })} {t('common.liters')}
            </Text>
            <Text style={s.summaryLbl}>{t('purchases.received').toUpperCase()}</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryVal, { color: Colors.primary }]}>
              SAR {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={s.summaryLbl}>{t('purchases.cost').toUpperCase()}</Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.primary} />
        }
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : (purchases as any[]).length === 0 ? (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="truck-delivery-outline" size={64} color={Colors.textMuted} />
            <Text style={s.emptyTitle}>{t('purchases.empty')}</Text>
            <Text style={s.emptyHint}>{t('purchases.emptyHint')}</Text>
          </View>
        ) : (
          (purchases as any[]).map((p: any) => (
            <PurchaseCard key={p.id} purchase={p} tanks={tanks as any[]} />
          ))
        )}
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[s.fab, rtl ? { end: 24 } : { start: 24 }]}
        onPress={() => navigation.navigate('PurchaseForm')}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bgPrimary },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.md, gap: 12 },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  headerLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  headerRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 10 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  countBadge:  { backgroundColor: Colors.primaryLight, borderRadius: Radii.full, paddingHorizontal: 12, paddingVertical: 4 },
  countText:   { fontSize: 13, fontWeight: '700', color: Colors.primary },

  scroll:      { padding: Spacing.xl, gap: 12, paddingBottom: 100 },

  // Summary
  summaryRow:     { flexDirection: 'row', backgroundColor: Colors.bgCard, marginHorizontal: Spacing.xl, borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  summaryItem:    { flex: 1, alignItems: 'center', gap: 4 },
  summaryVal:     { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  summaryLbl:     { fontSize: 10, color: Colors.textMuted },
  summaryDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  // Card
  card:        { backgroundColor: Colors.bgCard, borderRadius: Radii.lg, padding: Spacing.lg, gap: 12 },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap:    { width: 42, height: 42, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  supplierName:{ fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  invoiceNum:  { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  costBadge:   { borderRadius: Radii.md, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  costText:    { fontSize: 13, fontWeight: '700', color: Colors.primary },

  cardBottom:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.bgPrimary, borderRadius: Radii.full, paddingHorizontal: 8, paddingVertical: 4 },
  chipText:    { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  dateText:    { fontSize: 11, color: Colors.textMuted, marginStart: 'auto' },

  // Empty
  emptyState:  { alignItems: 'center', marginTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  emptyHint:   { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  // FAB
  fab:         { position: 'absolute', bottom: 28, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.strong, shadowColor: Colors.primary, shadowOpacity: 0.4 },
});
