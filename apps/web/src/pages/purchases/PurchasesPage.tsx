import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { Plus, Truck, X, Package, Droplets, DollarSign, Wallet, Trash2, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { usePagination, Pagination } from '../../components/Pagination';

interface Purchase {
  id: string;
  tankId: string;
  supplierName: string;
  invoiceNumber?: string;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  deliveredAt: string;
  createdAt: string;
}

interface Tank {
  id: string;
  name: string;
  fuelType: string;
  capacityLiters: number;
  currentLevelLiters: number;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface PaymentLine {
  accountId: string;
  amount: string;
}

const FUEL_LABELS: Record<string, string> = {
  petrol_91: '91',
  petrol_95: '95',
  diesel: 'Diesel',
  premium: 'Premium',
};

const purchaseSchema = z.object({
  tankId: z.string().min(1, 'Select a tank'),
  supplierName: z.string().min(1, 'Supplier name is required'),
  invoiceNumber: z.string().optional(),
  liters: z.coerce.number().min(1, 'Must be at least 1 L'),
  pricePerLiter: z.coerce.number().min(0.01, 'Must be > 0'),
  deliveredAt: z.string().min(1, 'Delivery date is required'),
});
type PurchaseForm = z.infer<typeof purchaseSchema>;

// ── Add Purchase Modal ────────────────────────────────────────────────────────
function AddPurchaseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [payments, setPayments] = useState<PaymentLine[]>([{ accountId: '', amount: '' }]);

  const { data: tanks = [] } = useQuery<Tank[]>({
    queryKey: ['tanks'],
    queryFn: () => api.get('/tanks').then((r) => r.data),
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then((r) => r.data),
  });

  const { register, handleSubmit, watch, formState: { errors } } = useForm<PurchaseForm>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      deliveredAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  const liters = Number(watch('liters')) || 0;
  const pricePerLiter = Number(watch('pricePerLiter')) || 0;
  const totalCost = liters * pricePerLiter;
  const selectedTankId = watch('tankId');

  const selectedTank = tanks.find((t) => t.id === selectedTankId);
  const availableSpace = selectedTank
    ? Number(selectedTank.capacityLiters) - Number(selectedTank.currentLevelLiters)
    : null;
  const overCapacity = availableSpace !== null && liters > 0 && liters > availableSpace;

  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = totalCost - totalPaid;

  const addPaymentLine = () => setPayments((p) => [...p, { accountId: '', amount: '' }]);
  const removePaymentLine = (i: number) => setPayments((p) => p.filter((_, idx) => idx !== i));
  const updatePaymentLine = (i: number, field: keyof PaymentLine, value: string) =>
    setPayments((p) => p.map((line, idx) => (idx === i ? { ...line, [field]: value } : line)));

  const ACCOUNT_TYPE_LABELS: Record<string, string> = { safe: 'Safe', bank: 'Bank', credit: 'Credit' };

  const mutation = useMutation({
    mutationFn: (d: PurchaseForm) =>
      api.post('/purchases', {
        ...d,
        payments: payments
          .filter((p) => p.accountId && Number(p.amount) > 0)
          .map((p) => ({ accountId: p.accountId, amount: Number(p.amount) })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['tanks'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      onClose();
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['tanks'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-bg-secondary border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-bg-secondary z-10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Truck size={18} className="text-primary" /> {t('purchases.logDelivery')}
          </h2>
          <button onClick={onClose}>
            <X size={20} className="text-text-muted hover:text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          {/* Tank */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">
              {t('purchases.form.tank')}
            </label>
            <select
              {...register('tankId')}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
            >
              <option value="">{t('common.selectTank')}</option>
              {tanks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({FUEL_LABELS[t.fuelType] ?? t.fuelType})
                </option>
              ))}
            </select>
            {errors.tankId && <p className="text-danger text-xs mt-1">{errors.tankId.message}</p>}
          </div>

          {/* Supplier */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">
              {t('purchases.form.supplier')}
            </label>
            <input
              {...register('supplierName')}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
              placeholder={t('purchases.form.supplierPlaceholder')}
            />
            {errors.supplierName && (
              <p className="text-danger text-xs mt-1">{errors.supplierName.message}</p>
            )}
          </div>

          {/* Invoice # */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">
              {t('purchases.form.invoice')} <span className="text-text-muted font-normal normal-case">({t('common.optional')})</span>
            </label>
            <input
              {...register('invoiceNumber')}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
              placeholder="INV-0001"
            />
          </div>

          {/* Liters + Price/L */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">
                {t('sales.liters')}
              </label>
              <input
                type="number"
                step="0.01"
                {...register('liters')}
                className={clsx(
                  'w-full bg-bg-primary border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-colors',
                  overCapacity ? 'border-danger focus:border-danger' : 'border-border focus:border-primary',
                )}
                placeholder="0.00"
              />
              {errors.liters && <p className="text-danger text-xs mt-1">{errors.liters.message}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">
                {t('common.pricePerLiter')}
              </label>
              <input
                type="number"
                step="0.0001"
                {...register('pricePerLiter')}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                placeholder="0.00"
              />
              {errors.pricePerLiter && (
                <p className="text-danger text-xs mt-1">{errors.pricePerLiter.message}</p>
              )}
            </div>
          </div>

          {/* Capacity warning */}
          {selectedTank && liters > 0 && (
            <div className={clsx(
              'rounded-xl px-4 py-2.5 text-sm border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1',
              overCapacity
                ? 'bg-danger/10 border-danger/30 text-danger'
                : 'bg-bg-primary border-border text-text-secondary',
            )}>
              <span>
                {overCapacity
                  ? t('purchases.form.overCapacity', { n: (liters - availableSpace!).toFixed(2) })
                  : t('purchases.form.availableSpace', { n: availableSpace!.toFixed(2) })}
              </span>
              <span className="font-semibold text-xs opacity-80">
                {selectedTank.name} · {Number(selectedTank.currentLevelLiters).toFixed(0)} / {Number(selectedTank.capacityLiters).toFixed(0)} L
              </span>
            </div>
          )}

          {/* Total cost */}
          {totalCost > 0 && (
            <div className="bg-bg-primary rounded-xl px-4 py-3 flex justify-between items-center border border-border">
              <span className="text-sm text-text-secondary">{t('purchases.form.totalCost')}</span>
              <span className="font-bold text-white text-lg">SAR {totalCost.toFixed(2)}</span>
            </div>
          )}

          {/* Delivery Date */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">
              {t('purchases.form.deliveryDate')}
            </label>
            <input
              type="datetime-local"
              {...register('deliveredAt')}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors [color-scheme:dark]"
            />
            {errors.deliveredAt && (
              <p className="text-danger text-xs mt-1">{errors.deliveredAt.message}</p>
            )}
          </div>

          {/* ── Payment section ── */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet size={15} className="text-primary" />
                <span className="text-sm font-semibold text-white">{t('common.payment')}</span>
              </div>
              <button
                type="button"
                onClick={addPaymentLine}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                  {t('purchases.form.addAccount')}
              </button>
            </div>

            <div className="space-y-2">
              {payments.map((line, i) => {
                const acct = accounts.find((a) => a.id === line.accountId);
                const overBalance = acct && Number(line.amount) > 0 && Number(line.amount) > Number(acct.balance);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex gap-2 flex-1 min-w-0">
                        <select
                          value={line.accountId}
                          onChange={(e) => updatePaymentLine(i, 'accountId', e.target.value)}
                          className="flex-1 min-w-0 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                        >
                          <option value="">Select account…</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({ACCOUNT_TYPE_LABELS[a.type] ?? a.type}) — SAR {Number(a.balance).toFixed(2)}
                            </option>
                          ))}
                        </select>
                        {payments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePaymentLine(i)}
                            className="shrink-0 sm:hidden text-text-muted hover:text-danger transition-colors p-2"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          value={line.amount}
                          onChange={(e) => updatePaymentLine(i, 'amount', e.target.value)}
                          className={clsx(
                            'flex-1 sm:w-28 bg-bg-primary border rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors',
                            overBalance ? 'border-danger focus:border-danger' : 'border-border focus:border-primary',
                          )}
                        />
                        {payments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePaymentLine(i)}
                            className="hidden sm:block shrink-0 text-text-muted hover:text-danger transition-colors p-2"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    {overBalance && (
                      <p className="text-danger text-xs pl-1">
                        Insufficient balance — available: SAR {Number(acct!.balance).toFixed(2)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Payment summary */}
            {totalCost > 0 && totalPaid > 0 && (
              <div className={clsx(
                'mt-3 rounded-xl px-4 py-2.5 flex justify-between items-center text-sm border',
                Math.abs(remaining) < 0.01
                  ? 'bg-success/10 border-success/20 text-success'
                  : remaining > 0
                  ? 'bg-warning/10 border-warning/20 text-warning'
                  : 'bg-danger/10 border-danger/20 text-danger',
              )}>
                <span>
                  {Math.abs(remaining) < 0.01
                    ? t('purchases.form.fullyPaid')
                    : remaining > 0
                    ? t('purchases.form.remaining', { n: `SAR ${remaining.toFixed(2)}` })
                    : t('purchases.form.overpaid', { n: `SAR ${Math.abs(remaining).toFixed(2)}` })}
                </span>
                <span className="font-semibold">
                  {t('purchases.form.paid', { n: `SAR ${totalPaid.toFixed(2)}` })}
                </span>
              </div>
            )}
          </div>

          {mutation.isError && (
            <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {(mutation.error as any)?.response?.data?.message || 'Something went wrong'}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:text-white transition-all"
            >
              {t('common.close')}
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || overCapacity || payments.some((p) => {
                const acct = accounts.find((a) => a.id === p.accountId);
                return acct && Number(p.amount) > 0 && Number(p.amount) > Number(acct.balance);
              })}
              className="flex-1 py-2.5 bg-primary text-bg-primary font-semibold rounded-lg text-sm hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? t('common.saving') : t('purchases.logDelivery')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function PurchasesPage() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const [showModal, setShowModal] = useState(false);

  const { data: purchases = [], isLoading } = useQuery<Purchase[]>({
    queryKey: ['purchases'],
    queryFn: () => api.get('/purchases').then((r) => r.data),
  });

  const { data: tanks = [] } = useQuery<Tank[]>({
    queryKey: ['tanks'],
    queryFn: () => api.get('/tanks').then((r) => r.data),
  });

  const tankMap = Object.fromEntries(tanks.map((t) => [t.id, t]));

  const totalLiters = purchases.reduce((s, p) => s + Number(p.liters), 0);
  const totalCost = purchases.reduce((s, p) => s + Number(p.totalCost), 0);

  const { page, setPage, totalPages, paged: pagedPurchases, start, end } = usePagination(purchases, 10);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{t('purchases.title')}</h1>
          <p className="text-text-secondary text-sm mt-0.5">{t('purchases.deliveriesRecorded', { n: purchases.length })}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-bg-primary font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-all shrink-0"
        >
          <Plus size={16} /> {t('purchases.addPurchase')}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <p className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wide leading-tight">{t('purchases.deliveries')}</p>
            <Package size={14} className="text-text-muted shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">{purchases.length}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <p className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wide leading-tight">{t('purchases.received')}</p>
            <Droplets size={14} className="text-primary shrink-0" />
          </div>
          <p className="text-lg sm:text-2xl font-bold text-primary tabular-nums">{totalLiters.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-sm sm:text-base">L</span></p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <p className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wide leading-tight">{t('purchases.cost')}</p>
            <DollarSign size={14} className="text-warning shrink-0" />
          </div>
          <p className="text-lg sm:text-2xl font-bold text-warning tabular-nums"><span className="text-xs sm:text-sm font-normal">SAR </span>{totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Truck size={16} className="text-primary" /> {t('purchases.deliveryHistory')}
          </h2>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-bg-secondary rounded-xl animate-pulse" />
            ))}
          </div>
        ) : purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Truck size={40} className="mb-3 opacity-30" />
            <p className="text-base font-medium">{t('purchases.empty')}</p>
            <p className="text-sm mt-1">{t('purchases.emptyHint')}</p>
          </div>
        ) : (
          <>
            {/* ── Mobile card list (< sm) ── */}
            <div className="sm:hidden divide-y divide-border/50">
              {pagedPurchases.map((p) => {
                const tank = tankMap[p.tankId];
                return (
                  <div key={p.id} className="px-4 py-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">
                          {tank ? tank.name : p.tankId.slice(0, 8)}
                          {tank && (
                            <span className="text-xs text-text-muted font-normal ml-1">
                              ({FUEL_LABELS[tank.fuelType] ?? tank.fuelType})
                            </span>
                          )}
                        </p>
                        <p className="text-text-secondary text-xs mt-0.5 truncate">{p.supplierName}</p>
                      </div>
                      <p className="font-bold text-white text-sm tabular-nums shrink-0">
                        SAR {Number(p.totalCost).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-text-secondary">
                      <span className="tabular-nums">
                        {new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(p.deliveredAt))}
                      </span>
                      <span className="tabular-nums">
                        {Number(p.liters).toLocaleString(undefined, { maximumFractionDigits: 1 })} L &nbsp;@&nbsp; {Number(p.pricePerLiter).toFixed(4)}
                      </span>
                    </div>
                    {p.invoiceNumber && (
                      <span className="font-mono text-xs bg-bg-secondary px-2 py-0.5 rounded inline-block">
                        {p.invoiceNumber}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Desktop table (≥ sm) ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide`}>{t('common.date')}</th>
                    <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide`}>{t('common.tank')}</th>
                    <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide`}>{t('purchases.table.supplier')}</th>
                    <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide`}>{t('purchases.table.invoice')}</th>
                    <th className={`${rtl ? 'text-left' : 'text-right'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide`}>{t('sales.liters')}</th>
                    <th className={`${rtl ? 'text-left' : 'text-right'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide`}>{t('common.pricePerLiter')}</th>
                    <th className={`${rtl ? 'text-left' : 'text-right'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide`}>{t('purchases.table.totalCost')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPurchases.map((p, idx) => {
                    const tank = tankMap[p.tankId];
                    return (
                      <tr
                        key={p.id}
                        className={clsx(
                          'border-b border-border/50 hover:bg-bg-secondary/50 transition-colors',
                          idx === pagedPurchases.length - 1 && 'border-b-0',
                        )}
                      >
                        <td className="px-5 py-3 text-text-secondary tabular-nums whitespace-nowrap">
                          {new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(p.deliveredAt))}
                        </td>
                        <td className="px-5 py-3 text-white">
                          {tank ? (
                            <span className="flex items-center gap-1.5">
                              {tank.name}
                              <span className="text-xs text-text-muted">
                                ({FUEL_LABELS[tank.fuelType] ?? tank.fuelType})
                              </span>
                            </span>
                          ) : (
                            p.tankId.slice(0, 8)
                          )}
                        </td>
                        <td className="px-5 py-3 text-white">{p.supplierName}</td>
                        <td className="px-5 py-3 text-text-secondary">
                          {p.invoiceNumber ? (
                            <span className="font-mono text-xs bg-bg-secondary px-2 py-0.5 rounded">
                              {p.invoiceNumber}
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className={`px-5 py-3 ${rtl ? 'text-left' : 'text-right'} text-white tabular-nums`}>
                          {Number(p.liters).toLocaleString(undefined, { maximumFractionDigits: 1 })} L
                        </td>
                        <td className={`px-5 py-3 ${rtl ? 'text-left' : 'text-right'} text-text-secondary tabular-nums`}>
                          {Number(p.pricePerLiter).toFixed(4)}
                        </td>
                        <td className={`px-5 py-3 ${rtl ? 'text-left' : 'text-right'} font-semibold text-white tabular-nums`}>
                          SAR {Number(p.totalCost).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} start={start} end={end} total={purchases.length} onPageChange={setPage} />
          </>
        )}
      </div>

      {showModal && <AddPurchaseModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
