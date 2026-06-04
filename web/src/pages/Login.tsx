import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../lib/api';
import { useTheme } from '../hooks/useTheme';
import { toast } from 'sonner';
import { z } from 'zod';
import { Sun, Moon, Store, Lock, UserRound, ShieldCheck } from 'lucide-react';

const loginSchema = z.object({
  login: z.string().min(3, 'Informe seu e-mail ou usuario'),
  password: z.string().min(6, 'A senha deve conter no minimo 6 caracteres'),
  remember: z.boolean().optional(),
});

type LoginData = z.infer<typeof loginSchema>;

export function Login() {
  const { theme, toggleTheme } = useTheme();
  const savedLogin = localStorage.getItem('mouseforge:remember-login') || localStorage.getItem('mouseforge:remember-email') || '';
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: savedLogin,
      remember: !!savedLogin,
    },
  });

  const { mutateAsync: loginMutation, isPending } = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await api.post('/auth/login', {
        login: data.login,
        password: data.password,
      });
      return { ...response.data, remember: data.remember };
    },
    onSuccess: (data) => {
      if (data.remember) {
        localStorage.setItem('mouseforge:remember-login', data.user.username || data.user.email);
      } else {
        localStorage.removeItem('mouseforge:remember-login');
        localStorage.removeItem('mouseforge:remember-email');
      }

      localStorage.setItem('mouseforge:token', data.token);
      localStorage.setItem('mouseforge:user', JSON.stringify(data.user));
      localStorage.setItem('mouseforge:pending-terms', JSON.stringify(data.pendingTerms || []));
      toast.success(`Acesso autorizado! Bem-vindo, ${data.user.name}.`);
      window.location.href = '/home';
    },
    onError: () => {
      toast.error('Falha na autenticacao. Verifique os dados informados.');
    },
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 px-4 relative sm:py-12 transition-colors duration-200">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center shadow-sm"
        aria-label="Alternar tema visual"
      >
        {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
      </button>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-brand-600/10 dark:bg-brand-600/20 rounded-xl flex items-center justify-center mb-4">
            <Store className="text-brand-600 dark:text-brand-500" size={24} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">MouseForge</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Frente de caixa, estoque e fiscal</p>
        </div>

        <form onSubmit={handleSubmit((data) => loginMutation(data))} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              E-mail ou usuario
            </label>
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <input
                type="text"
                autoComplete="username"
                {...register('login')}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600 transition-all text-base min-h-[44px]"
                placeholder="admin ou admin@mouseforge.local"
              />
            </div>
            {errors.login && <p className="text-red-500 dark:text-red-400 text-xs mt-1.5 font-medium">{errors.login.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Senha de acesso</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <input
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600 transition-all text-base min-h-[44px]"
                placeholder="********"
              />
            </div>
            {errors.password && <p className="text-red-500 dark:text-red-400 text-xs mt-1.5 font-medium">{errors.password.message}</p>}
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-2 font-medium">
              <ShieldCheck size={17} className="text-brand-600 dark:text-brand-500" />
              Lembrar acesso
            </span>
            <input
              type="checkbox"
              {...register('remember')}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:shadow-brand-600/10 transition-all duration-200 min-h-[44px] flex items-center justify-center"
          >
            {isPending ? 'Autenticando operador...' : 'Entrar no sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
