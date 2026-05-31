import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { Plus, Droplets, Edit2, X, AlertTriangle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

interface Tank {
  id: string;
  name: string;
  fuelType: 'petrol_91' | 'petrol_95' | 'diesel' | 'premium';
  capacityLiters: number;
  currentLevelLiters: number;
  currentPrice: number;
  lowLevelThreshold: number;
  isActive: boolean;
}

const tankSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  fuelType: z.enum(['petrol_91', 'petrol_95', 'diesel', 'premium']),
  capacityLiters: z.coerce.number().positive('Must be > 0'),
  currentLevelLiters: z.coerce.number().min(0),
  currentPrice: z.coerce.number().min(0),
  lowLevelThreshold: z.coerce.number().min(0),
});
type TankForm = z.infer<typeof tankSchema>;

const FUEL_LABELS: Record<string, string> = {
  petrol_91: '91', petrol_95: '95', diesel: 'Diesel', premium: 'Premium',
};
const FUEL_COLORS: Record<string, string> = {
  petrol_91: 'bg-blue-500', petrol_95: 'bg-primary', diesel: 'bg-warning', premium: 'bg-teal',
};
const FUEL_TEXT: Record<string, string> = {
  petrol_91: 'text-blue-400', petrol_95: 'text-primary', diesel: 'text-warning', premium: 'text-teal',
};

function LevelBar({ current, capacity, threshold }: { current: number; capacity: number; threshold: number }) {
  const { t } = useTranslation();
  const pct = Math.min((current / capacity) * 100, 100);
  const isLow = Number(current) <= Number(threshold);
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-text-secondary mb-1.5">
        <span>{current.toLocaleString()} L</span>
        <span>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 bg-bg-secondary rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', isLow ? 'bg-danger' : 'bg-teal')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span className={clsx('font-medium', isLow ? 'text-danger' : 'text-text-muted')}>
          {isLow ? t('tanks.lowLevel') : t('tanks.normal')}
        </span>
        <span className="text-text-muted">{t('tanks.capacityPrefix')} {capacity.toLocaleString()} L</span>
      </div>
    </div>
  );
}

function TankModal({ tank, onClose }: { tank?: Tank; onClose: () => void }) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm<TankForm>({
    resolver: zodResolver(tankSchema),
    defaultValues: tank
      ? { name: tank.name, fuelType: tank.fuelType, capacityLiters: tank.capacityLiters, currentLevelLiters: tank.currentLevelLiters, currentPrice: Number(tank.currentPrice) || 0, lowLevelThreshold: tank.lowLevelThreshold }
      : { fuelType: 'petrol_91', lowLevelThreshold: 500, currentPrice: 0 },
  });

  const mutation = useMutation({
    mutationFn: (data: TankForm) =>
      tank ? api.patch(`/tanks/${tank.id}`, data) : api.post('/tanks', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tanks'] }); onClose(); },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tanks'] });
      if (tank?.id) qc.invalidateQueries({ queryKey: ['tank', tank.id] });
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-white">{tank ? t('tanks.editTank') : t('tanks.addTank')}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('tanks.form.name')}</label>
            <input {...register('name')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors" placeholder={t('tanks.form.namePlaceholder')} />
            {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('tanks.form.fuelType')}</label>
            <select {...register('fuelType')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors">
              <option value="petrol_91">{t('tanks.petrol91')}</option>
              <option value="petrol_95">{t('tanks.petrol95')}</option>
              <option value="diesel">{t('tanks.diesel')}</option>
              <option value="premium">{t('tanks.premium')}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('tanks.form.capacity')}</label>
              <input type="number" {...register('capacityLiters')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors" placeholder="10000" />
              {errors.capacityLiters && <p className="text-danger text-xs mt-1">{errors.capacityLiters.message}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('tanks.form.currentLevel')}</label>
              <input type="number" {...register('currentLevelLiters')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors" placeholder="5000" />
              {errors.currentLevelLiters && <p className="text-danger text-xs mt-1">{errors.currentLevelLiters.message}</p>}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('tanks.form.lowLevelAlert')}</label>
            <input type="number" {...register('lowLevelThreshold')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors" placeholder="500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('tanks.form.sellingPrice')}</label>
            <input type="number" step="0.0001" {...register('currentPrice')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors" placeholder="2.2200" />
            <p className="text-text-muted text-xs mt-1">{t('tanks.form.sellingPriceHint')}</p>
          </div>
          {mutation.isError && (
            <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {(mutation.error as any)?.response?.data?.message || t('common.errorGeneric')}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:text-white hover:border-border-light transition-all">{t('common.close')}</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 bg-primary text-bg-primary font-semibold rounded-lg text-sm hover:bg-primary/90 transition-all disabled:opacity-60">
              {mutation.isPending ? t('common.saving') : tank ? t('common.saveChanges') : t('tanks.addTank')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TanksPage() {
  const { t } = useTranslation();
  const [modal, setModal] = useState<{ open: boolean; tank?: Tank }>({ open: false });

  const { data: tanks = [], isLoading } = useQuery<Tank[]>({
    queryKey: ['tanks'],
    queryFn: () => api.get('/tanks').then(r => r.data),
    refetchInterval: 60_000,
  });

  const lowCount = tanks.filter(t => Number(t.currentLevelLiters) <= Number(t.lowLevelThreshold)).length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('tanks.title')}</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {t('tanks.tanksCount', { n: tanks.length })} ·{' '}
            {lowCount > 0 ? <span className="text-danger">{lowCount} {t('tanks.lowAlert').toLowerCase()}</span> : <span className="text-success">{t('tanks.allNormal')}</span>}
          </p>
        </div>
        <button onClick={() => setModal({ open: true })} className="flex items-center gap-2 bg-primary text-bg-primary font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-all">
          <Plus size={16} /> {t('tanks.addTank')}
        </button>
      </div>

      {lowCount > 0 && (
        <div className="flex items-center gap-3 bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-danger shrink-0" />
          <p className="text-danger text-sm font-medium">{t('tanks.lowBannerAlert', { n: lowCount })}</p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="bg-bg-card border border-border rounded-2xl h-44 animate-pulse" />)}
        </div>
      ) : tanks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Droplets size={48} className="mb-3 opacity-30" />
          <p className="text-lg font-medium">{t('tanks.empty')}</p>
          <p className="text-sm mt-1">{t('tanks.emptyHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tanks.map(tank => {
            const isLow = Number(tank.currentLevelLiters) <= Number(tank.lowLevelThreshold);
            return (
              <div key={tank.id} className={clsx('bg-bg-card border rounded-2xl p-5 hover:border-border-light transition-all group', isLow ? 'border-danger/40' : 'border-border')}>
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2.5">
                    <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold', FUEL_COLORS[tank.fuelType])}>
                      {FUEL_LABELS[tank.fuelType]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">{tank.name}</h3>
                      <p className={clsx('text-xs', FUEL_TEXT[tank.fuelType])}>{t(`tanks.${tank.fuelType.replace('_', '')}`)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLow ? <AlertTriangle size={15} className="text-danger" /> : <CheckCircle size={15} className="text-success" />}
                    <button onClick={() => setModal({ open: true, tank })} className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-white p-1">
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>
                <LevelBar current={tank.currentLevelLiters} capacity={tank.capacityLiters} threshold={tank.lowLevelThreshold} />
                {Number(tank.currentPrice) > 0 && (
                  <p className="text-xs text-text-secondary mt-2">
                    {t('tanks.priceLabel')}: <span className="text-white font-semibold">SAR {Number(tank.currentPrice).toFixed(4)}</span>/L
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal.open && <TankModal tank={modal.tank} onClose={() => setModal({ open: false })} />}
    </div>
  );
}
