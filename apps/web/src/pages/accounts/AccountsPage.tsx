import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { ArrowLeftRight, HandCoins, X, Wallet, TrendingUp, TrendingDown, Banknote, CreditCard, Receipt, CheckCircle, AlertTriangle, BookOpen, FileText, ArrowDownLeft, ArrowUpRight, ChevronRight, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { usePagination, Pagination } from '../../components/Pagination';

interface Account { id: string; name: string; type: 'safe' | 'bank' | 'credit'; balance: number; currency: string; }
interface Shift {
  id: string;
  employeeId: string;
  employeeName?: string;
  status: string;
  expectedCash: number;
  startedAt?: string;
  cashRevenue?: number;
  cardRevenue?: number;
  creditRevenue?: number;
}
interface Tx { id: string; type: 'credit' | 'debit'; category: string; amount: number; notes?: string; createdAt: string; }
interface StatementEntry extends Tx { runningBalance: number; }
interface Statement { account: Account; openingBalance: number; totalCredits: number; totalDebits: number; transactions: StatementEntry[]; }

const CATEGORY_LABELS: Record<string, string> = {
  collection: 'Cash Collection',
  transfer: 'Transfer',
  expense: 'Expense',
  purchase: 'Fuel Purchase',
};

// ── Statement Drawer ──────────────────────────────────────────────────────────
function StatementDrawer({ account, onClose }: { account: Account; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery<Statement>({
    queryKey: ['statement', account.id],
    queryFn: () => api.get(`/accounts/${account.id}/statement`).then(r => r.data),
  });

  const ACCOUNT_ICON: Record<string, React.ReactNode> = {
    safe: <Wallet size={18} className="text-teal" />,
    bank: <CreditCard size={18} className="text-primary" />,
    credit: <BookOpen size={18} className="text-warning" />,
  };
  const ACCOUNT_COLOR: Record<string, string> = { safe: 'text-teal', bank: 'text-primary', credit: 'text-warning' };

  // Reverse for display (newest first)
  const entries = data ? [...data.transactions].reverse() : [];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 end-0 z-50 w-full sm:w-[440px] bg-bg-secondary border-s border-border flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', account.type === 'safe' ? 'bg-teal/10' : account.type === 'bank' ? 'bg-primary/10' : 'bg-warning/10')}>
              {ACCOUNT_ICON[account.type]}
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{account.name}</p>
              <p className="text-xs text-text-secondary capitalize">{t(`accounts.types.${account.type}`)} · {t('accounts.accountStatement')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-bg-tertiary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Summary strip */}
        {data && (
          <div className="grid grid-cols-3 divide-x divide-border border-b border-border shrink-0">
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-1">{t('accounts.opening')}</p>
              <p className="text-sm font-bold text-white tabular-nums">{Number(data.openingBalance).toFixed(2)}</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] font-semibold text-success uppercase tracking-wide mb-1">{t('accounts.moneyIn')}</p>
              <p className="text-sm font-bold text-success tabular-nums">+{Number(data.totalCredits).toFixed(2)}</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] font-semibold text-danger uppercase tracking-wide mb-1">{t('accounts.moneyOut')}</p>
              <p className="text-sm font-bold text-danger tabular-nums">-{Number(data.totalDebits).toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Current balance bar */}
        <div className="px-5 py-3 bg-bg-tertiary/50 border-b border-border flex items-center justify-between shrink-0">
          <span className="text-xs text-text-secondary font-medium">{t('accounts.currentBalance')}</span>
          <span className={clsx('text-lg font-bold tabular-nums', ACCOUNT_COLOR[account.type])}>
            SAR {Number(account.balance).toFixed(2)}
          </span>
        </div>

        {/* Transactions list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-bg-tertiary rounded-xl animate-pulse" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted py-16">
              <FileText size={36} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">{t('accounts.noTransactions')}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {entries.map((tx) => (
                <div key={tx.id} className="px-5 py-3.5 hover:bg-bg-tertiary/30 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={clsx(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                      tx.type === 'credit' ? 'bg-success/10' : 'bg-danger/10',
                    )}>
                      {tx.type === 'credit'
                        ? <ArrowDownLeft size={15} className="text-success" />
                        : <ArrowUpRight size={15} className="text-danger" />}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white truncate">
                        {t(`accounts.categories.${tx.category}`, { defaultValue: tx.category.replace('_', ' ') })}
                        </p>
                        <p className={clsx('text-sm font-bold tabular-nums shrink-0', tx.type === 'credit' ? 'text-success' : 'text-danger')}>
                          {tx.type === 'credit' ? '+' : '-'}SAR {Number(tx.amount).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-0.5 gap-2">
                        <p className="text-xs text-text-muted truncate">{tx.notes || '—'}</p>
                        <p className="text-xs text-text-secondary tabular-nums shrink-0">
                          SAR {Number(tx.runningBalance).toFixed(2)}
                        </p>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        {new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(tx.createdAt))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Transfer Modal ─────────────────────────────────────────────────────────────
const transferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.coerce.number().positive('Amount must be > 0'),
  notes: z.string().optional(),
}).refine(d => d.fromAccountId !== d.toAccountId, { message: 'Cannot transfer to same account', path: ['toAccountId'] });
type TransferForm = z.infer<typeof transferSchema>;

function TransferModal({ accounts, onClose }: { accounts: Account[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm<TransferForm>({ resolver: zodResolver(transferSchema) });
  const mutation = useMutation({
    mutationFn: (d: TransferForm) => api.post('/accounts/transfer', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); qc.invalidateQueries({ queryKey: ['transactions'] }); onClose(); },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><ArrowLeftRight size={18} className="text-primary" /> {t('accounts.transferFunds')}</h2>
          <button onClick={onClose}><X size={20} className="text-text-muted hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('common.from')}</label>
              <select {...register('fromAccountId')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
                <option value="">{t('common.select')}</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (SAR {Number(a.balance).toFixed(0)})</option>)}
              </select>
              {errors.fromAccountId && <p className="text-danger text-xs mt-1">{errors.fromAccountId.message}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('common.to')}</label>
              <select {...register('toAccountId')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
                <option value="">{t('common.select')}</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {errors.toAccountId && <p className="text-danger text-xs mt-1">{errors.toAccountId.message}</p>}
            </div>
          </div>
          <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('common.amount')}</label>
            <input type="number" step="0.01" {...register('amount')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary" placeholder="0.00" />
            {errors.amount && <p className="text-danger text-xs mt-1">{errors.amount.message}</p>}
          </div>
          <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('common.optional')} ({t('accounts.form.reasonPlaceholder').toLowerCase()})</label>
            <input {...register('notes')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary" placeholder={t('accounts.form.reasonPlaceholder')} />
          </div>
          {mutation.isError && <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{(mutation.error as any)?.response?.data?.message || 'Error'}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:text-white transition-all">{t('common.close')}</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 bg-primary text-bg-primary font-semibold rounded-lg text-sm hover:bg-primary/90 disabled:opacity-60">
              {mutation.isPending ? t('accounts.transferring') : t('accounts.transferFunds')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Collect Cash Modal ─────────────────────────────────────────────────────────
const collectSchema = z.object({
  shiftId: z.string().min(1, 'Select a shift'),
  cashAccountId: z.string().min(1, 'Select cash safe'),
  bankAccountId: z.string().optional(),
  amountReceived: z.coerce.number().min(0),
  notes: z.string().optional(),
});
type CollectForm = z.infer<typeof collectSchema>;

interface PaymentSummary { cash: number; card: number; credit: number; cashLiters: number; cardLiters: number; creditLiters: number; cashCount: number; cardCount: number; creditCount: number; }
interface PosPaymentSummary { cash: number; card: number; credit: number; cashCount: number; cardCount: number; creditCount: number; totalItems: number; }
interface CreditSummary { totalCharged: number; totalCollected: number; outstanding: number; }

function CollectModal({ accounts, onClose }: { accounts: Account[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { t, i18n } = useTranslation();
  const { data: shifts = [] } = useQuery<Shift[]>({ queryKey: ['shifts'], queryFn: () => api.get('/shifts').then(r => r.data) });
  const closedShifts = (shifts as Shift[]).filter(s => s.status === 'closed');

  const safeAccounts = accounts.filter(a => a.type === 'safe');
  const bankAccounts = accounts.filter(a => a.type === 'bank');

  const { register, handleSubmit, watch, setValue, setError, formState: { errors } } = useForm<CollectForm>({ resolver: zodResolver(collectSchema) });
  const selectedShiftId = watch('shiftId');
  const selectedShift = closedShifts.find((shift) => shift.id === selectedShiftId);
  const received = watch('amountReceived') || 0;

  const { data: fuelSummary } = useQuery<PaymentSummary>({
    queryKey: ['shift-summary', selectedShiftId],
    queryFn: () => api.get(`/sales/shift/${selectedShiftId}/summary`).then(r => r.data),
    enabled: !!selectedShiftId,
  });

  const { data: posSummary } = useQuery<PosPaymentSummary>({
    queryKey: ['shift-pos-summary', selectedShiftId],
    queryFn: () => api.get(`/pos/sales/shift/${selectedShiftId}/summary`).then(r => r.data),
    enabled: !!selectedShiftId,
  });

  const combinedSummary = {
    cash: Number(fuelSummary?.cash ?? 0) + Number(posSummary?.cash ?? selectedShift?.cashRevenue ?? 0),
    card: Number(fuelSummary?.card ?? 0) + Number(posSummary?.card ?? selectedShift?.cardRevenue ?? 0),
    credit: Number(fuelSummary?.credit ?? 0) + Number(posSummary?.credit ?? selectedShift?.creditRevenue ?? 0),
    cashCount: Number(fuelSummary?.cashCount ?? 0) + Number(posSummary?.cashCount ?? 0),
    cardCount: Number(fuelSummary?.cardCount ?? 0) + Number(posSummary?.cardCount ?? 0),
    creditCount: Number(fuelSummary?.creditCount ?? 0) + Number(posSummary?.creditCount ?? 0),
    cashLiters: Number(fuelSummary?.cashLiters ?? 0),
    cardLiters: Number(fuelSummary?.cardLiters ?? 0),
    creditLiters: Number(fuelSummary?.creditLiters ?? 0),
  };

  // Auto-fill cash amount and auto-select single accounts
  useEffect(() => {
    if (selectedShiftId) setValue('amountReceived', Number(combinedSummary.cash));
  }, [selectedShiftId, combinedSummary.cash, setValue]);

  useEffect(() => {
    if (safeAccounts.length === 1) setValue('cashAccountId', safeAccounts[0].id);
    if (bankAccounts.length === 1) setValue('bankAccountId', bankAccounts[0].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeAccounts.length, bankAccounts.length]);

  const cashDiscrepancy = selectedShiftId ? received - Number(combinedSummary.cash) : 0;

  const onSubmit = (d: CollectForm) => {
    if (selectedShiftId) {
      if (Number(combinedSummary.card) > 0 && !d.bankAccountId) {
        setError('bankAccountId', { message: 'Required: card sales exist for this shift' });
        return;
      }
    }
    mutation.mutate(d);
  };

  const mutation = useMutation({
    mutationFn: (d: CollectForm) => api.post('/accounts/collect', {
      shiftId: d.shiftId,
      cashAccountId: d.cashAccountId,
      bankAccountId: d.bankAccountId || undefined,
      amountReceived: d.amountReceived,
      notes: d.notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['shifts'] });
      onClose();
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['shifts'] });
      if (selectedShiftId) {
        qc.invalidateQueries({ queryKey: ['shift', selectedShiftId] });
        qc.invalidateQueries({ queryKey: ['shift-sales', selectedShiftId] });
        qc.invalidateQueries({ queryKey: ['shift-summary', selectedShiftId] });
        qc.invalidateQueries({ queryKey: ['shift-pos-sales', selectedShiftId] });
        qc.invalidateQueries({ queryKey: ['shift-pos-summary', selectedShiftId] });
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><HandCoins size={18} className="text-teal" /> {t('accounts.collectTitle')}</h2>
          <button onClick={onClose}><X size={20} className="text-text-muted hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Shift select */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('accounts.closedShift')}</label>
            <select {...register('shiftId')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
              <option value="">{t('common.selectShift')}</option>
              {closedShifts.map(s => <option key={s.id} value={s.id}>{s.employeeName || s.employeeId} — {new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date((s as any).startedAt || Date.now()))}</option>)}
            </select>
            {closedShifts.length === 0 && <p className="text-warning text-xs mt-1">{t('accounts.noClosedShifts')}</p>}
            {errors.shiftId && <p className="text-danger text-xs mt-1">{errors.shiftId.message}</p>}
          </div>

          {/* Payment breakdown */}
          {selectedShiftId && (
            <div className="bg-bg-primary rounded-xl overflow-hidden border border-border">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{t('shifts.salesBreakdown')}</p>
              </div>

              {/* Cash row */}
              <div className="border-b border-border/50">
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center"><Banknote size={14} className="text-success" /></div>
                    <div>
                      <p className="text-sm font-medium text-white">{t('accounts.cashToSafe')}</p>
                      <p className="text-xs text-text-muted">{combinedSummary.cashCount} {t('accounts.salesCount')} · {Number(combinedSummary.cashLiters).toFixed(0)} L</p>
                    </div>
                  </div>
                  <span className="text-success font-bold text-sm">SAR {Number(combinedSummary.cash).toFixed(2)}</span>
                </div>
                <div className="px-3 pb-2.5">
                  <select {...register('cashAccountId')} className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-success">
                    <option value="">{t('accounts.selectSafe')}</option>
                    {safeAccounts.map(a => <option key={a.id} value={a.id}>{a.name} (SAR {Number(a.balance).toFixed(0)})</option>)}
                  </select>
                  {errors.cashAccountId && <p className="text-danger text-xs mt-1">{errors.cashAccountId.message}</p>}
                </div>
              </div>

              {/* Card row */}
              <div className="border-b border-border/50">
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><CreditCard size={14} className="text-primary" /></div>
                    <div>
                      <p className="text-sm font-medium text-white">{t('accounts.cardToBank')}</p>
                      <p className="text-xs text-text-muted">{combinedSummary.cardCount} {t('accounts.salesCount')} · {Number(combinedSummary.cardLiters).toFixed(0)} L</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-primary font-bold text-sm block">SAR {Number(combinedSummary.card).toFixed(2)}</span>
                      {combinedSummary.cardCount > 0 && <span className="text-xs text-text-muted">{t('accounts.verifyReceipts')}</span>}
                  </div>
                </div>
                <div className="px-3 pb-2.5">
                  <select {...register('bankAccountId')} className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
                    <option value="">{Number(combinedSummary.card) === 0 ? t('accounts.noCardSales') : t('accounts.selectBank')}</option>
                    {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name} (SAR {Number(a.balance).toFixed(0)})</option>)}
                  </select>
                  {errors.bankAccountId && <p className="text-danger text-xs mt-1">{errors.bankAccountId.message}</p>}
                </div>
              </div>

              {/* Credit row */}
              <div>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center"><Receipt size={14} className="text-warning" /></div>
                    <div>
                      <p className="text-sm font-medium text-white">{t('accounts.creditReceivableLabel', { defaultValue: 'Credit (Receivable)' })}</p>
                      <p className="text-xs text-text-muted">{combinedSummary.creditCount} {t('accounts.salesCount')} · {Number(combinedSummary.creditLiters).toFixed(0)} L</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-warning font-bold text-sm block">SAR {Number(combinedSummary.credit).toFixed(2)}</span>
                      {combinedSummary.creditCount > 0 && <span className="text-xs text-text-muted">{t('accounts.pendingCollection', { defaultValue: 'pending collection' })}</span>}
                  </div>
                </div>
                <div className="px-3 pb-2.5">
                  <p className="text-xs text-text-muted">
                    {Number(combinedSummary.credit) === 0
                      ? t('accounts.noCreditSales')
                      : t('accounts.creditWillBeCollectedLater', { defaultValue: 'This stays as receivable and is collected later from Accounts.' })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cash received */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('common.cash')} ({t('common.amount')})</label>
            <input type="number" step="0.01" {...register('amountReceived')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary" placeholder="0.00" />
            {selectedShiftId && <p className="text-xs text-text-muted mt-1">{t('accounts.expectedCash')}: SAR {Number(combinedSummary.cash).toFixed(2)}</p>}
          </div>

          {/* Cash discrepancy */}
          {selectedShiftId && (
            <div className={clsx('rounded-xl p-3 text-sm font-medium flex items-center justify-between', cashDiscrepancy === 0 ? 'bg-success/10 text-success' : cashDiscrepancy > 0 ? 'bg-primary/10 text-primary' : 'bg-danger/10 text-danger')}>
              <div className="flex items-center gap-2">
                {cashDiscrepancy === 0 ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                {t('accounts.cashDiscrepancy')}
              </div>
              <span>{cashDiscrepancy >= 0 ? '+' : ''}{cashDiscrepancy.toFixed(2)} SAR</span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('accounts.notes')} ({t('common.optional')})</label>
            <input {...register('notes')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary" />
          </div>

          {mutation.isError && <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{(mutation.error as any)?.response?.data?.message || 'Error'}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:text-white transition-all">{t('common.close')}</button>
            <button type="submit" disabled={mutation.isPending || closedShifts.length === 0} className="flex-1 py-2.5 bg-teal text-white font-semibold rounded-lg text-sm hover:bg-teal/90 disabled:opacity-60">
              {mutation.isPending ? t('common.saving') : t('accounts.collectTitle')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


const creditCollectSchema = z.object({
  paymentMethod: z.enum(['cash', 'card']),
  toAccountId: z.string().min(1, 'Select destination account'),
  amount: z.coerce.number().positive('Amount must be > 0'),
  notes: z.string().optional(),
});
type CreditCollectForm = z.infer<typeof creditCollectSchema>;

function CollectCreditModal({ accounts, onClose }: { accounts: Account[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreditCollectForm>({
    resolver: zodResolver(creditCollectSchema),
    defaultValues: { paymentMethod: 'cash' },
  });

  const { data: creditSummary } = useQuery<CreditSummary>({
    queryKey: ['credit-summary'],
    queryFn: () => api.get('/accounts/credit-summary').then((r) => r.data),
  });

  const paymentMethod = watch('paymentMethod');
  const targetAccounts = accounts.filter((a) => (paymentMethod === 'cash' ? a.type === 'safe' : a.type === 'bank'));

  useEffect(() => {
    if (targetAccounts.length === 1) setValue('toAccountId', targetAccounts[0].id);
  }, [targetAccounts, setValue]);

  const mutation = useMutation({
    mutationFn: (d: CreditCollectForm) => api.post('/accounts/collect-credit', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['credit-summary'] });
      onClose();
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['credit-summary'] });
    },
  });

  const onSubmit = (d: CreditCollectForm) => {
    const outstanding = Number(creditSummary?.outstanding ?? 0);
    if (d.amount > outstanding) return;
    mutation.mutate(d);
  };

  const outstanding = Number(creditSummary?.outstanding ?? 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Receipt size={18} className="text-warning" /> {t('accounts.collectCreditTitle', { defaultValue: 'Collect Credit' })}</h2>
          <button onClick={onClose}><X size={20} className="text-text-muted hover:text-white" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="bg-bg-primary border border-border rounded-lg px-3 py-2.5">
            <p className="text-xs text-text-secondary uppercase tracking-wide">{t('accounts.outstandingCredit', { defaultValue: 'Outstanding Credit' })}</p>
            <p className="text-xl font-bold text-warning mt-0.5">SAR {outstanding.toFixed(2)}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('accounts.collectionMethod', { defaultValue: 'Collection Method' })}</label>
            <select {...register('paymentMethod')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
              <option value="cash">{t('common.cash')}</option>
              <option value="card">{t('common.card')}</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">
              {paymentMethod === 'cash'
                ? t('accounts.cashToSafe')
                : t('accounts.cardToBank')}
            </label>
            <select {...register('toAccountId')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
              <option value="">{paymentMethod === 'cash' ? t('accounts.selectSafe') : t('accounts.selectBank')}</option>
              {targetAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} (SAR {Number(a.balance).toFixed(0)})</option>)}
            </select>
            {errors.toAccountId && <p className="text-danger text-xs mt-1">{errors.toAccountId.message}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('common.amount')}</label>
            <input type="number" step="0.01" max={outstanding} {...register('amount')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary" placeholder="0.00" />
            {errors.amount && <p className="text-danger text-xs mt-1">{errors.amount.message}</p>}
            {!errors.amount && <p className="text-xs text-text-muted mt-1">{t('accounts.maxAllowed', { defaultValue: 'Max allowed' })}: SAR {outstanding.toFixed(2)}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('accounts.notes')} ({t('common.optional')})</label>
            <input {...register('notes')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary" placeholder={t('accounts.form.reasonPlaceholder')} />
          </div>

          {mutation.isError && <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{(mutation.error as any)?.response?.data?.message || 'Error'}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:text-white transition-all">{t('common.close')}</button>
            <button type="submit" disabled={mutation.isPending || outstanding <= 0} className="flex-1 py-2.5 bg-warning text-bg-primary font-semibold rounded-lg text-sm hover:bg-warning/90 disabled:opacity-60">
              {mutation.isPending ? t('common.saving') : t('accounts.collectCreditTitle', { defaultValue: 'Collect Credit' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ── Reverse Collect Cash Modal ─────────────────────────────────────────────────
const reverseCollectSchema = z.object({
  shiftId: z.string().min(1, 'Select a collected shift'),
  notes: z.string().min(3, 'Provide a reason for reversal (min 3 characters)'),
});
type ReverseCollectForm = z.infer<typeof reverseCollectSchema>;

function ReverseCollectModal({ accounts, onClose }: { accounts: Account[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { t, i18n } = useTranslation();
  
  // Fetch shifts and filter for those already 'collected'
  const { data: shifts = [] } = useQuery<Shift[]>({ 
    queryKey: ['shifts'], 
    queryFn: () => api.get('/shifts').then(r => r.data) 
  });
  const collectedShifts = (shifts as Shift[]).filter(s => s.status === 'reconciled');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ReverseCollectForm>({ 
    resolver: zodResolver(reverseCollectSchema) 
  });
  
  const selectedShiftId = watch('shiftId');

  // Fetch the shift summaries to show the user what will be reversed
  const { data: fuelSummary } = useQuery<PaymentSummary>({
    queryKey: ['shift-summary', selectedShiftId],
    queryFn: () => api.get(`/sales/shift/${selectedShiftId}/summary`).then(r => r.data),
    enabled: !!selectedShiftId,
  });

  const { data: posSummary } = useQuery<PosPaymentSummary>({
    queryKey: ['shift-pos-summary', selectedShiftId],
    queryFn: () => api.get(`/pos/sales/shift/${selectedShiftId}/summary`).then(r => r.data),
    enabled: !!selectedShiftId,
  });

  const combinedSummary = {
    cash: Number(fuelSummary?.cash ?? 0) + Number(posSummary?.cash ?? 0),
    card: Number(fuelSummary?.card ?? 0) + Number(posSummary?.card ?? 0),
    cashCount: Number(fuelSummary?.cashCount ?? 0) + Number(posSummary?.cashCount ?? 0),
    cardCount: Number(fuelSummary?.cardCount ?? 0) + Number(posSummary?.cardCount ?? 0),
  };

  const mutation = useMutation({
    mutationFn: (d: ReverseCollectForm) => api.post('/accounts/reverse-collect', {
      shiftId: d.shiftId,
      notes: d.notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['shifts'] });
      onClose();
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['shifts'] });
      if (selectedShiftId) {
        qc.invalidateQueries({ queryKey: ['shift', selectedShiftId] });
        qc.invalidateQueries({ queryKey: ['shift-sales', selectedShiftId] });
        qc.invalidateQueries({ queryKey: ['shift-summary', selectedShiftId] });
        qc.invalidateQueries({ queryKey: ['shift-pos-sales', selectedShiftId] });
        qc.invalidateQueries({ queryKey: ['shift-pos-summary', selectedShiftId] });
      }
    },
  });

  const onSubmit = (d: ReverseCollectForm) => {
    mutation.mutate(d);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <RotateCcw size={18} className="text-danger" /> 
            {t('accounts.reverseCollectTitle', { defaultValue: 'Reverse Collection' })}
          </h2>
          <button onClick={onClose}>
            <X size={20} className="text-text-muted hover:text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          
          {/* Shift Select */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">
              {t('accounts.collectedShift', { defaultValue: 'Collected Shift' })}
            </label>
            <select 
              {...register('shiftId')} 
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-danger"
            >
              <option value="">{t('common.selectShift')}</option>
              {collectedShifts.map(s => (
                <option key={s.id} value={s.id}>
                  {s.employeeName || s.employeeId} — {new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date((s as any).startedAt || Date.now()))}
                </option>
              ))}
            </select>
            {collectedShifts.length === 0 && (
              <p className="text-warning text-xs mt-1">{t('accounts.noCollectedShifts', { defaultValue: 'No collected shifts available to reverse' })}</p>
            )}
            {errors.shiftId && <p className="text-danger text-xs mt-1">{errors.shiftId.message}</p>}
          </div>

          {/* Warning Banner */}
          {selectedShiftId && (
            <div className="bg-danger/10 border border-danger/20 text-danger rounded-xl p-3 text-sm flex gap-2.5 items-start">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{t('common.warning', { defaultValue: 'Attention' })}</p>
                <p className="text-xs opacity-90 mt-0.5">
                  {t('accounts.reverseWarningText', { defaultValue: 'This action will reverse the transaction and deduct the amounts shown below from their respective safe and bank accounts.' })}
                </p>
              </div>
            </div>
          )}

          {/* Reversal Breakdown (Read-only Summary) */}
          {selectedShiftId && (
            <div className="bg-bg-primary rounded-xl overflow-hidden border border-border opacity-80">
              <div className="px-3 py-2 border-b border-border bg-bg-secondary/50">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  {t('accounts.amountsToDeduct', { defaultValue: 'Amounts to Deduct' })}
                </p>
              </div>

              {/* Cash Deduction */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-danger/10 flex items-center justify-center">
                    <Banknote size={14} className="text-danger" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t('accounts.cashFromSafe', { defaultValue: 'Deduct from Safe' })}</p>
                    <p className="text-xs text-text-muted">{combinedSummary.cashCount} {t('accounts.salesCount')}</p>
                  </div>
                </div>
                <span className="text-danger font-bold text-sm">-SAR {Number(combinedSummary.cash).toFixed(2)}</span>
              </div>

              {/* Card Deduction */}
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-danger/10 flex items-center justify-center">
                    <CreditCard size={14} className="text-danger" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t('accounts.cardFromBank', { defaultValue: 'Deduct from Bank' })}</p>
                    <p className="text-xs text-text-muted">{combinedSummary.cardCount} {t('accounts.salesCount')}</p>
                  </div>
                </div>
                <span className="text-danger font-bold text-sm">-SAR {Number(combinedSummary.card).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Reason for Reversal */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">
              {t('accounts.reversalReason', { defaultValue: 'Reason for Reversal' })}
            </label>
            <input 
              {...register('notes')} 
              placeholder={t('accounts.reversalReasonPlaceholder', { defaultValue: 'e.g., Wrong safe selected, cash discrepancy error' })}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-danger" 
            />
            {errors.notes && <p className="text-danger text-xs mt-1">{errors.notes.message}</p>}
          </div>

          {/* Server Error Handling */}
          {mutation.isError && (
            <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {(mutation.error as any)?.response?.data?.message || 'Error executing reversal'}
            </p>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:text-white transition-all"
            >
              {t('common.close')}
            </button>
            <button 
              type="submit" 
              disabled={mutation.isPending || collectedShifts.length === 0} 
              className="flex-1 py-2.5 bg-danger text-white font-semibold rounded-lg text-sm hover:bg-danger/90 disabled:opacity-60 transition-all"
            >
              {mutation.isPending ? t('common.saving') : t('accounts.reverseButton', { defaultValue: 'Confirm Reversal' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function AccountsPage() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const [transferModal, setTransferModal] = useState(false);
  const [collectModal, setCollectModal] = useState(false);
  const [collectCreditModal, setCollectCreditModal] = useState(false);
  const [reverseCollectModal, setReverseCollectModal] = useState(false);
  const [statementAccount, setStatementAccount] = useState<Account | null>(null);

  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: transactions = [] } = useQuery<Tx[]>({
    queryKey: ['transactions'],
    queryFn: () => api.get('/accounts/transactions').then(r => r.data),
    refetchInterval: 30_000,
  });

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

  const { page: txPage, setPage: setTxPage, totalPages: txTotalPages, paged: pagedTx, start: txStart, end: txEnd } = usePagination(transactions, 15);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('accounts.title')}</h1>
          <p className="text-text-secondary text-sm mt-0.5">{t('accounts.totalBalance', { n: totalBalance.toFixed(2) })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCollectModal(true)} className="flex items-center gap-2 bg-teal text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-teal/90 transition-all">
            <HandCoins size={16} /> {t('accounts.collectTitle')}
          </button>
          <button onClick={() => setCollectCreditModal(true)} className="flex items-center gap-2 bg-warning text-bg-primary font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-warning/90 transition-all">
            <Receipt size={16} /> {t('accounts.collectCreditTitle', { defaultValue: 'Collect Credit' })}
          </button>
          <button onClick={() => setTransferModal(true)} className="flex items-center gap-2 bg-bg-card border border-border text-text-secondary hover:text-white hover:border-border-light font-semibold px-4 py-2.5 rounded-xl text-sm transition-all">
            <ArrowLeftRight size={16} /> {t('accounts.transferFunds')}
          </button>
          <button 
            onClick={() => setReverseCollectModal(true)} 
            className="flex items-center gap-2 bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
          >
            <RotateCcw size={16} /> {t('accounts.reverseCollectTitle', { defaultValue: 'Reverse Collection' })}
          </button>
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? [1,2].map(i => <div key={i} className="bg-bg-card border border-border rounded-2xl h-32 animate-pulse" />) :
          accounts.map(acc => (
            <button
              key={acc.id}
              onClick={() => setStatementAccount(acc)}
              className="bg-bg-card border border-border rounded-2xl p-6 hover:border-border-light transition-all text-left w-full group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', acc.type === 'safe' ? 'bg-teal/10' : acc.type === 'bank' ? 'bg-primary/10' : 'bg-warning/10')}>
                  {acc.type === 'safe' ? <Wallet size={20} className="text-teal" /> : acc.type === 'bank' ? <CreditCard size={20} className="text-primary" /> : <BookOpen size={20} className="text-warning" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{acc.name}</p>
                  <p className="text-xs text-text-secondary capitalize">{t(`accounts.types.${acc.type}`)}</p>
                </div>
                <ChevronRight size={16} className="text-text-muted group-hover:text-text-secondary transition-colors shrink-0" />
              </div>
              <p className="text-3xl font-bold text-white">SAR {Number(acc.balance).toFixed(2)}</p>
              <p className="text-xs text-text-muted mt-1">{acc.currency}</p>
            </button>
          ))
        }
      </div>

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-white mb-3">{t('accounts.accountStatement')}</h2>
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-secondary">
                <tr>
                  <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase`}>{t('common.time')}</th>
                  <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase`}>{t('common.status')}</th>
                  <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase`}>{t('common.amount')}</th>
                  <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase`}>{t('accounts.notes')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagedTx.map(tx => (
                  <tr key={tx.id} className="hover:bg-bg-secondary/50 transition-colors">
                    <td className="px-5 py-3 text-text-secondary">{new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(tx.createdAt))}</td>
                    <td className="px-5 py-3 capitalize text-white">{t(`accounts.categories.${tx.category}`, { defaultValue: tx.category.replace('_', ' ') })}</td>
                    <td className="px-5 py-3">
                      <span className={clsx('font-bold flex items-center gap-1', tx.type === 'credit' ? 'text-success' : 'text-danger')}>
                        {tx.type === 'credit' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {tx.type === 'credit' ? '+' : '-'}SAR {Number(tx.amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-text-muted">{tx.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={txPage} totalPages={txTotalPages} start={txStart} end={txEnd} total={transactions.length} onPageChange={setTxPage} />
          </div>
        </div>
      )}

      {transferModal && <TransferModal accounts={accounts} onClose={() => setTransferModal(false)} />}
      {collectModal && <CollectModal accounts={accounts} onClose={() => setCollectModal(false)} />}
      {collectCreditModal && <CollectCreditModal accounts={accounts} onClose={() => setCollectCreditModal(false)} />}
      {reverseCollectModal && <ReverseCollectModal accounts={accounts} onClose={() => setReverseCollectModal(false)} />}
      {statementAccount && <StatementDrawer account={statementAccount} onClose={() => setStatementAccount(null)} />}
    </div>
  );
}
