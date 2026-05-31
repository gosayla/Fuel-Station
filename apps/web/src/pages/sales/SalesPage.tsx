import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { Plus, ShoppingCart, X, CreditCard, Banknote, Receipt, ChevronUp, ChevronDown, ChevronsUpDown, Droplets } from 'lucide-react';
import clsx from 'clsx';
import { usePagination, Pagination } from '../../components/Pagination';

interface Sale {
  id: string;
  tankId: string;
  shiftId: string;
  employeeId: string;
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'credit';
  createdAt: string;
}
interface Tank { id: string; name: string; fuelType: string; currentLevelLiters: number; currentPrice: number; }
interface Shift { id: string; employeeId: string; employeeName?: string; status: string; }

const saleSchema = z.object({
  tankId: z.string().min(1, 'Select a tank'),
  liters: z.coerce.number().positive('Must be > 0'),
  pricePerLiter: z.coerce.number().positive('Must be > 0'),
  paymentMethod: z.enum(['cash', 'card', 'credit']),
});
type SaleForm = z.infer<typeof saleSchema>;

const FUEL_LABELS: Record<string, string> = {
  petrol_91: 'Petrol 91', petrol_95: 'Petrol 95', diesel: 'Diesel', premium: 'Premium',
};
const FUEL_BADGE: Record<string, string> = {
  petrol_91: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  petrol_95: 'bg-primary/10 text-primary border-primary/20',
  diesel: 'bg-warning/10 text-warning border-warning/20',
  premium: 'bg-teal/10 text-teal border-teal/20',
};
const FUEL_DOT: Record<string, string> = {
  petrol_91: 'bg-blue-400', petrol_95: 'bg-primary', diesel: 'bg-warning', premium: 'bg-teal',
};
const PM_ICON: Record<string, any> = { cash: Banknote, card: CreditCard, credit: Receipt };
const PM_STYLE: Record<string, string> = {
  cash: 'bg-success/10 text-success border-success/20',
  card: 'bg-primary/10 text-primary border-primary/20',
  credit: 'bg-warning/10 text-warning border-warning/20',
};

function NewSaleModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { data: tanks = [] } = useQuery<Tank[]>({ queryKey: ['tanks'], queryFn: () => api.get('/tanks').then(r => r.data) });
  const { data: shifts = [] } = useQuery<Shift[]>({ queryKey: ['shifts'], queryFn: () => api.get('/shifts').then(r => r.data) });
  const openShifts = (shifts as Shift[]).filter(s => s.status === 'open');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SaleForm>({
    resolver: zodResolver(saleSchema),
    defaultValues: { paymentMethod: 'cash', pricePerLiter: 0, liters: 0 },
  });

  const selectedTankId = watch('tankId');
  const selectedTank = (tanks as Tank[]).find(tnk => tnk.id === selectedTankId);

  // Auto-fill price when tank changes
  const handleTankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tank = (tanks as Tank[]).find(tnk => tnk.id === e.target.value);
    if (tank && Number(tank.currentPrice) > 0) {
      setValue('pricePerLiter', Number(tank.currentPrice));
    }
  };

  const liters = watch('liters') || 0;
  const price = watch('pricePerLiter') || 0;
  const total = (liters * price).toFixed(2);

  const mutation = useMutation({
    mutationFn: (d: SaleForm) => api.post('/sales', { tankId: d.tankId, liters: d.liters, pricePerLiter: d.pricePerLiter, paymentMethod: d.paymentMethod, shiftId: openShifts[0]?.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['tanks'] });
      qc.invalidateQueries({ queryKey: ['shifts'] });
      onClose();
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['tanks'] });
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['shift-sales'] });
      qc.invalidateQueries({ queryKey: ['shift-summary'] });
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><ShoppingCart size={18} className="text-primary" /> {t('sales.newSale')}</h2>
          <button onClick={onClose}><X size={20} className="text-text-muted hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-4">
          {/* Active shift info */}
          {openShifts.length === 0 ? (
            <div className="bg-warning/10 border border-warning/20 text-warning text-sm rounded-xl px-3 py-2.5">
              ⚠ {t('sales.noOpenShift')}
            </div>
          ) : (
            <div className="bg-bg-primary rounded-xl px-3 py-2.5 text-sm flex items-center gap-2">
              <span className="text-text-secondary">{t('sales.activeShift')}</span>
              <span className="text-white font-medium">{openShifts.map(s => s.employeeName || s.employeeId).join(', ')}</span>
            </div>
          )}
          {/* Tank */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('sales.form.tank')}</label>
            <select {...register('tankId')} onChange={e => { register('tankId').onChange(e); handleTankChange(e); }} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors">
              <option value="">{t('common.selectTank')}</option>
              {tanks.map(tnk => <option key={tnk.id} value={tnk.id}>{tnk.name} ({t(`tanks.${tnk.fuelType.replace('_', '')}`, { defaultValue: FUEL_LABELS[tnk.fuelType] ?? tnk.fuelType })}) — {Number(tnk.currentLevelLiters).toLocaleString()} L left{Number(tnk.currentPrice) > 0 ? ` · SAR ${Number(tnk.currentPrice).toFixed(4)}/L` : ''}</option>)}
            </select>
            {errors.tankId && <p className="text-danger text-xs mt-1">{errors.tankId.message}</p>}
          </div>
          {/* Liters + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('sales.liters')}</label>
              <input type="number" step="0.01" {...register('liters')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors" placeholder="0.00" />
              {errors.liters && <p className="text-danger text-xs mt-1">{errors.liters.message}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('common.pricePerLiter')}</label>
              <input type="number" step="0.0001" {...register('pricePerLiter')} readOnly className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white cursor-not-allowed opacity-70 focus:outline-none" placeholder="0.00" />
              {errors.pricePerLiter && <p className="text-danger text-xs mt-1">{errors.pricePerLiter.message}</p>}
            </div>
          </div>
          {/* Total */}
          <div className="bg-bg-primary rounded-xl p-3 flex justify-between items-center">
            <span className="text-text-secondary text-sm">{t('sales.form.totalAmount')}</span>
            <span className="text-white text-xl font-bold">SAR {total}</span>
          </div>
          {/* Payment Method */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-2">{t('sales.form.paymentMethod')}</label>
            <div className="grid grid-cols-3 gap-2">
              {(['cash', 'card', 'credit'] as const).map(pm => {
                const Icon = PM_ICON[pm];
                return (
                  <label key={pm} className="cursor-pointer">
                    <input type="radio" {...register('paymentMethod')} value={pm} className="sr-only peer" />
                    <div className="peer-checked:border-primary peer-checked:bg-primary/10 border border-border rounded-lg p-2.5 text-center transition-all">
                      <Icon size={16} className="mx-auto mb-1 text-text-secondary peer-checked:text-primary" />
                      <span className="text-xs capitalize text-text-secondary">{t(`common.${pm}`)}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          {mutation.isError && <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{(mutation.error as any)?.response?.data?.message || 'Error'}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:text-white transition-all">{t('common.close')}</button>
            <button type="submit" disabled={mutation.isPending || openShifts.length === 0} className="flex-1 py-2.5 bg-primary text-bg-primary font-semibold rounded-lg text-sm hover:bg-primary/90 disabled:opacity-60">
              {mutation.isPending ? t('sales.recording') : t('sales.recordSale')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type SortCol = 'time' | 'liters' | 'total' | 'payment';

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown size={13} className="ml-1 opacity-40" />;
  return active && dir === 'asc' ? <ChevronUp size={13} className="ml-1 text-primary" /> : <ChevronDown size={13} className="ml-1 text-primary" />;
}

export function SalesPage() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const [modal, setModal] = useState(false);
  const [sortCol, setSortCol] = useState<SortCol>('time');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: sales = [], isLoading } = useQuery<Sale[]>({
    queryKey: ['sales'],
    queryFn: () => api.get('/sales').then(r => r.data),
    refetchInterval: 30_000,
  });
  const { data: tanks = [] } = useQuery<Tank[]>({ queryKey: ['tanks'], queryFn: () => api.get('/tanks').then(r => r.data) });

  const tankMap = useMemo(() => Object.fromEntries((tanks as Tank[]).map(t => [t.id, t])), [tanks]);

  const sorted = useMemo(() => {
    return [...sales].sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'time') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortCol === 'liters') cmp = Number(a.liters) - Number(b.liters);
      else if (sortCol === 'total') cmp = Number(a.totalAmount) - Number(b.totalAmount);
      else if (sortCol === 'payment') cmp = a.paymentMethod.localeCompare(b.paymentMethod);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [sales, sortCol, sortDir]);

  const toggle = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const { page, setPage, totalPages, paged: pagedSales, start, end } = usePagination(sorted, 20);

  const totalRevenue = sales.reduce((s, x) => s + Number(x.totalAmount), 0);
  const totalLiters = sales.reduce((s, x) => s + Number(x.liters), 0);

  const fuelGroups = useMemo(() => {
    const groups: Record<string, { liters: number; revenue: number; count: number }> = {};
    sales.forEach(s => {
      const ft = tankMap[s.tankId]?.fuelType ?? 'unknown';
      if (!groups[ft]) groups[ft] = { liters: 0, revenue: 0, count: 0 };
      groups[ft].liters += Number(s.liters);
      groups[ft].revenue += Number(s.totalAmount);
      groups[ft].count += 1;
    });
    return Object.entries(groups);
  }, [sales, tankMap]);

  const thClass = rtl ? 'text-right px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide' : 'text-left px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide';
  const thBtn = 'inline-flex items-center cursor-pointer hover:text-white transition-colors select-none';

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('sales.title')}</h1>
          <p className="text-text-secondary text-sm mt-0.5">{t('sales.transactionCount', { n: sales.length })} · SAR {totalRevenue.toFixed(2)} · {totalLiters.toFixed(0)} L</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-primary text-bg-primary font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-all">
          <Plus size={16} /> {t('sales.newSale')}
        </button>
      </div>

      {/* Summary cards */}
      {!isLoading && sales.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-text-muted uppercase tracking-wide mb-1">{t('common.totalRevenue')}</p>
            <p className="text-xl font-bold text-white">SAR {totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-text-secondary mt-0.5">{t('sales.transactionCount', { n: sales.length })}</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-text-muted uppercase tracking-wide mb-1">{t('sales.totalVolume')}</p>
            <p className="text-xl font-bold text-white">{totalLiters.toFixed(0)} L</p>
            <p className="text-xs text-text-secondary mt-0.5">{t('sales.avgPrice', { price: totalLiters > 0 ? (totalRevenue / totalLiters).toFixed(4) : '0.0000' })}</p>
          </div>
          {fuelGroups.map(([ft, data]) => (
            <div key={ft} className="bg-bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={clsx('w-2 h-2 rounded-full', FUEL_DOT[ft] ?? 'bg-text-muted')} />
                <p className="text-xs text-text-muted uppercase tracking-wide">{t(`tanks.${ft.replace('_', '')}`, { defaultValue: FUEL_LABELS[ft] ?? ft })}</p>
              </div>
              <p className="text-xl font-bold text-white">SAR {data.revenue.toFixed(2)}</p>
              <p className="text-xs text-text-secondary mt-0.5">{data.liters.toFixed(0)} L · {data.count} {t('accounts.salesCount')}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="bg-bg-card border border-border rounded-xl h-16 animate-pulse" />)}</div>
      ) : sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <ShoppingCart size={48} className="mb-3 opacity-30" />
          <p className="text-lg font-medium">{t('sales.empty')}</p>
          <p className="text-sm mt-1">{t('sales.emptyHint')}</p>
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary">
              <tr>
                <th className={thClass}><span className={thBtn} onClick={() => toggle('time')}>{t('common.time')} <SortIcon col="time" active={sortCol==='time'} dir={sortDir} /></span></th>
                <th className={thClass}>{t('tanks.fuelType')}</th>
                <th className={thClass}><span className={thBtn} onClick={() => toggle('liters')}>{t('sales.liters')} <SortIcon col="liters" active={sortCol==='liters'} dir={sortDir} /></span></th>
                <th className={thClass}>{t('sales.pricePerLiter')}</th>
                <th className={thClass}><span className={thBtn} onClick={() => toggle('total')}>{t('sales.total')} <SortIcon col="total" active={sortCol==='total'} dir={sortDir} /></span></th>
                <th className={thClass}><span className={thBtn} onClick={() => toggle('payment')}>{t('sales.paymentMethod')} <SortIcon col="payment" active={sortCol==='payment'} dir={sortDir} /></span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedSales.map(sale => {
                const Icon = PM_ICON[sale.paymentMethod];
                const tank = tankMap[sale.tankId];
                const ft = tank?.fuelType ?? 'unknown';
                return (
                  <tr key={sale.id} className="hover:bg-bg-secondary/50 transition-colors">
                    <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">{new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(sale.createdAt))}</td>
                    <td className="px-5 py-3.5">
                      <span className={clsx('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border', FUEL_BADGE[ft] ?? 'bg-bg-secondary text-text-secondary border-border')}>
                        <Droplets size={10} />{t(`tanks.${ft.replace('_', '')}`, { defaultValue: FUEL_LABELS[ft] ?? ft })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-white font-medium">{Number(sale.liters).toFixed(2)} L</td>
                    <td className="px-5 py-3.5 text-text-secondary">SAR {Number(sale.pricePerLiter).toFixed(4)}</td>
                    <td className="px-5 py-3.5 text-white font-bold">SAR {Number(sale.totalAmount).toFixed(2)}</td>
                    <td className="px-5 py-3.5">
                      <span className={clsx('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border', PM_STYLE[sale.paymentMethod])}>
                        <Icon size={11} /> {t(`common.${sale.paymentMethod}`)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} start={start} end={end} total={sorted.length} onPageChange={setPage} />
        </div>
      )}

      {modal && <NewSaleModal onClose={() => setModal(false)} />}
    </div>
  );
}
