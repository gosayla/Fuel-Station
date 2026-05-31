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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { showAlert } from '../../lib/alert';
import { api } from '../../lib/api';
import { Colors, Typography, Radii, Spacing } from '../../theme';

type PosItemCategory = 'engine_oil' | 'cleaning_tools' | 'accessories' | 'other';

type PosItem = {
  id: string;
  sku: string;
  name: string;
  category: PosItemCategory;
  quantity: number;
  reorderLevel: number;
  unitPrice: number;
  isActive: boolean;
};

const CATEGORIES: PosItemCategory[] = ['engine_oil', 'cleaning_tools', 'accessories', 'other'];

export function PosItemFormScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();

  const itemId = route.params?.itemId as string | undefined;
  const isEdit = !!itemId;

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PosItemCategory>('other');
  const [quantity, setQuantity] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('0');
  const [unitPrice, setUnitPrice] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['pos-items-all'],
    queryFn: () => api.get('/pos/items?includeInactive=true').then((r) => r.data as PosItem[]),
  });

  const item = useMemo(() => items.find((i) => i.id === itemId), [items, itemId]);

  React.useEffect(() => {
    if (!item) return;
    setSku(item.sku || '');
    setName(item.name || '');
    setCategory((item.category as PosItemCategory) || 'other');
    setQuantity(String(Number(item.quantity || 0)));
    setReorderLevel(String(Number(item.reorderLevel || 0)));
    setUnitPrice(String(Number(item.unitPrice || 0)));
  }, [item]);

  const mutation = useMutation({
    mutationFn: (payload: any) => {
      if (isEdit) return api.patch(`/pos/items/${itemId}`, payload).then((r) => r.data);
      return api.post('/pos/items', payload).then((r) => r.data);
    },
    onSuccess: (savedItem: PosItem) => {
      const upsertById = (list: PosItem[] | undefined) => {
        if (!list) return [savedItem];
        const index = list.findIndex((entry) => entry.id === savedItem.id);
        if (index === -1) return [...list, savedItem];
        const next = [...list];
        next[index] = { ...next[index], ...savedItem };
        return next;
      };

      queryClient.setQueryData<PosItem[]>(['pos-items-all'], (current) =>
        upsertById(current)?.sort((a, b) => a.name.localeCompare(b.name)),
      );

      queryClient.setQueryData<PosItem[]>(['pos-items'], (current) => {
        const merged = upsertById(current)?.filter((entry) => entry.isActive !== false);
        return merged?.sort((a, b) => a.name.localeCompare(b.name));
      });

      showAlert({ title: t('common.save'), message: t('pos.itemSaved'), variant: 'success' });
      navigation.goBack();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-items'] });
      queryClient.invalidateQueries({ queryKey: ['pos-items-all'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      showAlert({
        title: t('common.error'),
        message: Array.isArray(msg) ? msg.join('\n') : msg || t('pos.itemSaveFailed'),
        variant: 'error',
      });
    },
  });

  const handleSubmit = () => {
    const quantityNum = Number(quantity);
    const reorderLevelNum = Number(reorderLevel);
    const unitPriceNum = Number(unitPrice);

    if (!isEdit && !sku.trim()) {
      showAlert({ title: t('common.error'), message: t('pos.skuRequired'), variant: 'error' });
      return;
    }
    if (!name.trim()) {
      showAlert({ title: t('common.error'), message: t('pos.nameRequired'), variant: 'error' });
      return;
    }
    if (!Number.isFinite(quantityNum) || quantityNum < 0) {
      showAlert({ title: t('common.error'), message: t('pos.invalidQuantity'), variant: 'error' });
      return;
    }
    if (!Number.isFinite(reorderLevelNum) || reorderLevelNum < 0) {
      showAlert({ title: t('common.error'), message: t('pos.invalidReorderLevel'), variant: 'error' });
      return;
    }
    if (!Number.isFinite(unitPriceNum) || unitPriceNum <= 0) {
      showAlert({ title: t('common.error'), message: t('pos.invalidUnitPrice'), variant: 'error' });
      return;
    }

    const payload = {
      name: name.trim(),
      category,
      quantity: quantityNum,
      reorderLevel: reorderLevelNum,
      unitPrice: unitPriceNum,
    };

    mutation.mutate(isEdit ? payload : { ...payload, sku: sku.trim() });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={[s.header, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, rtl ? { marginLeft: 8, marginRight: 0 } : { marginRight: 8, marginLeft: 0 }]}>
          <MaterialCommunityIcons name={rtl ? 'arrow-right' : 'arrow-left'} size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerLabel, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.headerLabel')}</Text>
          <Text style={[s.headerTitle, { textAlign: rtl ? 'left' : 'right' }]}>{isEdit ? t('pos.editItem') : t('pos.addItem')}</Text>
        </View>
      </View>

      {isEdit && isLoading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 30 }} />}

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.block}>
          <Text style={[s.label, { textAlign: rtl ? 'left' : 'right' }]}>{t('pos.sku')}</Text>
          <TextInput
            style={[s.input, { textAlign: rtl ? 'left' : 'right' }]}
            value={sku}
            onChangeText={setSku}
            placeholder={t('pos.skuPlaceholder')}
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
          />

          <Text style={[s.label, { marginTop: 10, textAlign: rtl ? 'left' : 'right' }]}>{t('pos.name')}</Text>
          <TextInput
            style={[s.input, { textAlign: rtl ? 'left' : 'right' }]}
            value={name}
            onChangeText={setName}
            placeholder={t('pos.namePlaceholder')}
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={[s.label, { marginTop: 10, textAlign: rtl ? 'left' : 'right' }]}>{t('pos.category')}</Text>
          <View style={[s.wrapRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            {CATEGORIES.map((itemCategory) => {
              const active = category === itemCategory;
              return (
                <TouchableOpacity
                  key={itemCategory}
                  style={[s.smallChip, active && s.smallChipActive]}
                  onPress={() => setCategory(itemCategory)}
                >
                  <Text style={[s.smallChipText, active && s.smallChipTextActive, { textAlign: rtl ? 'left' : 'right' }]}>
                    {t(`pos.categories.${itemCategory}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[s.label, { marginTop: 10, textAlign: rtl ? 'left' : 'right' }]}>{t('pos.initialQuantity')}</Text>
          <TextInput
            style={[s.input, { textAlign: rtl ? 'left' : 'right' }]}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={[s.label, { marginTop: 10, textAlign: rtl ? 'left' : 'right' }]}>{t('pos.reorderLevel')}</Text>
          <TextInput
            style={[s.input, { textAlign: rtl ? 'left' : 'right' }]}
            value={reorderLevel}
            onChangeText={setReorderLevel}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={[s.label, { marginTop: 10, textAlign: rtl ? 'left' : 'right' }]}>{t('pos.unitPrice')}</Text>
          <TextInput
            style={[s.input, { textAlign: rtl ? 'left' : 'right' }]}
            value={unitPrice}
            onChangeText={setUnitPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <TouchableOpacity
          style={[s.submitBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          <Text style={s.submitText}>{mutation.isPending ? t('common.saving') : t('common.save')}</Text>
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
  label: { ...Typography.bodyMd, fontWeight: '700', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.bgCardAlt,
  },
  smallChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  smallChipText: { ...Typography.small, fontWeight: '600', color: Colors.textSecondary },
  smallChipTextActive: { color: Colors.primaryDark },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
