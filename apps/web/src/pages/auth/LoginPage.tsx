import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Fuel, Lock, Mail, Hash } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { LANGUAGE_OPTIONS, type SupportedLanguage } from '@fuel-station/shared';
import i18n from 'i18next';
import clsx from 'clsx';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate('/dashboard');
    } catch (e: any) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleLangChange = (code: SupportedLanguage) => {
    i18n.changeLanguage(code);
  };

  return (
    <div className="min-h-screen flex bg-bg-primary">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-bg-secondary flex-col justify-between p-12 border-e border-border relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-teal/5 pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center animate-glow">
              <Fuel className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold text-white">{t('common.appName')}</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Track every liter,<br />
            <span className="text-primary">every shift,</span><br />
            every riyal.
          </h1>
          <p className="text-text-secondary text-lg">
            Complete fuel station management — inventory, sales, shifts, and accounts in one place.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-4">
          {[
            { label: 'Fuel Types', value: '4' },
            { label: 'Roles', value: '4' },
            { label: 'Languages', value: '5' },
          ].map((stat) => (
            <div key={stat.label} className="bg-bg-tertiary rounded-xl p-4 border border-border">
              <p className="text-2xl font-bold text-primary">{stat.value}</p>
              <p className="text-xs text-text-secondary mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Language selector */}
        <div className="absolute top-6 end-6 flex gap-2">
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLangChange(lang.code)}
              className={clsx(
                'text-xs px-2 py-1 rounded-lg transition-all',
                i18n.language === lang.code
                  ? 'bg-primary text-bg-primary font-semibold'
                  : 'text-text-secondary hover:text-white',
              )}
            >
              {lang.nativeLabel}
            </button>
          ))}
        </div>

        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Fuel className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold text-white">{t('common.appName')}</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{t('auth.welcome')}</h2>
          <p className="text-text-secondary mb-8 text-sm">Sign in to your management account</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="manager@station.com"
                  className={clsx(
                    'w-full bg-bg-secondary border rounded-xl ps-10 pe-4 py-3 text-sm text-white placeholder:text-text-muted outline-none transition-all',
                    errors.email ? 'border-danger' : 'border-border focus:border-primary',
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={clsx(
                    'w-full bg-bg-secondary border rounded-xl ps-10 pe-10 py-3 text-sm text-white placeholder:text-text-muted outline-none transition-all',
                    errors.password ? 'border-danger' : 'border-border focus:border-primary',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-600 disabled:opacity-50 text-bg-primary font-semibold py-3 rounded-xl transition-all text-sm"
            >
              {loading ? 'Signing in...' : t('auth.signIn')}
            </button>

            <div className="relative flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-text-muted">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* PIN login link */}
            <button
              type="button"
              onClick={() => navigate('/pin-login')}
              className="w-full flex items-center justify-center gap-2 border border-border hover:border-teal text-text-secondary hover:text-teal py-3 rounded-xl transition-all text-sm font-medium"
            >
              <Hash size={16} />
              {t('auth.pinLogin')}
            </button>
          </form>

          <p className="text-center text-xs text-text-muted mt-6">
            <button className="text-primary hover:underline">{t('auth.forgotPassword')}</button>
          </p>
        </div>
      </div>
    </div>
  );
}
