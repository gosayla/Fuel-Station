import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { showAlert } from '../../lib/alert';
import { api } from '../../lib/api';
import { Colors, Typography, Radii, Spacing } from '../../theme';
import { useAuthStore } from '../../store/auth.store';

type PosItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type PosSale = {
  id: string;
  paymentMethod: 'cash' | 'card' | 'credit';
  totalAmount: number;
  totalItems: number;
  createdAt: string;
};

type PosSaleLine = {
  posItemId: string;
  quantity: number;
};

type Shift = {
  id: string;
  employeeName?: string;
  employeeId: string;
  status: string;
  startedAt: string;
};

type LineState = {
  itemId: string;
  quantity: string;
};

export function PosSaleFormScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const isManagerLike = role === 'owner' || role === 'manager' || role === 'accountant';

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'credit'>('cash');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [lines, setLines] = useState<LineState[]>([{ itemId: '', quantity: '' }]);

  const itemsQuery = useQuery({
    queryKey: ['pos-items'],
    queryFn: () => api.get('/pos/items').then((r) => r.data as PosItem[]),
  });

  const shiftsQuery = useQuery({
    queryKey: ['shifts', 'all'],
    queryFn: () => api.get('/shifts').then((r) => (Array.isArray(r.data) ? r.data : []) as Shift[]),
    enabled: isManagerLike,
  });

  const openShifts = useMemo(
    () => (shiftsQuery.data || []).filter((s) => s.status === 'open'),
    [shiftsQuery.data],
  );

  const itemsMap = useMemo(() => {
    const map = new Map<string, PosItem>();
    (itemsQuery.data || []).forEach((item) => map.set(item.id, item));
    return map;
  }, [itemsQuery.data]);

  const addLine = () => setLines((prev) => [...prev, { itemId: '', quantity: '' }]);
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));
  const updateLine = (index: number, patch: Partial<LineState>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const totals = useMemo(() => {
    let items = 0;
    let amount = 0;
    for (const line of lines) {
      const qty = Number(line.quantity || 0);
      const item = itemsMap.get(line.itemId);
      if (!item || qty <= 0) continue;
      items += qty;
      amount += qty * Number(item.unitPrice);
    }
    return { items, amount };
  }, [lines, itemsMap]);

  const mutation = useMutation({
    mutationFn: (payload: any) => api.post('/pos/sales', payload).then((r) => r.data),
    onSuccess: (result: any, variables: any) => {
      const savedSale: PosSale = result?.sale ?? result;
      const soldLines: PosSaleLine[] =
        result?.lines ??
        (variables?.lines || []).map((entry: any) => ({
          posItemId: entry.itemId,
          quantity: Number(entry.quantity),
        }));

      queryClient.setQueryData<PosSale[]>(['pos-sales'], (current) => [savedSale, ...(current || [])]);

      const soldByItemId = soldLines.reduce<Record<string, number>>((acc, line) => {
        const itemId = line.posItemId;
        acc[itemId] = (acc[itemId] || 0) + Number(line.quantity);
        return acc;
      }, {});

      const patchItems = (current: PosItem[] | undefined) =>
        (current || []).map((entry) => {
          const soldQty = soldByItemId[entry.id] || 0;
          if (!soldQty) return entry;
          return {
            ...entry,
            quantity: Math.max(0, Number(entry.quantity) - soldQty),
          };
        });

      queryClient.setQueryData<PosItem[]>(['pos-items'], patchItems);
      queryClient.setQueryData<PosItem[]>(['pos-items-all'], patchItems);

      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      showAlert({ title: t('common.save'), message: t('pos.saleRecorded'), variant: 'success' });
      navigation.goBack();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-sales'] });
      queryClient.invalidateQueries({ queryKey: ['pos-items'] });
      queryClient.invalidateQueries({ queryKey: ['pos-items-all'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      showAlert({
        title: t('common.error'),
        message: Array.isArray(msg) ? msg.join('\n') : msg || t('pos.saleRecordFailed'),
        variant: 'error',
      });
    },
  });

  const handleSubmit = () => {
    const normalizedLines = lines
      .map((line) => ({ itemId: line.itemId, quantity: Number(line.quantity) }))
      .filter((line) => line.itemId && line.quantity > 0);

    if (!normalizedLines.length) {
      showAlert({ title: t('common.error'), message: t('pos.atLeastOneLine'), variant: 'error' });
      return;
    }

    if (isManagerLike && openShifts.length > 1 && !selectedShiftId) {
      showAlert({ title: t('common.error'), message: t('pos.selectOpenShift'), variant: 'error' });
      return;
    }

    mutation.mutate({
      lines: normalizedLines,
      paymentMethod,
      ...(selectedShiftId ? { shiftId: selectedShiftId } : {}),
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={[s.header, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, rtl ? { marginLeft: 8, marginRight: 0 } : { marginRight: 8, marginLeft: 0 }]}>
          <MaterialCommunityIcons name={rtl ? 'arrow-right' : 'arrow-left'} size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerLabel, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.headerLabel')}</Text>
          <Text style={[s.headerTitle, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.newSale')}</Text>
        </View>
      </View>

      {(itemsQuery.isLoading || shiftsQuery.isLoading) && <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />}

      <ScrollView contentContainerStyle={s.content}>
        {isManagerLike && openShifts.length > 1 && (
          <View style={s.block}>
            <Text style={[s.label, { textAlign: rtl ? 'left' : 'right' }]}>{t('sales.shift')}</Text>
            {openShifts.map((shift) => {
              const active = selectedShiftId === shift.id;
              return (
                <TouchableOpacity
                  key={shift.id}
                  style={[s.shiftRow, active && s.shiftRowActive, { flexDirection: rtl ? 'row' : 'row-reverse' }]}
                  onPress={() => setSelectedShiftId(shift.id)}
                >
                  <View>
                    <Text style={[s.shiftTitle, { textAlign: rtl ? 'left' : 'right' }]}>{shift.employeeName || shift.employeeId}</Text>
                    <Text style={[s.shiftSub, { textAlign: rtl ? 'left' : 'right' }]}>{new Date(shift.startedAt).toLocaleTimeString()}</Text>
                  </View>
                  <MaterialCommunityIcons name={active ? 'check-circle' : 'circle-outline'} size={20} color={active ? Colors.primary : Colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={s.block}>
          <View style={[s.rowBetween, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <Text style={[s.label, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.items')}</Text>
            <TouchableOpacity onPress={addLine}>
              <Text style={s.actionText}>{t('pos.addLine')}</Text>
            </TouchableOpacity>
          </View>

          {lines.map((line, index) => {
            const selected = itemsMap.get(line.itemId);
            return (
              <View key={index} style={s.lineCard}>
                <Text style={[s.inputLabel, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.item')}</Text>
                <View style={s.selectWrap}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.itemChipsRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                    {(itemsQuery.data || []).map((item) => {
                      const active = line.itemId === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[s.itemChip, active && s.itemChipActive]}
                          onPress={() => updateLine(index, { itemId: item.id })}
                        >
                          <Text style={[s.itemChipText, active && s.itemChipTextActive, { textAlign: rtl ? 'left' : 'right' }]}>{item.name}</Text>
                          <Text style={[s.itemChipSub, active && s.itemChipSubActive, { textAlign: rtl ? 'left' : 'right' }]}>
                            SAR {Number(item.unitPrice).toFixed(2)} · {t('pos.qtyValue', { value: Number(item.quantity).toFixed(2) })}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <Text style={[s.inputLabel, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.quantity')}</Text>
                <TextInput
                  style={[s.input, { textAlign: rtl ? 'left' : 'right' }]}
                  keyboardType="decimal-pad"
                  value={line.quantity}
                  onChangeText={(text) => updateLine(index, { quantity: text })}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textMuted}
                />
                {selected && (
                  <Text style={[s.lineTotal, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.lineTotal')}: SAR {(Number(line.quantity || 0) * Number(selected.unitPrice)).toFixed(2)}</Text>
                )}
                {lines.length > 1 && (
                  <TouchableOpacity onPress={() => removeLine(index)} style={[s.removeBtn, { alignSelf: rtl ? 'flex-end' : 'flex-start' }]}>
                    <Text style={s.removeText}>{t('pos.removeLine')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        <View style={s.block}>
          <Text style={[s.label, { textAlign: rtl ? 'left' : 'right' }]}>{t('sales.paymentMethod')}</Text>
          <View style={[s.pmRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            {(['cash', 'card', 'credit'] as const).map((pm) => (
              <TouchableOpacity key={pm} style={[s.pmChip, paymentMethod === pm && s.pmChipActive]} onPress={() => setPaymentMethod(pm)}>
                <Text style={[s.pmText, paymentMethod === pm && s.pmTextActive]}>{t(`common.${pm}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.totalBox}>
          <Text style={[s.totalLabel, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.totalItems')}</Text>
          <Text style={[s.totalValue, { textAlign: rtl ? 'left' : 'right' }]}>{totals.items.toFixed(2)}</Text>
          <Text style={[s.totalLabel, { marginTop: 8, textAlign: rtl ? 'left' : 'right' }]}>{t('pos.totalAmount')}</Text>
          <Text style={[s.totalValue, { textAlign: rtl ? 'left' : 'right' }]}>SAR {totals.amount.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[s.submitBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          <Text style={s.submitText}>{mutation.isPending ? t('common.saving') : t('pos.recordSale')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  backBtn: { marginRight: 8, padding: 6 },
  headerLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 50, gap: 12 },
  block: { backgroundColor: '#fff', borderRadius: Radii.lg, padding: Spacing.lg },
  label: { ...Typography.bodyMd, fontWeight: '700', marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  actionText: { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  shiftRow: { padding: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shiftRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  shiftTitle: { ...Typography.bodyMd, fontWeight: '700' },
  shiftSub: { ...Typography.small },
  lineCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, padding: 10, marginTop: 8 },
  inputLabel: { ...Typography.smallBold, marginBottom: 6 },
  selectWrap: { marginBottom: 10 },
  itemChipsRow: { gap: 8, paddingRight: 10 },
  itemChip: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingVertical: 8, paddingHorizontal: 10, minWidth: 140, backgroundColor: Colors.bgCardAlt },
  itemChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  itemChipText: { ...Typography.smallBold, color: Colors.textPrimary },
  itemChipTextActive: { color: Colors.primaryDark },
  itemChipSub: { ...Typography.small, marginTop: 2 },
  itemChipSubActive: { color: Colors.primaryDark },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary },
  lineTotal: { ...Typography.small, marginTop: 6, color: Colors.textSecondary },
  removeBtn: { alignSelf: 'flex-start', marginTop: 8 },
  removeText: { color: Colors.danger, fontSize: 12, fontWeight: '700' },
  pmRow: { flexDirection: 'row', gap: 8 },
  pmChip: { flex: 1, paddingVertical: 10, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  pmChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  pmText: { ...Typography.smallBold, color: Colors.textSecondary },
  pmTextActive: { color: Colors.primaryDark },
  totalBox: { backgroundColor: '#fff', borderRadius: Radii.lg, padding: Spacing.lg },
  totalLabel: { ...Typography.small },
  totalValue: { ...Typography.h3, marginTop: 2 },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
