import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { Play, StopCircle, CheckCheck, Clock, X, User, DollarSign, Banknote, CreditCard, BookOpen } from 'lucide-react';
import clsx from 'clsx';


interface Shift {
  id: string;
  employeeId: string;
  employeeName?: string;
  startedAt: string;
  closedAt?: string;
  openingCash: number;
  expectedCash: number;
  actualCash?: number;
  discrepancy?: number;
  totalLitersSold: number;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  creditRevenue: number;
  status: 'open' | 'closed' | 'reconciled';
}

interface Employee { id: string; name: string; role: string; }

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-success/10 text-success border-success/20',
  closed: 'bg-warning/10 text-warning border-warning/20',
  reconciled: 'bg-primary/10 text-primary border-primary/20',
};

// ── Open Shift Modal ──────────────────────────────────────────────────────────
const openSchema = z.object({
  employeeId: z.string().min(1, 'Select an employee'),
  openingCash: z.coerce.number().min(0),
});
type OpenForm = z.infer<typeof openSchema>;

function OpenShiftModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => api.get('/users/employees').then(r => r.data),
  });
  const { register, handleSubmit, formState: { errors } } = useForm<OpenForm>({
    resolver: zodResolver(openSchema),
    defaultValues: { openingCash: 0 },
  });
  const mutation = useMutation({
    mutationFn: (d: OpenForm) => api.post('/shifts', { employeeId: d.employeeId, openingCash: d.openingCash }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shifts'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Play size={18} className="text-success" /> {t('shifts.title')} — {t('shifts.form.employee')}</h2>
          <button onClick={onClose}><X size={20} className="text-text-muted hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('shifts.form.employee')}</label>
            <select {...register('employeeId')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors">
              <option value="">{t('common.selectEmployee')}</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            {errors.employeeId && <p className="text-danger text-xs mt-1">{errors.employeeId.message}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('shifts.form.openingCash')}</label>
            <input type="number" step="0.01" {...register('openingCash')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors" placeholder="0.00" />
          </div>
          {mutation.isError && <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{(mutation.error as any)?.response?.data?.message || 'Error'}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:text-white transition-all">{t('common.close')}</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 bg-success text-white font-semibold rounded-lg text-sm hover:bg-success/90 disabled:opacity-60">
              {mutation.isPending ? t('shifts.opening') : t('shifts.title')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Close Shift Modal ─────────────────────────────────────────────────────────
const closeSchema = z.object({ actualCash: z.coerce.number().min(0) });
type CloseForm = z.infer<typeof closeSchema>;

function CloseShiftModal({ shift, onClose }: { shift: Shift; onClose: () => void }) {
  const qc = useQueryClient();
  const { t } = useTranslation();

  const cashRevenue = Number(shift.cashRevenue) || 0;
  const cardRevenue = Number(shift.cardRevenue) || 0;
  const creditRevenue = Number(shift.creditRevenue) || 0;
  const expectedCash = Number(shift.openingCash) + cashRevenue;

  const { register, handleSubmit, watch } = useForm<CloseForm>({
    resolver: zodResolver(closeSchema),
    defaultValues: { actualCash: expectedCash },
  });
  const actualCash = Number(watch('actualCash')) || 0;
  const discrepancy = actualCash - expectedCash;

  const mutation = useMutation({
    mutationFn: (d: CloseForm) => api.patch(`/shifts/${shift.id}/close`, { actualCash: d.actualCash }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shifts'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><StopCircle size={18} className="text-warning" /> {t('shifts.confirmClose').split('?')[0]}</h2>
          <button onClick={onClose}><X size={20} className="text-text-muted hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-4">

          {/* Revenue breakdown */}
          <div className="bg-bg-primary rounded-xl overflow-hidden border border-border">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{t('shifts.salesBreakdown')}</p>
            </div>
            <div className="flex justify-between items-center px-3 py-2.5 border-b border-border/50">
              <span className="text-sm text-text-secondary">{t('common.totalRevenue')}</span>
              <span className="text-white font-semibold text-sm">SAR {Number(shift.totalRevenue).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2.5 border-b border-border/50">
              <div className="flex items-center gap-2"><Banknote size={14} className="text-success" /><span className="text-sm text-text-secondary">{t('common.cash')}</span></div>
              <span className="text-success font-medium text-sm">SAR {cashRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2.5 border-b border-border/50">
              <div className="flex items-center gap-2"><CreditCard size={14} className="text-primary" /><span className="text-sm text-text-secondary">{t('common.card')}</span></div>
              <span className="text-primary font-medium text-sm">SAR {cardRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2.5 border-b border-border/50">
              <div className="flex items-center gap-2"><BookOpen size={14} className="text-warning" /><span className="text-sm text-text-secondary">{t('common.credit')}</span></div>
              <span className="text-warning font-medium text-sm">SAR {creditRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2.5 border-b border-border/50">
              <span className="text-sm text-text-secondary">{t('shifts.sold')} (L)</span>
              <span className="text-white font-medium text-sm">{Number(shift.totalLitersSold).toFixed(1)} L</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2.5">
              <span className="text-sm text-text-secondary">{t('shifts.form.actualCash')}</span>
              <span className="text-white font-bold text-sm">SAR {expectedCash.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">{t('shifts.form.actualCash')}</label>
            <input type="number" step="0.01" {...register('actualCash')} className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors" placeholder="0.00" />
            <p className="text-xs text-text-muted mt-1">{t('shifts.form.actualCashHint', { opening: Number(shift.openingCash).toFixed(2), cash: cashRevenue.toFixed(2) })}</p>
          </div>

          <div className={clsx('rounded-xl p-3 text-sm font-medium text-center', discrepancy === 0 ? 'bg-success/10 text-success' : discrepancy > 0 ? 'bg-primary/10 text-primary' : 'bg-danger/10 text-danger')}>
            {t('shifts.discrepancy')}: {discrepancy >= 0 ? '+' : ''}{discrepancy.toFixed(2)} SAR
          </div>

          {mutation.isError && <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{(mutation.error as any)?.response?.data?.message || 'Error'}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:text-white transition-all">{t('common.close')}</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 bg-warning text-bg-primary font-semibold rounded-lg text-sm hover:bg-warning/90 disabled:opacity-60">
              {mutation.isPending ? t('shifts.closing') : t('shifts.close')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ShiftsPage() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false);
  const [closeShift, setCloseShift] = useState<Shift | null>(null);

  const { data: shifts = [], isLoading } = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: () => api.get('/shifts').then(r => r.data),
    refetchInterval: 30_000,
  });

  const openShifts = shifts.filter(s => s.status === 'open');
  const closedShifts = shifts.filter(s => s.status !== 'open');

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('shifts.title')}</h1>
          <p className="text-text-secondary text-sm mt-0.5">{t('shifts.subtitle', { open: openShifts.length, closed: closedShifts.length })}</p>
        </div>
        <button onClick={() => setOpenModal(true)} className="flex items-center gap-2 bg-success text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-success/90 transition-all">
          <Play style={{ transform: rtl ? 'scaleX(-1)' : 'none' }} size={16} /> {t('shifts.title')}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-bg-card border border-border rounded-2xl h-24 animate-pulse" />)}</div>
      ) : shifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Clock size={48} className="mb-3 opacity-30" />
          <p className="text-lg font-medium">{t('shifts.empty')}</p>
          <p className="text-sm mt-1">{t('shifts.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map(shift => (
            <div
              key={shift.id}
              onClick={() => navigate(`/shifts/${shift.id}`)}
              className="bg-bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-border-light transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center">
                  <User size={18} className="text-text-secondary" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{shift.employeeName || shift.employeeId}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(shift.startedAt))}
                    {shift.closedAt && ` → ${new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(shift.closedAt))}`}
                  </p>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="font-bold text-white">SAR {Number(shift.totalRevenue).toFixed(0)}</p>
                  <p className="text-xs text-text-muted">{t('common.revenue')}</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-white">{Number(shift.totalLitersSold).toFixed(0)} L</p>
                  <p className="text-xs text-text-muted">{t('shifts.sold')}</p>
                </div>
                {shift.discrepancy !== null && shift.discrepancy !== undefined && (
                  <div className="text-center">
                    <p className={clsx('font-bold', Number(shift.discrepancy) >= 0 ? 'text-success' : 'text-danger')}>
                      {Number(shift.discrepancy) >= 0 ? '+' : ''}{Number(shift.discrepancy).toFixed(2)}
                    </p>
                    <p className="text-xs text-text-muted">{t('shifts.discrepancy')}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full border', STATUS_STYLES[shift.status])}>
                  {t(`shifts.status.${shift.status}`)}
                </span>
                {shift.status === 'open' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setCloseShift(shift); }}
                    className="flex items-center gap-1.5 bg-warning/10 hover:bg-warning/20 text-warning border border-warning/20 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                  >
                    <StopCircle size={13} /> {t('shifts.close')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {openModal && <OpenShiftModal onClose={() => setOpenModal(false)} />}
      {closeShift && <CloseShiftModal shift={closeShift} onClose={() => setCloseShift(null)} />}
    </div>
  );
}
