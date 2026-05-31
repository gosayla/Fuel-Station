import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Plus, Receipt, X } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../../lib/api';
import { usePagination, Pagination } from '../../components/Pagination';

interface Expense {
  id: string;
  accountId: string;
  category: string;
  description: string;
  amount: number;
  paidAt: string;
}

interface Account {
  id: string;
  name: string;
  type: 'safe' | 'bank' | 'credit';
  balance: number;
}

const expenseSchema = z.object({
  accountId: z.string().min(1, 'Select account'),
  category: z.enum([
    'salary',
    'utilities',
    'maintenance',
    'fuel_purchase',
    'office_supplies',
    'cleaning_supplies',
    'other',
  ]),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be > 0'),
  paidAt: z.string().min(1, 'Date is required'),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

function AddExpenseModal({
  accounts,
  onClose,
}: {
  accounts: Account[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: 'other',
      paidAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  const selectedAccountId = watch('accountId');
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);

  const mutation = useMutation({
    mutationFn: (payload: ExpenseForm) =>
      api.post('/expenses', {
        ...payload,
        paidAt: new Date(payload.paidAt).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      onClose();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Receipt size={18} className="text-danger" />
            {t('expenses.addExpense')}
          </h2>
          <button onClick={onClose}>
            <X size={20} className="text-text-muted hover:text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">
              {t('common.selectAccount')}
            </label>
            <select
              {...register('accountId')}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
            >
              <option value="">{t('common.select')}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({t(`accounts.types.${account.type}`)})
                </option>
              ))}
            </select>
            {selectedAccount && (
              <p className="text-xs text-text-muted mt-1">
                {t('accounts.balance')}: SAR {Number(selectedAccount.balance).toFixed(2)}
              </p>
            )}
            {errors.accountId && <p className="text-danger text-xs mt-1">{errors.accountId.message}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">
              {t('expenses.category')}
            </label>
            <select
              {...register('category')}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
            >
              {[
                'salary',
                'utilities',
                'maintenance',
                'fuel_purchase',
                'office_supplies',
                'cleaning_supplies',
                'other',
              ].map((category) => (
                <option key={category} value={category}>
                  {t(`expenses.categories.${category}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">
              {t('expenses.description')}
            </label>
            <input
              {...register('description')}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
              placeholder={t('expenses.descriptionPlaceholder')}
            />
            {errors.description && <p className="text-danger text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">
                {t('expenses.amount')}
              </label>
              <input
                type="number"
                step="0.01"
                {...register('amount')}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                placeholder="0.00"
              />
              {errors.amount && <p className="text-danger text-xs mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-1.5">
                {t('expenses.paidAt')}
              </label>
              <input
                type="datetime-local"
                {...register('paidAt')}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
              />
              {errors.paidAt && <p className="text-danger text-xs mt-1">{errors.paidAt.message}</p>}
            </div>
          </div>

          {mutation.isError && (
            <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {(mutation.error as any)?.response?.data?.message || t('expenses.saveFailed')}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:text-white transition-all"
            >
              {t('common.close')}
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-2.5 bg-danger text-white font-semibold rounded-lg text-sm hover:bg-danger/90 disabled:opacity-60"
            >
              {mutation.isPending ? t('common.saving') : t('expenses.addExpense')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ExpensesPage() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const [openModal, setOpenModal] = useState(false);

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: () => api.get('/expenses').then((response) => response.data),
    refetchInterval: 30_000,
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then((response) => response.data),
    refetchInterval: 30_000,
  });

  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );

  const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayAmount = expenses
    .filter((expense) => format(new Date(expense.paidAt), 'yyyy-MM-dd') === todayKey)
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
  );

  const {
    page,
    setPage,
    totalPages,
    paged: pagedExpenses,
    start,
    end,
  } = usePagination(sortedExpenses, 15);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('expenses.title')}</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {t('expenses.total')}: SAR {totalAmount.toFixed(2)}
          </p>
        </div>
        <button
          onClick={() => setOpenModal(true)}
          className="flex items-center gap-2 bg-danger text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-danger/90 transition-all"
        >
          <Plus size={16} /> {t('expenses.addExpense')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide font-semibold">{t('expenses.totalCount')}</p>
          <p className="text-2xl font-bold text-white mt-1">{expenses.length}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide font-semibold">{t('expenses.today')}</p>
          <p className="text-2xl font-bold text-warning mt-1">SAR {todayAmount.toFixed(2)}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide font-semibold">{t('expenses.total')}</p>
          <p className="text-2xl font-bold text-danger mt-1">SAR {totalAmount.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2 text-white font-semibold text-sm">
          <Receipt size={16} className="text-danger" />
          {t('expenses.title')}
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-11 bg-bg-secondary rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sortedExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Receipt size={36} className="mb-2 opacity-30" />
            <p className="text-sm">{t('expenses.empty')}</p>
            <p className="text-xs mt-1">{t('expenses.emptyHint')}</p>
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
                    {t('expenses.description')}
                  </th>
                  <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide`}>
                    {t('expenses.category')}
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    {t('common.amount')}
                  </th>
                  <th className={`${rtl ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide`}>
                    {t('expenses.paidFrom')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedExpenses.map((expense, index) => (
                  <tr
                    key={expense.id}
                    className={clsx(
                      'border-b border-border/50 hover:bg-bg-secondary/50 transition-colors',
                      index === pagedExpenses.length - 1 && 'border-b-0',
                    )}
                  >
                    <td className="px-5 py-3 text-text-secondary tabular-nums">
                      {format(new Date(expense.paidAt), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-5 py-3 text-white">{expense.description}</td>
                    <td className="px-5 py-3 text-text-secondary">
                      {t(`expenses.categories.${expense.category}`, { defaultValue: expense.category })}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-danger tabular-nums">
                      SAR {Number(expense.amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {accountMap.get(expense.accountId) || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              totalPages={totalPages}
              start={start}
              end={end}
              total={sortedExpenses.length}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {openModal && <AddExpenseModal accounts={accounts} onClose={() => setOpenModal(false)} />}
    </div>
  );
}
