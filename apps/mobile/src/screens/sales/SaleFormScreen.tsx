import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { showAlert } from '../../lib/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NetInfo from '@react-native-community/netinfo';
import { api } from '../../lib/api';
import { Colors, Typography, Radii, Spacing, Shadows } from '../../theme';
import { useAuthStore } from '../../store/auth.store';
import { useOfflineQueueStore } from '../../store/offline-queue.store';

type PaymentMethod = 'cash' | 'card' | 'credit';

const FUEL_LABELS: Record<string, string> = {
  petrol_91: 'tanks.petrol91',
  petrol_95: 'tanks.petrol95',
  diesel:    'tanks.diesel',
  premium:   'tanks.premium',
};

const FUEL_COLORS: Record<string, string> = {
  petrol_91: '#f59e0b',
  petrol_95: '#3b82f6',
  diesel:    '#6b7280',
  premium:   '#8b5cf6',
};

const PM_ICONS: Record<PaymentMethod, string> = {
  cash:   'cash',
  card:   'credit-card-outline',
  credit: 'account-cash-outline',
};

export function SaleFormScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const userRole = useAuthStore(s => s.user?.role);
  const isManager = userRole === 'manager' || userRole === 'owner';
  const addPending = useOfflineQueueStore(s => s.addPending);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable !== false));
    });
    NetInfo.fetch().then((state) => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable !== false));
    });
    return unsubscribe;
  }, []);

  const [selectedTank, setSelectedTank]       = useState<any>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [liters, setLiters]             = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const { data: tanks = [], isLoading: tanksLoading } = useQuery({
    queryKey: ['tanks'],
    queryFn: () => api.get('/tanks').then(r => r.data),
  });

  // Managers/owners: fetch open shifts so they can assign the sale to the right one
  const { data: allShifts = [] } = useQuery({
    queryKey: ['shifts', 'all'],
    queryFn: () => api.get('/shifts').then(r => Array.isArray(r.data) ? r.data : []),
    enabled: isManager,
  });
  const openShifts = (allShifts as any[]).filter((s: any) => s.status === 'open');

  // Auto-select when there is exactly one open shift
  useEffect(() => {
    if (isManager && openShifts.length === 1 && !selectedShiftId) {
      setSelectedShiftId(openShifts[0].id);
    }
  }, [openShifts.length]);

  // Auto-fill price when tank is selected
  useEffect(() => {
    if (selectedTank?.currentPrice) {
      setPricePerLiter(String(Number(selectedTank.currentPrice)));
    }
  }, [selectedTank]);

  const litersNum = parseFloat(liters) || 0;
  const priceNum  = parseFloat(pricePerLiter) || 0;
  const total     = litersNum * priceNum;

  const saveMutation = useMutation({
    mutationFn: (body: object) => api.post('/sales', body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      navigation.goBack();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? t('common.error');
      showAlert({ title: t('common.error'), message: Array.isArray(msg) ? msg.join('\n') : msg, variant: 'error' });
    },
  });

  const handleSubmit = () => {
    if (!selectedTank) {
      showAlert({ title: t('common.error'), message: t('sales.form.tank'), variant: 'error' });
      return;
    }
    if (isManager && openShifts.length > 1 && !selectedShiftId) {
      showAlert({ title: t('common.error'), message: t('common.selectShift'), variant: 'error' });
      return;
    }
    if (!litersNum || litersNum <= 0) {
      showAlert({ title: t('common.error'), message: t('sales.liters'), variant: 'error' });
      return;
    }
    if (!priceNum || priceNum <= 0) {
      showAlert({ title: t('common.error'), message: t('sales.pricePerLiter'), variant: 'error' });
      return;
    }
    const payload = {
      tankId: selectedTank.id,
      liters: litersNum,
      pricePerLiter: priceNum,
      paymentMethod,
      ...(selectedShiftId ? { shiftId: selectedShiftId } : {}),
    };

    if (!isOnline) {
      addPending(payload);
      showAlert({ title: t('common.savedOffline'), message: t('common.savedOfflineMsg'), variant: 'success' });
      navigation.goBack();
      return;
    }

    saveMutation.mutate(payload);
  };

  const activeTanks = (tanks as any[]).filter(t => t.isActive);

  return (
    <SafeAreaView style={s.safe}>
      {/* Offline banner */}
      {!isOnline && (
        <View style={s.offlineBanner}>
          <MaterialCommunityIcons name="wifi-off" size={16} color="#fff" />
          <Text style={s.offlineBannerText}>{t('common.offlineMode')}</Text>
        </View>
      )}
      {/* Header */}
      <View style={[s.header, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialCommunityIcons
            name={rtl ? 'arrow-right' : 'arrow-left'}
            size={24}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerLabel}>{t('sales.newSale').toUpperCase()}</Text>
          <Text style={s.headerTitle}>{t('sales.newSale')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Shift selector (managers/owners with multiple open shifts) ── */}
        {isManager && openShifts.length > 1 && (
          <>
            <Text style={s.label}>{t('common.selectShift')}</Text>
            <View style={s.tankList}>
              {openShifts.map((shift: any) => {
                const isSelected = selectedShiftId === shift.id;
                return (
                  <TouchableOpacity
                    key={shift.id}
                    onPress={() => setSelectedShiftId(shift.id)}
                    activeOpacity={0.8}
                    style={[s.tankRow, isSelected && { borderColor: Colors.primary, backgroundColor: Colors.primaryLight }, { flexDirection: rtl ? 'row' : 'row-reverse' }]}
                  >
                    <View style={[s.fuelDot, { backgroundColor: Colors.primaryLight }]}>
                      <MaterialCommunityIcons name="account" size={16} color={Colors.primary} />
                    </View>
                    <View style={s.tankInfo}>
                      <Text style={[s.tankName, { textAlign: !rtl ? 'right' : 'left' }]}>
                        {shift.employeeName ?? shift.employeeId}
                      </Text>
                      <Text style={[s.fuelType, { color: Colors.textMuted, textAlign: !rtl ? 'right' : 'left' }]}>
                        {new Date(shift.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {isSelected
                      ? <MaterialCommunityIcons name="check-circle" size={20} color={Colors.primary} style={{ marginStart: 6 }} />
                      : <MaterialCommunityIcons name="circle-outline" size={20} color={Colors.textMuted} style={{ marginStart: 6 }} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ── Tank selector ── */}
        <Text style={s.label}>{t('sales.form.tank')}</Text>
        {tanksLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : activeTanks.length === 0 ? (
          <Text style={s.empty}>{t('tanks.empty')}</Text>
        ) : (
          <View style={s.tankList}>
            {activeTanks.map((tank: any) => {
              const isSelected = selectedTank?.id === tank.id;
              const fuelColor = FUEL_COLORS[tank.fuelType] ?? Colors.primary;
              const pct = Math.round((Number(tank.currentLevelLiters) / Number(tank.capacityLiters)) * 100);
              return (
                <TouchableOpacity
                  key={tank.id}
                  onPress={() => setSelectedTank(tank)}
                  activeOpacity={0.8}
                  style={[s.tankRow, isSelected && { borderColor: fuelColor, backgroundColor: fuelColor + '0D' }, { flexDirection: rtl ? 'row' : 'row-reverse' }]}
                >
                  <View style={[s.fuelDot, { backgroundColor: fuelColor + '22' }]}>
                    <MaterialCommunityIcons name="gas-station" size={16} color={fuelColor} />
                  </View>
                  <View style={s.tankInfo}>
                    <Text style={[s.tankName, { textAlign: !rtl ? 'right' : 'left' }]} numberOfLines={1}>{tank.name}</Text>
                    <Text style={[s.fuelType, { color: fuelColor, textAlign: !rtl ? 'right' : 'left' }]}>{t(FUEL_LABELS[tank.fuelType] ?? tank.fuelType)}</Text>
                  </View>
                  <View style={s.tankMeta}>
                    <Text style={s.tankLevel}>{pct}%</Text>
                    <Text style={s.tankPrice}>SAR {Number(tank.currentPrice).toFixed(3)}/L</Text>
                  </View>
                  {isSelected
                    ? <MaterialCommunityIcons name="check-circle" size={20} color={fuelColor} style={{ marginStart: 6 }} />
                    : <MaterialCommunityIcons name="circle-outline" size={20} color={Colors.textMuted} style={{ marginStart: 6 }} />
                  }
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Liters ── */}
        <Text style={s.label}>{t('sales.liters')}</Text>
        <View style={s.inputWrap}>
          <TextInput
            style={[s.input, { textAlign: rtl ? 'right' : 'left' }]}
            value={liters}
            onChangeText={setLiters}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={s.inputSuffix}>L</Text>
        </View>

        {/* ── Price per litre ── */}
        <Text style={s.label}>{t('common.pricePerLiter')}</Text>
        <View style={s.inputWrap}>
          <TextInput
            style={[s.input, { textAlign: rtl ? 'right' : 'left' }]}
            value={pricePerLiter}
            onChangeText={setPricePerLiter}
            keyboardType="decimal-pad"
            placeholder="0.000"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={s.inputSuffix}>{t('common.currency')}/L</Text>
        </View>

        {/* ── Total ── */}
        {total > 0 && (
          <View style={[s.totalRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <Text style={s.totalLabel}>{t('common.total')}</Text>
            <Text style={s.totalValue}>
              {t('common.currency')}{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        )}

        {/* ── Payment method ── */}
        <Text style={s.label}>{t('sales.form.paymentMethod')}</Text>
        <View style={[s.pmRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
          {(['cash', 'card', 'credit'] as PaymentMethod[]).map(pm => {
            const active = paymentMethod === pm;
            return (
              <TouchableOpacity
                key={pm}
                onPress={() => setPaymentMethod(pm)}
                style={[s.pmChip, active && s.pmChipActive, { flexDirection: rtl ? 'row' : 'row-reverse' }]}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name={PM_ICONS[pm]} size={16} color={active ? '#fff' : Colors.textSecondary} />
                <Text style={[s.pmLabel, active && s.pmLabelActive]}>{t(`common.${pm}`)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[s.submitBtn, saveMutation.isPending && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={saveMutation.isPending}
          activeOpacity={0.85}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" />
              <Text style={s.submitText}>{t('sales.recordSale')}</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bgPrimary },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 6,
    gap: 6,
  },
  offlineBannerText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  header:      {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: 12,
  },
  headerLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  scroll:      { padding: Spacing.xl, gap: 8, paddingBottom: 48 },

  label:       { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.8, marginTop: Spacing.md, marginBottom: 6 },
  empty:       { color: Colors.textMuted, textAlign: 'center', marginVertical: 16 },

  // Tank list
  tankList:    { gap: 8 },
  tankRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.bgCard, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: 10, borderWidth: 1.5, borderColor: Colors.border },
  fuelDot:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tankInfo:    { flex: 1 },
  tankName:    { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  fuelType:    { fontSize: 11, fontWeight: '700', marginTop: 1 },
  tankMeta:    { alignItems: 'flex-end', gap: 2 },
  tankLevel:   { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  tankPrice:   { fontSize: 11, color: Colors.textMuted },

  // Inputs
  inputWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md },
  input:       { flex: 1, fontSize: 16, color: Colors.textPrimary, paddingVertical: 14, textAlign: 'auto' as any },
  inputSuffix: { fontSize: 14, color: Colors.textMuted, marginStart: 8 },

  // Total
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: Spacing.md, marginVertical: 4 },
  totalLabel:  { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  totalValue:  { fontSize: 20, fontWeight: '800', color: Colors.primary },

  // Payment chips
  pmRow:       { flexDirection: 'row', gap: 10 },
  pmChip:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: Radii.md, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  pmChipActive:{ backgroundColor: Colors.primary, borderColor: Colors.primary },
  pmLabel:     { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  pmLabelActive:{ color: '#fff' },

  // Submit
  submitBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: 16, marginTop: Spacing.xl, ...Shadows.strong, shadowColor: Colors.primary, shadowOpacity: 0.35 },
  submitText:  { fontSize: 16, fontWeight: '700', color: '#fff' },
});
