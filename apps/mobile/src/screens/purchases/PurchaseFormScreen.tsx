import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { showAlert } from '../../lib/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { api } from '../../lib/api';
import { Colors, Radii, Spacing, Shadows } from '../../theme';

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

const ACCOUNT_ICONS: Record<string, string> = {
  safe:   'safe',
  bank:   'bank',
  credit: 'credit-card',
};

export function PurchaseFormScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [selectedTank, setSelectedTank]       = useState<any>(null);
  const [supplier, setSupplier]               = useState('');
  const [invoiceNumber, setInvoiceNumber]     = useState('');
  const [liters, setLiters]                   = useState('');
  const [pricePerLiter, setPricePerLiter]     = useState('');
  const [deliveredAt, setDeliveredAt]         = useState(() =>
    format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  );
  // paymentAmounts: { [accountId]: string }
  const [paymentAmounts, setPaymentAmounts]   = useState<Record<string, string>>({});

  const { data: tanks = [], isLoading: tanksLoading } = useQuery({
    queryKey: ['tanks'],
    queryFn: () => api.get('/tanks').then(r => r.data),
  });

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data),
  });

  const litersNum      = parseFloat(liters) || 0;
  const priceNum       = parseFloat(pricePerLiter) || 0;
  const totalCost      = litersNum * priceNum;
  const totalPaid      = Object.values(paymentAmounts).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const remaining      = totalCost - totalPaid;

  // Capacity check
  const availableSpace = selectedTank
    ? Number(selectedTank.capacityLiters) - Number(selectedTank.currentLevelLiters)
    : null;
  const overCapacity = availableSpace !== null && litersNum > availableSpace;

  const saveMutation = useMutation({
    mutationFn: (body: object) => api.post('/purchases', body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['tanks'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      navigation.goBack();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? t('common.error');
      showAlert({ title: t('common.error'), message: Array.isArray(msg) ? msg.join('\n') : msg, variant: 'error' });
    },
  });

  const handleSubmit = () => {
    if (!selectedTank) {
      showAlert({ title: t('common.error'), message: t('purchases.form.tank'), variant: 'error' });
      return;
    }
    if (!supplier.trim()) {
      showAlert({ title: t('common.error'), message: t('purchases.form.supplier'), variant: 'error' });
      return;
    }
    if (!litersNum || litersNum <= 0) {
      showAlert({ title: t('common.error'), message: t('purchases.liters'), variant: 'error' });
      return;
    }
    if (!priceNum || priceNum <= 0) {
      showAlert({ title: t('common.error'), message: t('purchases.pricePerLiter'), variant: 'error' });
      return;
    }
    if (overCapacity) {
      showAlert({
        title: t('common.error'),
        message: t('purchases.form.overCapacity', {
          n: (litersNum - availableSpace!).toFixed(2),
        }),
        variant: 'error',
      });
      return;
    }
    if (!deliveredAt.trim()) {
      showAlert({ title: t('common.error'), message: t('purchases.deliveredAt'), variant: 'error' });
      return;
    }

    const payments = Object.entries(paymentAmounts)
      .filter(([, v]) => parseFloat(v) > 0)
      .map(([accountId, v]) => ({ accountId, amount: parseFloat(v) }));

    saveMutation.mutate({
      tankId: selectedTank.id,
      supplierName: supplier.trim(),
      invoiceNumber: invoiceNumber.trim() || undefined,
      liters: litersNum,
      pricePerLiter: priceNum,
      deliveredAt: new Date(deliveredAt).toISOString(),
      payments,
    });
  };

  const activeTanks = (tanks as any[]).filter((tk: any) => tk.isActive);

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
          <Text style={s.headerLabel}>{t('purchases.addPurchase').toUpperCase()}</Text>
          <Text style={s.headerTitle}>{t('purchases.addPurchase')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Tank selector ── */}
        <Text style={s.label}>{t('purchases.form.tank')}</Text>
        {tanksLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : activeTanks.length === 0 ? (
          <Text style={s.emptyText}>{t('tanks.empty')}</Text>
        ) : (
          <View style={s.tankList}>
            {activeTanks.map((tank: any) => {
              const isSelected = selectedTank?.id === tank.id;
              const fuelColor = FUEL_COLORS[tank.fuelType] ?? Colors.primary;
              const pct = Math.round(
                (Number(tank.currentLevelLiters) / Number(tank.capacityLiters)) * 100,
              );
              const space = Number(tank.capacityLiters) - Number(tank.currentLevelLiters);
              return (
                <TouchableOpacity
                  key={tank.id}
                  onPress={() => setSelectedTank(tank)}
                  activeOpacity={0.8}
                  style={[
                    s.tankRow,
                    isSelected && { borderColor: fuelColor, backgroundColor: fuelColor + '0D' },
                    { flexDirection: rtl ? 'row' : 'row-reverse' },
                  ]}
                >
                  <View style={[s.fuelDot, { backgroundColor: fuelColor + '22' }]}>
                    <MaterialCommunityIcons name="gas-station" size={16} color={fuelColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.tankName, { textAlign: !rtl ? 'right' : 'left' }]} numberOfLines={1}>
                      {tank.name}
                    </Text>
                    <Text style={[s.fuelType, { color: fuelColor, textAlign: !rtl ? 'right' : 'left' }]}>
                      {t(FUEL_LABELS[tank.fuelType] ?? tank.fuelType)}
                    </Text>
                  </View>
                  <View style={s.tankMeta}>
                    <Text style={s.tankLevel}>{pct}%</Text>
                    <Text style={s.tankSpace}>
                      {t('purchases.form.availableSpace', { n: space.toFixed(0) })}
                    </Text>
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

        {/* Over-capacity warning */}
        {overCapacity && availableSpace !== null && (
          <View style={s.warningRow}>
            <MaterialCommunityIcons name="alert" size={14} color={Colors.danger} />
            <Text style={s.warningText}>
              {t('purchases.form.overCapacity', { n: (litersNum - availableSpace).toFixed(2) })}
            </Text>
          </View>
        )}

        {/* ── Supplier name ── */}
        <Text style={s.label}>{t('purchases.form.supplier')}</Text>
        <View style={s.inputWrap}>
          <MaterialCommunityIcons name="domain" size={18} color={Colors.textMuted} style={s.inputIcon} />
          <TextInput
            style={[s.input, { textAlign: rtl ? 'right' : 'left' }]}
            value={supplier}
            onChangeText={setSupplier}
            placeholder={t('purchases.form.supplierPlaceholder')}
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* ── Invoice # (optional) ── */}
        <Text style={s.label}>
          {t('purchases.form.invoice')}
          <Text style={s.optional}> ({t('common.optional')})</Text>
        </Text>
        <View style={s.inputWrap}>
          <MaterialCommunityIcons name="receipt" size={18} color={Colors.textMuted} style={s.inputIcon} />
          <TextInput
            style={[s.input, { textAlign: rtl ? 'right' : 'left' }]}
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
            placeholder={t('purchases.form.invoicePlaceholder')}
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* ── Liters ── */}
        <Text style={s.label}>{t('purchases.liters')}</Text>
        <View style={s.inputWrap}>
          <MaterialCommunityIcons name="water-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
          <TextInput
            style={[s.input, { textAlign: rtl ? 'right' : 'left' }]}
            value={liters}
            onChangeText={setLiters}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={s.inputSuffix}>{t('common.liters')}</Text>
        </View>

        {/* ── Price per liter ── */}
        <Text style={s.label}>{t('purchases.pricePerLiter')}</Text>
        <View style={s.inputWrap}>
          <MaterialCommunityIcons name="currency-usd" size={18} color={Colors.textMuted} style={s.inputIcon} />
          <TextInput
            style={[s.input, { textAlign: rtl ? 'right' : 'left' }]}
            value={pricePerLiter}
            onChangeText={setPricePerLiter}
            keyboardType="decimal-pad"
            placeholder="0.000"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={s.inputSuffix}>SAR/L</Text>
        </View>

        {/* ── Delivery date ── */}
        <Text style={s.label}>{t('purchases.form.deliveryDate')}</Text>
        <View style={s.inputWrap}>
          <MaterialCommunityIcons name="calendar-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
          <TextInput
            style={[s.input, { textAlign: rtl ? 'right' : 'left' }]}
            value={deliveredAt}
            onChangeText={setDeliveredAt}
            placeholder="YYYY-MM-DDTHH:mm"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />
        </View>

        {/* ── Total cost ── */}
        {totalCost > 0 && (
          <View style={[s.totalRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <Text style={s.totalLabel}>{t('purchases.form.totalCost')}</Text>
            <Text style={s.totalValue}>
              SAR{' '}
              {totalCost.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
        )}

        {/* ── Payments section ── */}
        {!accountsLoading && (accounts as any[]).length > 0 && totalCost > 0 && (
          <>
            <Text style={[s.label, { marginTop: Spacing.xl }]}>{t('common.payment')}</Text>

            {(accounts as any[]).map((acc: any) => {
              const icon = ACCOUNT_ICONS[acc.type] ?? 'bank';
              const amt = paymentAmounts[acc.id] ?? '';
              return (
                <View
                  key={acc.id}
                  style={[s.accountRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}
                >
                  <MaterialCommunityIcons name={icon} size={18} color={Colors.primary} style={s.accIcon} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.accName, { textAlign: rtl ? 'left' : 'right' }]}>{acc.name}</Text>
                    <Text style={[s.accBalance, { textAlign: rtl ? 'left' : 'right' }]}>
                      SAR {Number(acc.balance).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                  <TextInput
                    style={[s.amtInput, { textAlign: rtl ? 'right' : 'left' }]}
                    value={amt}
                    onChangeText={v => setPaymentAmounts(prev => ({ ...prev, [acc.id]: v }))}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              );
            })}

            {/* Payment summary */}
            {totalPaid > 0 && (
              <View style={[s.paymentSummary, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                <Text style={s.paidLabel}>{t('purchases.form.paid', { n: totalPaid.toFixed(2) })}</Text>
                <Text
                  style={[
                    s.remainingLabel,
                    { color: remaining > 0 ? Colors.warning : remaining < 0 ? Colors.danger : Colors.primary },
                  ]}
                >
                  {remaining > 0
                    ? t('purchases.form.remaining', { n: remaining.toFixed(2) })
                    : remaining < 0
                    ? t('purchases.form.overpaid', { n: Math.abs(remaining).toFixed(2) })
                    : t('purchases.form.fullyPaid')}
                </Text>
              </View>
            )}
          </>
        )}

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
              <Text style={s.submitText}>{t('purchases.logDelivery')}</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bgPrimary },
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
  optional:    { fontWeight: '400', color: Colors.textMuted },
  emptyText:   { color: Colors.textMuted, textAlign: 'center', marginVertical: 16 },

  // Tank list
  tankList:    { gap: 8 },
  tankRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.bgCard, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: 10, borderWidth: 1.5, borderColor: Colors.border },
  fuelDot:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tankName:    { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  fuelType:    { fontSize: 11, fontWeight: '700', marginTop: 1 },
  tankMeta:    { alignItems: 'flex-end', gap: 2 },
  tankLevel:   { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  tankSpace:   { fontSize: 10, color: Colors.textMuted },

  // Warning
  warningRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.dangerLight, borderRadius: Radii.sm, padding: Spacing.sm },
  warningText: { fontSize: 12, color: Colors.danger, flex: 1 },

  // Inputs
  inputWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md },
  inputIcon:   { marginEnd: 8 },
  input:       { flex: 1, fontSize: 16, color: Colors.textPrimary, paddingVertical: 14 },
  inputSuffix: { fontSize: 14, color: Colors.textMuted, marginStart: 8 },

  // Total
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: Spacing.md, marginTop: Spacing.sm },
  totalLabel:  { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  totalValue:  { fontSize: 20, fontWeight: '800', color: Colors.primary },

  // Accounts
  accountRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.bgCard, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 10, marginTop: 6 },
  accIcon:     { },
  accName:     { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  accBalance:  { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  amtInput:    { width: 90, fontSize: 15, fontWeight: '700', color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.sm, paddingHorizontal: 8, paddingVertical: 8, backgroundColor: Colors.bgPrimary },

  // Payment summary
  paymentSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingHorizontal: 4 },
  paidLabel:   { fontSize: 12, color: Colors.textSecondary },
  remainingLabel: { fontSize: 13, fontWeight: '700' },

  // Submit
  submitBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: 16, marginTop: Spacing.xl, ...Shadows.strong, shadowColor: Colors.primary, shadowOpacity: 0.35 },
  submitText:  { fontSize: 16, fontWeight: '700', color: '#fff' },
});
