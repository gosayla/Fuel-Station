import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, Fuel } from 'lucide-react';
import clsx from 'clsx';

const fmtSar = (n: number) =>
  `SAR ${Number(n).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CATEGORY_LABELS: Record<string, string> = {
  salary: 'Salaries',
  utilities: 'Utilities',
  maintenance: 'Maintenance',
  fuel_purchase: 'Fuel Purchase',
  other: 'Other',
};
const CATEGORY_COLORS: Record<string, string> = {
  salary: '#FFB300',
  utilities: '#00BFA5',
  maintenance: '#FF6B35',
  fuel_purchase: '#00D4FF',
  other: '#A0AEC0',
};

type RangeMode = 'all' | 7 | 14 | 30 | 'custom';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-text-secondary mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: SAR {Number(p.value).toFixed(0)}
        </p>
      ))}
    </div>
  );
};

export function ReportsPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<RangeMode>(30);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [customFrom, setCustomFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(todayStr);

  // Derive query params
  let fromParam: string | undefined;
  let toParam: string | undefined;
  if (mode !== 'all') {
    if (mode === 'custom') {
      fromParam = customFrom;
      toParam = customTo;
    } else {
      fromParam = format(subDays(new Date(), mode - 1), 'yyyy-MM-dd');
      toParam = todayStr;
    }
  }

  const { data: pl, isLoading: plLoading } = useQuery({
    queryKey: ['profit-loss', fromParam, toParam],
    queryFn: () => {
      const qs = fromParam && toParam ? `?from=${fromParam}&to=${toParam}` : '';
      return api.get(`/reports/profit-loss${qs}`).then(r => r.data);
    },
  });

  const { data: salesReport, isLoading: srLoading } = useQuery({
    queryKey: ['sales-report', fromParam, toParam],
    queryFn: () =>
      api.get(`/reports/sales?from=${fromParam}&to=${toParam}`).then(r => r.data),
    enabled: mode !== 'all' && !!fromParam && !!toParam,
  });

  const chartData = (salesReport?.byDay ?? []).map((d: any) => ({
    date: format(new Date(d.date), 'MMM d'),
    Revenue: d.revenue,
  }));

  const catData = pl?.expensesByCategory
    ? Object.entries(pl.expensesByCategory as Record<string, number>)
        .map(([cat, val]) => ({
          name: t(`reports.categories.${cat}`, { defaultValue: CATEGORY_LABELS[cat] ?? cat }),
          value: Number(val),
          fill: CATEGORY_COLORS[cat] ?? '#A0AEC0',
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  const periodLabel =
    mode === 'all'
      ? t('reports.allTime')
      : mode === 'custom'
      ? t('reports.periodLabel', { from: customFrom, to: customTo })
      : t('reports.lastNDays', { n: mode });

  const totalRevenue = pl?.totalRevenue ?? 0;
  const totalFuelPurchases = pl?.totalFuelPurchases ?? 0;
  const totalOperational = pl?.totalOperationalExpenses ?? 0;
  const totalCosts = pl?.totalCosts ?? 0;
  const netProfit = pl?.netProfit ?? 0;
  const barMax = Math.max(totalRevenue, totalCosts, 1);

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Header + period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('reports.financialReport')}</h1>
          <p className="text-text-secondary text-sm mt-0.5">{periodLabel}</p>
        </div>
        <div className="flex flex-wrap gap-1 bg-bg-card border border-border rounded-xl p-1">
          {(['all', 7, 14, 30, 'custom'] as RangeMode[]).map(m => (
            <button
              key={String(m)}
              onClick={() => setMode(m)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                mode === m
                  ? 'bg-primary text-bg-primary'
                  : 'text-text-secondary hover:text-white',
              )}
            >
              {m === 'all' ? t('reports.allTime') : m === 'custom' ? t('reports.periodLabel', { from: customFrom, to: customTo }).split('→')[0].trim() : t('reports.nDays', { n: m })}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date inputs */}
      {mode === 'custom' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs text-text-secondary mb-1.5 font-semibold uppercase tracking-wide">{t('common.from')}</label>
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={e => setCustomFrom(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-text-secondary mb-1.5 font-semibold uppercase tracking-wide">{t('common.to')}</label>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={todayStr}
              onChange={e => setCustomTo(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{t('reports.totalIncome')}</p>
            <TrendingUp size={16} className="text-success" />
          </div>
          <p className="text-2xl font-bold text-success">{plLoading ? '…' : fmtSar(totalRevenue)}</p>
          <p className="text-xs text-text-secondary mt-1">{t('reports.fromSales')}</p>
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{t('reports.fuelPurchases')}</p>
            <Fuel size={16} className="text-warning" />
          </div>
          <p className="text-2xl font-bold text-warning">{plLoading ? '…' : fmtSar(totalFuelPurchases)}</p>
          <p className="text-xs text-text-secondary mt-1">{t('reports.inventoryRestocking')}</p>
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{t('reports.operatingExpenses')}</p>
            <TrendingDown size={16} className="text-danger" />
          </div>
          <p className="text-2xl font-bold text-danger">{plLoading ? '…' : fmtSar(totalOperational)}</p>
          <p className="text-xs text-text-secondary mt-1">{t('reports.salaryUtilities')}</p>
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{t('reports.netProfit')}</p>
            <DollarSign size={16} className={netProfit >= 0 ? 'text-success' : 'text-danger'} />
          </div>
          <p className={clsx('text-2xl font-bold', plLoading ? 'text-white' : netProfit >= 0 ? 'text-success' : 'text-danger')}>
            {plLoading ? '…' : fmtSar(netProfit)}
          </p>
          <p className="text-xs text-text-secondary mt-1">{t('reports.incomeMinusExpenses')}</p>
        </div>
      </div>

      {/* Income vs Expenses visual */}
      <div className="bg-bg-card border border-border rounded-2xl p-5">
        <h2 className="text-base font-semibold text-white mb-5">{t('reports.incomeVsExpenses')}</h2>
        {plLoading ? (
          <div className="h-32 flex items-center justify-center text-text-muted text-sm">Loading…</div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {[
                { label: t('reports.totalIncome'), value: totalRevenue, color: 'bg-success', text: 'text-success' },
                { label: t('reports.fuelPurchases'), value: totalFuelPurchases, color: 'bg-warning', text: 'text-warning' },
                { label: t('reports.operatingExpenses'), value: totalOperational, color: 'bg-danger', text: 'text-danger' },
              ].map(row => (
                <div key={row.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-text-secondary">{row.label}</span>
                    <span className={clsx('font-semibold tabular-nums', row.text)}>{fmtSar(row.value)}</span>
                  </div>
                  <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-500', row.color)}
                      style={{ width: `${barMax > 0 ? (row.value / barMax) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-sm text-text-secondary font-medium">{t('reports.netProfit')}</span>
              <span className={clsx('text-xl font-bold tabular-nums', netProfit >= 0 ? 'text-success' : 'text-danger')}>
                {fmtSar(netProfit)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Expense breakdown by category */}
      {catData.length > 0 && (
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white mb-5">{t('reports.expenseBreakdown')}</h2>
          <div className="space-y-4">
            {catData.map(row => {
              const catTotal = catData.reduce((s, r) => s + r.value, 0);
              const pct = catTotal > 0 ? (row.value / catTotal) * 100 : 0;
              return (
                <div key={row.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-text-secondary">{row.name}</span>
                    <span className="font-semibold text-white tabular-nums">
                      {fmtSar(row.value)}
                      <span className="text-text-secondary font-normal ml-2 text-xs">{pct.toFixed(1)}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: row.fill }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily revenue chart (period modes only) */}
      {mode !== 'all' && (
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white mb-5">{t('reports.dailyRevenue')}</h2>
          {srLoading ? (
            <div className="h-48 flex items-center justify-center text-text-muted text-sm">Loading…</div>
          ) : chartData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-text-muted">
              <TrendingUp size={36} className="mb-2 opacity-30" />
              <p className="text-sm">{t('reports.noSalesData')}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3250" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `SAR ${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Revenue" stroke="#00D4FF" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
