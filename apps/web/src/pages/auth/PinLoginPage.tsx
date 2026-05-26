import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { ChevronLeft, Delete } from 'lucide-react';
import clsx from 'clsx';

interface Employee { id: string; name: string; }

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export function PinLoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: employees = [], isLoading: empLoading } = useQuery<Employee[]>({
    queryKey: ['public-employees'],
    queryFn: () => api.get('/auth/employees').then(r => r.data),
    staleTime: 60_000,
  });

  const handleKey = (k: string) => {
    if (k === '⌫') {
      setPin(p => p.slice(0, -1));
      setError('');
      return;
    }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) submitPin(next);
  };

  const submitPin = async (enteredPin: string) => {
    if (!selectedEmployee) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/pin-login', { employeeId: selectedEmployee.id, pin: enteredPin });
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate('/dashboard');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Incorrect PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // ── Employee grid ────────────────────────────────────────────────────────────
  if (!selectedEmployee) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button onClick={() => navigate('/login')} className="flex items-center gap-1.5 text-text-secondary hover:text-white text-sm mb-8 transition-colors">
            <ChevronLeft size={16} /> Back to login
          </button>
          <h1 className="text-2xl font-bold text-white mb-1">Employee PIN Login</h1>
          <p className="text-text-secondary text-sm mb-8">Select your name to continue</p>

          {empLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="bg-bg-card border border-border rounded-2xl h-24 animate-pulse" />)}
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12 text-text-muted">No employees found</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className="bg-bg-card border border-border rounded-2xl p-5 flex flex-col items-center gap-3 hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg group-hover:bg-primary/20 transition-colors">
                    {initials(emp.name)}
                  </div>
                  <span className="text-white font-medium text-sm">{emp.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── PIN entry ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <button onClick={() => { setSelectedEmployee(null); setPin(''); setError(''); }} className="flex items-center gap-1.5 text-text-secondary hover:text-white text-sm mb-8 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mb-3">
            {initials(selectedEmployee.name)}
          </div>
          <p className="text-white font-semibold text-lg">{selectedEmployee.name}</p>
          <p className="text-text-secondary text-sm mt-0.5">Enter your 4-digit PIN</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-4 mb-6">
          {[0,1,2,3].map(i => (
            <div key={i} className={clsx(
              'w-4 h-4 rounded-full border-2 transition-all',
              i < pin.length ? 'bg-primary border-primary scale-110' : 'border-border bg-transparent'
            )} />
          ))}
        </div>

        {error && <p className="text-danger text-sm text-center mb-4 bg-danger/10 border border-danger/20 rounded-xl py-2 px-3">{error}</p>}
        {loading && <p className="text-primary text-sm text-center mb-4">Verifying…</p>}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((k, i) => {
            if (k === '') return <div key={i} />;
            return (
              <button
                key={i}
                onClick={() => handleKey(k)}
                disabled={loading}
                className={clsx(
                  'h-16 rounded-2xl font-semibold text-xl transition-all disabled:opacity-40',
                  k === '⌫'
                    ? 'bg-bg-card border border-border text-text-secondary hover:text-danger hover:border-danger/40 flex items-center justify-center'
                    : 'bg-bg-card border border-border text-white hover:bg-bg-secondary hover:border-border-light active:scale-95'
                )}
              >
                {k === '⌫' ? <Delete size={20} /> : k}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
