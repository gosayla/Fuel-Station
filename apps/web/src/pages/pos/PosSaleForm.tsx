import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '../../lib/api';

interface Shift {
  id: string;
  startedAt?: string;
  openedAt?: string;
  closedAt?: string | null;
  status?: 'open' | 'closed' | 'reconciled';
}

interface PosItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

const lineSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().positive(),
});

const saleSchema = z.object({
  shiftId: z.string().min(1),
  paymentMethod: z.enum(['cash', 'card', 'credit']),
  lines: z.array(lineSchema).min(1),
});

type SaleFormValues = z.infer<typeof saleSchema>;

export function PosSaleForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const shiftsQuery = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: () => api.get('/shifts').then((response) => response.data),
  });

  const itemsQuery = useQuery<PosItem[]>({
    queryKey: ['pos-items'],
    queryFn: () => api.get('/pos/items').then((response) => response.data),
  });

  const activeShift = useMemo(() => (shiftsQuery.data || []).find((shift) => !shift.closedAt), [shiftsQuery.data]);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      shiftId: '',
      paymentMethod: 'cash',
      lines: [{ itemId: '', quantity: 1 }],
    },
  });

  useEffect(() => {
    if (!activeShift) return;
    if (form.getValues('shiftId')) return;
    form.setValue('shiftId', activeShift.id);
  }, [activeShift, form]);

  const lines = useFieldArray({ control: form.control, name: 'lines' });

  const mutation = useMutation({
    mutationFn: (values: SaleFormValues) =>
      api.post('/pos/sales', {
        shiftId: values.shiftId,
        paymentMethod: values.paymentMethod,
        lines: values.lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity })),
      }),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pos-sales'] }),
        queryClient.invalidateQueries({ queryKey: ['pos-items'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] }),
        queryClient.invalidateQueries({ queryKey: ['shift', variables.shiftId] }),
        queryClient.invalidateQueries({ queryKey: ['shift-sales', variables.shiftId] }),
        queryClient.invalidateQueries({ queryKey: ['shift-pos-sales', variables.shiftId] }),
        queryClient.invalidateQueries({ queryKey: ['shift-pos-summary', variables.shiftId] }),
      ]);
      navigate('/pos');
    },
    onSettled: async (_, __, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pos-sales'] }),
        queryClient.invalidateQueries({ queryKey: ['pos-items'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] }),
        variables?.shiftId ? queryClient.invalidateQueries({ queryKey: ['shift', variables.shiftId] }) : Promise.resolve(),
      ]);
    },
  });

  const watchedLines = form.watch('lines');
  const totalAmount = watchedLines.reduce((sum, line) => {
    const item = (itemsQuery.data || []).find((entry) => entry.id === line.itemId);
    return sum + Number(line.quantity || 0) * Number(item?.unitPrice || 0);
  }, 0);

  return (
    <div className="p-6 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('pos.newSale')}</h1>
          <p className="text-text-secondary text-sm mt-1">{t('pos.recordSale')}</p>
        </div>

        {!activeShift && (
          <div className="bg-warning/10 border border-warning/40 rounded-xl px-4 py-3 text-warning text-sm">{t('dashboard.noActiveShift')}</div>
        )}

        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="bg-bg-card border border-border rounded-2xl p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">{t('shifts.title')}</label>
              <select className="input w-full" {...form.register('shiftId')}>
                <option value="">{t('common.select')}</option>
                {(shiftsQuery.data || []).map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {t(`shifts.status.${shift.status || (shift.closedAt ? 'closed' : 'open')}`)} - {(() => {
                      const shiftDate = shift.startedAt || shift.openedAt || shift.closedAt;
                      return shiftDate ? new Date(shiftDate).toLocaleString() : '—';
                    })()}
                  </option>
                ))}
              </select>
              {form.formState.errors.shiftId && <p className="text-xs text-danger mt-1">{form.formState.errors.shiftId.message}</p>}
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">{t('sales.form.paymentMethod')}</label>
              <select className="input w-full" {...form.register('paymentMethod')}>
                <option value="cash">{t('common.cash')}</option>
                <option value="card">{t('common.card')}</option>
                <option value="credit">{t('common.credit')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">{t('pos.addLine')}</h2>
              <button
                type="button"
                onClick={() => lines.append({ itemId: '', quantity: 1 })}
                className="px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-white text-xs"
              >
                {t('common.addNew')}
              </button>
            </div>

            {lines.fields.map((field, index) => {
              const selectedItem = (itemsQuery.data || []).find((item) => item.id === form.watch(`lines.${index}.itemId`));

              return (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-bg-secondary/40 border border-border/60 rounded-xl p-3">
                  <div className="md:col-span-7">
                    <label className="block text-xs text-text-secondary mb-1">{t('pos.item')}</label>
                    <select className="input w-full" {...form.register(`lines.${index}.itemId`)}>
                      <option value="">{t('common.select')}</option>
                      {(itemsQuery.data || []).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.sku}) - {Number(item.quantity).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs text-text-secondary mb-1">{t('pos.quantity')}</label>
                    <input type="number" step="0.01" className="input w-full" {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })} />
                  </div>

                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => lines.remove(index)}
                      className="px-3 py-2 rounded-lg border border-danger/40 text-danger hover:bg-danger/10 text-xs"
                      disabled={lines.fields.length === 1}
                    >
                      {t('pos.removeLine')}
                    </button>
                  </div>

                  {selectedItem && (
                    <div className="md:col-span-12 text-xs text-text-muted">
                      {t('pos.currentStock')}: {Number(selectedItem.quantity).toFixed(2)} · {t('pos.unitPrice')}: SAR {Number(selectedItem.unitPrice).toFixed(2)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-sm text-text-secondary">
              {t('common.total')}: <span className="text-white font-semibold">SAR {totalAmount.toFixed(2)}</span>
            </p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => navigate('/pos')} className="px-4 py-2 rounded-xl border border-border text-text-secondary hover:text-white">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={mutation.isPending || !activeShift} className="px-4 py-2 rounded-xl bg-primary text-bg-primary font-semibold disabled:opacity-60">
                {mutation.isPending ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
