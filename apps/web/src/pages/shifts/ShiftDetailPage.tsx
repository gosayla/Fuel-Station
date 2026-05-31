import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import {
  ArrowLeft,
  ArrowRight,
  Droplets,
  Banknote,
  CreditCard,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { usePagination, Pagination } from '../../components/Pagination';

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

interface Sale {
  id: string;
  tankId: string;
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'credit';
  createdAt: string;
}

interface PosSale {
  id: string;
  totalItems: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'credit';
  createdAt: string;
}

interface PosSummary {
  cash: number;
  card: number;
  credit: number;
  cashCount: number;
  cardCount: number;
  creditCount: number;
  totalItems: number;
}

interface CombinedSale {
  id: string;
  source: 'fuel' | 'pos';
  createdAt: string;
  paymentMethod: 'cash' | 'card' | 'credit';
  amount: number;
  liters?: number;
  totalItems?: number;
  tankLabel?: string;
}

interface Tank {
  id: string;
  name: string;
  fuelType: string;
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-success/10 text-success border-success/20',
  closed: 'bg-warning/10 text-warning border-warning/20',
  reconciled: 'bg-primary/10 text-primary border-primary/20',
};

const PAYMENT_ICON: Record<string, React.ReactNode> = {
  cash: <Banknote size={12} />,
  card: <CreditCard size={12} />,
  credit: <BookOpen size={12} />,
};

const PAYMENT_STYLES: Record<string, string> = {
  cash: 'bg-success/10 text-success',
  card: 'bg-primary/10 text-primary',
  credit: 'bg-warning/10 text-warning',
};

function StatCard({
  label,
  value,
  sub,
  color = 'text-white',
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{label}</p>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      <p className={clsx('text-xl font-bold', color)}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  );
}

export function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';

  const { data: shift, isLoading: shiftLoading } = useQuery<Shift>({
    queryKey: ['shift', id],
    queryFn: () => api.get(`/shifts/${id}`).then((r) => r.data),
    enabled: !!id,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: sales = [], isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ['shift-sales', id],
    queryFn: () => api.get(`/sales/shift/${id}`).then((r) => r.data),
    enabled: !!id,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const {
    data: posSales = [],
    isLoading: posSalesLoading,
    isError: posSalesError,
  } = useQuery<PosSale[]>({
    queryKey: ['shift-pos-sales', id],
    queryFn: () => api.get(`/pos/sales/shift/${id}`).then((r) => r.data),
    enabled: !!id,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const {
    data: posSummary,
    isError: posSummaryError,
  } = useQuery<PosSummary>({
    queryKey: ['shift-pos-summary', id],
    queryFn: () => api.get(`/pos/sales/shift/${id}/summary`).then((r) => r.data),
    enabled: !!id,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: tanks = [] } = useQuery<Tank[]>({
    queryKey: ['tanks'],
    queryFn: () => api.get('/tanks').then((r) => r.data),
  });

  const tankMap = Object.fromEntries(tanks.map((t) => [t.id, t]));

  const fuelSummary = sales.reduce(
    (acc, sale) => {
      acc[sale.paymentMethod] += Number(sale.totalAmount);
      return acc;
    },
    { cash: 0, card: 0, credit: 0 },
  );

  const combinedPaymentSummary = {
    cash: fuelSummary.cash + Number(posSummary?.cash ?? 0),
    card: fuelSummary.card + Number(posSummary?.card ?? 0),
    credit: fuelSummary.credit + Number(posSummary?.credit ?? 0),
  };

  const combinedSales: CombinedSale[] = [
    ...sales.map((sale) => ({
      id: sale.id,
      source: 'fuel' as const,
      createdAt: sale.createdAt,
      paymentMethod: sale.paymentMethod,
      amount: Number(sale.totalAmount),
      liters: Number(sale.liters),
      tankLabel: tankMap[sale.tankId]?.name ?? sale.tankId.slice(0, 8),
    })),
    ...posSales.map((sale) => ({
      id: sale.id,
      source: 'pos' as const,
      createdAt: sale.createdAt,
      paymentMethod: sale.paymentMethod,
      amount: Number(sale.totalAmount),
      totalItems: Number(sale.totalItems),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const { page, setPage, totalPages, paged: pagedSales, start, end } = usePagination(combinedSales, 15);

  if (shiftLoading) {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="h-8 bg-bg-card rounded-xl w-48 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-bg-card border border-border rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
        <div className="bg-bg-card border border-border rounded-2xl h-64 animate-pulse" />
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-20 text-text-muted">
        <p className="text-lg font-medium">{t('shifts.notFound')}</p>
        <button
          onClick={() => navigate('/shifts')}
          className="mt-4 text-primary text-sm underline"
        >
          {t('shifts.backToShifts')}
        </button>
      </div>
    );
  }

  const durationMs = shift.closedAt
    ? new Date(shift.closedAt).getTime() - new Date(shift.startedAt).getTime()
    : Date.now() - new Date(shift.startedAt).getTime();
  const totalMinutes = Math.round(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const discrepancy =
    shift.discrepancy !== null && shift.discrepancy !== undefined
      ? Number(shift.discrepancy)
      : null;

  const totalSalesAmount = combinedSales.reduce((s, x) => s + Number(x.amount), 0);
  const totalSalesLiters = sales.reduce((s, x) => s + Number(x.liters), 0);
  const totalPosItems = posSales.reduce((s, x) => s + Number(x.totalItems), 0);
  const isAnySalesLoading = salesLoading || posSalesLoading;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/shifts')}
          className="w-9 h-9 rounded-xl bg-bg-card border border-border flex items-center justify-center text-text-secondary hover:text-white hover:border-border-light transition-all"
        >
          {rtl ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">
              {shift.employeeName ?? t('shifts.details')}
            </h1>
            <span
              className={clsx(
                'text-xs font-semibold px-2.5 py-1 rounded-full border capitalize',
                STATUS_STYLES[shift.status],
              )}
            >
              {t(`shifts.status.${shift.status}`)}
            </span>
          </div>
          <p className="text-text-secondary text-sm mt-0.5">
            {format(new Date(shift.startedAt), 'MMM d, yyyy · HH:mm')}
            {shift.closedAt && ` → ${format(new Date(shift.closedAt), 'HH:mm')}`}
            {' · '}
            {durationStr}
          </p>
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t('common.totalRevenue')}
          value={`SAR ${Number(shift.totalRevenue).toFixed(2)}`}
          sub={`${Number(shift.totalLitersSold).toFixed(1)} ${t('common.litersSold')}`}
          icon={<TrendingUp size={16} />}
        />
        <StatCard
          label={t('common.cash')}
          value={`SAR ${Number(shift.cashRevenue).toFixed(2)}`}
          color="text-success"
          icon={<Banknote size={16} />}
        />
        <StatCard
          label={t('common.card')}
          value={`SAR ${Number(shift.cardRevenue).toFixed(2)}`}
          color="text-primary"
          icon={<CreditCard size={16} />}
        />
        <StatCard
          label={t('common.credit')}
          value={`SAR ${Number(shift.creditRevenue).toFixed(2)}`}
          color="text-warning"
          icon={<BookOpen size={16} />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label={t('common.cash')}
          value={`SAR ${combinedPaymentSummary.cash.toFixed(2)}`}
          color="text-success"
          sub={t('shifts.salesBreakdown')}
        />
        <StatCard
          label={t('common.card')}
          value={`SAR ${combinedPaymentSummary.card.toFixed(2)}`}
          color="text-primary"
          sub={t('shifts.salesBreakdown')}
        />
        <StatCard
          label={t('common.credit')}
          value={`SAR ${combinedPaymentSummary.credit.toFixed(2)}`}
          color="text-warning"
          sub={t('shifts.salesBreakdown')}
        />
      </div>

      {/* Cash reconciliation row (closed / reconciled shifts) */}
      {shift.status !== 'open' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            label={t('shifts.openingCash')}
            value={`SAR ${Number(shift.openingCash).toFixed(2)}`}
          />
          <StatCard
            label={t('shifts.expectedCash')}
            value={`SAR ${Number(shift.expectedCash).toFixed(2)}`}
          />
          {discrepancy !== null && (
            <StatCard
              label={t('shifts.discrepancy')}
              value={`${discrepancy >= 0 ? '+' : ''}${discrepancy.toFixed(2)} SAR`}
              sub={
                shift.actualCash !== undefined && shift.actualCash !== null
                  ? t('shifts.actualCashLabel', { n: Number(shift.actualCash).toFixed(2) })
                  : undefined
              }
              color={
                discrepancy === 0
                  ? 'text-success'
                  : discrepancy > 0
                  ? 'text-primary'
                  : 'text-danger'
              }
            />
          )}
        </div>
      )}

      {/* Sales records table */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Droplets size={16} className="text-primary" />
            {t('shifts.salesRecords')}
          </h2>
          <span className="text-xs text-text-muted">
            {!rtl ? combinedSales.length : ''} {t('common.total').toLowerCase()} {rtl ? combinedSales.length : ''}
          </span>
        </div>

        {(posSalesError || posSummaryError) && (
          <div className="px-5 py-3 border-b border-border text-xs text-warning bg-warning/5">
            {t('common.warning', { defaultValue: 'Warning' })}: {t('reports.partialDataHint', { defaultValue: 'POS data is temporarily unavailable. Showing available shift data.' })}
          </div>
        )}

        {isAnySalesLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-11 bg-bg-secondary rounded-xl animate-pulse" />
            ))}
          </div>
        ) : combinedSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Droplets size={36} className="mb-2 opacity-30" />
            <p className="text-sm">{t('shifts.noSales')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide`}>
                    {t('common.time')}
                  </th>
                  <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide`}>
                    {t('common.type', { defaultValue: 'Type' })}
                  </th>
                  <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide`}>
                    {t('common.details', { defaultValue: 'Details' })}
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    {t('common.amount')}
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    {t('common.payment')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedSales.map((sale, idx) => {
                  const isFuel = sale.source === 'fuel';
                  return (
                    <tr
                      key={sale.id}
                      className={clsx(
                        'border-b border-border/50 hover:bg-bg-secondary/50 transition-colors',
                        idx === pagedSales.length - 1 && 'border-b-0',
                      )}
                    >
                      <td className="px-5 py-3 text-text-secondary tabular-nums">
                        {format(new Date(sale.createdAt), 'HH:mm:ss')}
                      </td>
                      <td className="px-5 py-3 text-white">
                        <span className={clsx(
                          'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                          isFuel ? 'bg-primary/10 text-primary' : 'bg-teal/10 text-teal',
                        )}>
                          {isFuel ? t('nav.sales', { defaultValue: 'Fuel' }) : t('nav.pos', { defaultValue: 'POS' })}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-white">
                        {isFuel
                          ? `${sale.tankLabel} · ${Number(sale.liters ?? 0).toFixed(2)} L`
                          : `${Number(sale.totalItems ?? 0).toFixed(2)} items`}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-white tabular-nums">
                        SAR {Number(sale.amount).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                            PAYMENT_STYLES[sale.paymentMethod],
                          )}
                        >
                          {PAYMENT_ICON[sale.paymentMethod]}
                          {sale.paymentMethod}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-bg-secondary/50 border-t border-border">
                  <td
                    colSpan={2}
                    className="px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide"
                  >
                    {t('common.total')}
                  </td>
                  <td className="px-5 py-3 text-white text-xs">
                    {t('common.litersSold')}: {totalSalesLiters.toFixed(2)} L · {totalPosItems.toFixed(2)} items
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-white tabular-nums">
                    SAR {totalSalesAmount.toFixed(2)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
            <Pagination page={page} totalPages={totalPages} start={start} end={end} total={combinedSales.length} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
