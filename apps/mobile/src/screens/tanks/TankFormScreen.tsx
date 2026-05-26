import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { showAlert } from '../../lib/alert';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../../lib/api';
import { Colors, Radii, Spacing, Shadows } from '../../theme';

type FuelType = 'petrol_91' | 'petrol_95' | 'diesel' | 'premium';
const FUEL_TYPES: FuelType[] = ['petrol_91', 'petrol_95', 'diesel', 'premium'];

const FUEL_COLORS: Record<FuelType, string> = {
  petrol_91: '#1565C0',
  petrol_95: '#2E7D32',
  diesel:    '#F57F17',
  premium:   '#6A1B9A',
};

export function TankFormScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const tankId: string | undefined = route.params?.tankId;
  const isEdit = !!tankId;
  const qc = useQueryClient();

  const [name, setName]                     = useState('');
  const [fuelType, setFuelType]             = useState<FuelType>('petrol_91');
  const [capacity, setCapacity]             = useState('');
  const [currentLevel, setCurrentLevel]     = useState('');
  const [price, setPrice]                   = useState('');
  const [lowThreshold, setLowThreshold]     = useState('');
  const [populated, setPopulated]           = useState(false);

  const { data: existing, isLoading: loadingTank } = useQuery({
    queryKey: ['tank', tankId],
    queryFn: () => api.get(`/tanks/${tankId}`).then(r => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing && !populated) {
      setName(existing.name ?? '');
      setFuelType(existing.fuelType ?? 'petrol_91');
      setCapacity(String(existing.capacityLiters ?? ''));
      setCurrentLevel(String(existing.currentLevelLiters ?? ''));
      setPrice(String(existing.currentPrice ?? ''));
      setLowThreshold(String(existing.lowLevelThreshold ?? ''));
      setPopulated(true);
    }
  }, [existing, populated]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const body: Record<string, any> = {
        name: name.trim(),
        fuelType,
        capacityLiters: Number(capacity),
      };
      if (price) body.currentPrice = Number(price);
      if (lowThreshold) body.lowLevelThreshold = Number(lowThreshold);
      if (isEdit && currentLevel !== '') body.currentLevelLiters = Number(currentLevel);
      return isEdit
        ? api.patch(`/tanks/${tankId}`, body)
        : api.post('/tanks', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tanks'] });
      if (isEdit) qc.invalidateQueries({ queryKey: ['tank', tankId] });
      navigation.goBack();
    },
    onError: (e: any) => {
      showAlert({ title: t('common.error'), message: e.response?.data?.message ?? t('common.errorGeneric'), variant: 'error' });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.patch(`/tanks/${tankId}`, { isActive: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tanks'] });
      navigation.goBack();
    },
    onError: (e: any) => {
      showAlert({ title: t('common.error'), message: e.response?.data?.message ?? t('common.errorGeneric'), variant: 'error' });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      showAlert({ title: t('common.error'), message: t('tanks.form.name') + ' is required', variant: 'error' });
      return;
    }
    const cap = Number(capacity);
    if (!capacity || isNaN(cap) || cap <= 0) {
      showAlert({ title: t('common.error'), message: t('tanks.form.capacity') + ' must be greater than 0', variant: 'error' });
      return;
    }
    if (isEdit && currentLevel !== '') {
      const lvl = Number(currentLevel);
      if (isNaN(lvl) || lvl < 0 || lvl > cap) {
        showAlert({ title: t('common.error'), message: `Current level must be between 0 and ${cap}`, variant: 'error' });
        return;
      }
    }
    saveMutation.mutate();
  };

  const handleDeactivate = () => {
    showAlert({
      title: t('tanks.editTank'),
      message: 'Deactivate this tank? It will be hidden from all screens.',
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        { text: 'Deactivate', style: 'destructive', onPress: () => deactivateMutation.mutate() },
      ],
    });
  };

  if (isEdit && loadingTank && !populated) {
    return (
      <SafeAreaView style={s.safe}>
        <Header title={t('tanks.editTank')} onBack={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: 80 }} size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const saving = saveMutation.isPending || deactivateMutation.isPending;

  return (
    <SafeAreaView style={s.safe}>
      <Header
        title={isEdit ? t('tanks.editTank') : t('tanks.addTank')}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Identity ────────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.fieldLabel}>{t('tanks.form.name')} *</Text>
          <View style={[s.inputWrap, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <MaterialCommunityIcons name="gas-station-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder={t('tanks.form.namePlaceholder')}
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={s.separator} />

          {/* Fuel type */}
          <Text style={s.fieldLabel}>{t('tanks.form.fuelType')}</Text>
          <View style={s.chipsRow}>
            {FUEL_TYPES.map(ft => {
              const active = fuelType === ft;
              const color = FUEL_COLORS[ft];
              return (
                <TouchableOpacity
                  key={ft}
                  style={[s.chip, { backgroundColor: active ? color : color + '18', borderColor: color }]}
                  onPress={() => setFuelType(ft)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, { color: active ? '#fff' : color }]}>
                    {t(`tanks.${ft.replace('_', '')}` as any) || ft}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Capacity & levels ──────────────────────── */}
        <View style={s.card}>
          <Text style={s.fieldLabel}>{t('tanks.form.capacity')} *</Text>
          <View style={[s.inputWrap, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <MaterialCommunityIcons name="database-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              value={capacity}
              onChangeText={setCapacity}
              placeholder="e.g. 20000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />
            <Text style={s.unit}>L</Text>
          </View>

          {isEdit && (
            <>
              <View style={s.separator} />
              <Text style={s.fieldLabel}>{t('tanks.form.currentLevel')}</Text>
              <View style={[s.inputWrap, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                <MaterialCommunityIcons name="gauge" size={18} color={Colors.textMuted} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  value={currentLevel}
                  onChangeText={setCurrentLevel}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                />
                <Text style={s.unit}>L</Text>
              </View>
            </>
          )}

          <View style={s.separator} />
          <Text style={s.fieldLabel}>{t('tanks.form.lowLevelAlert')}</Text>
          <View style={[s.inputWrap, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <MaterialCommunityIcons name="alert-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              value={lowThreshold}
              onChangeText={setLowThreshold}
              placeholder="e.g. 500"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />
            <Text style={s.unit}>L</Text>
          </View>
        </View>

        {/* ── Pricing ────────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.fieldLabel}>{t('tanks.form.sellingPrice')}</Text>
          <Text style={s.fieldHint}>{t('tanks.form.sellingPriceHint')}</Text>
          <View style={[s.inputWrap, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <MaterialCommunityIcons name="currency-usd" size={18} color={Colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              value={price}
              onChangeText={setPrice}
              placeholder="0.000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* ── Actions ────────────────────────────────── */}
        <TouchableOpacity
          style={[s.submitBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          {saving && !deactivateMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <MaterialCommunityIcons name="check" size={20} color="#fff" />
          )}
          <Text style={s.submitText}>
            {isEdit ? t('common.save') : t('tanks.addTank')}
          </Text>
        </TouchableOpacity>

        {isEdit && (
          <TouchableOpacity
            style={[s.deactivateBtn, (saving) && { opacity: 0.6 }]}
            onPress={handleDeactivate}
            activeOpacity={0.85}
            disabled={saving}
          >
            {deactivateMutation.isPending ? (
              <ActivityIndicator color={Colors.danger} size="small" />
            ) : (
              <MaterialCommunityIcons name="archive-off-outline" size={18} color={Colors.danger} />
            )}
            <Text style={s.deactivateText}>Deactivate Tank</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  return (
    <View style={[s.header, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
      <TouchableOpacity onPress={onBack} style={s.headerBtn} activeOpacity={0.7}>
        <MaterialCommunityIcons
          name={rtl ? 'arrow-right' : 'arrow-left'}
          size={22}
          color={Colors.textPrimary}
        />
      </TouchableOpacity>
      <Text style={s.headerTitle}>{title}</Text>
      <View style={s.headerBtn} />
    </View>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.bgPrimary },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  content:       { padding: Spacing.xl, gap: 16, paddingBottom: 60 },
  card:          { backgroundColor: Colors.bgCard, borderRadius: Radii.lg, padding: Spacing.lg, gap: 6 },
  fieldLabel:    { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.4, marginBottom: 2 },
  fieldHint:     { fontSize: 11, color: Colors.textMuted, marginBottom: 4 },
  inputWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgPrimary, borderRadius: Radii.md, paddingHorizontal: Spacing.sm, height: 46 },
  inputIcon:     { marginRight: 8 },
  input:         { flex: 1, fontSize: 15, color: Colors.textPrimary },
  unit:          { fontSize: 13, color: Colors.textMuted, marginLeft: 4 },
  separator:     { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  chipsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip:          { borderRadius: Radii.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1.5 },
  chipText:      { fontSize: 12, fontWeight: '700' },
  submitBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: 16, ...Shadows.strong, shadowColor: Colors.primary, shadowOpacity: 0.35 },
  submitText:    { fontSize: 16, fontWeight: '700', color: '#fff' },
  deactivateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.bgCard, borderRadius: Radii.lg, paddingVertical: 14, borderWidth: 1.5, borderColor: Colors.danger },
  deactivateText: { fontSize: 15, fontWeight: '600', color: Colors.danger },
});
