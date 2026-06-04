import { useMemo } from 'react';
import {
  BarChart3,
  Boxes,
  ChevronDown,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Moon,
  PackageSearch,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  Sun,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

type LoggedUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

const summaryCards = [
  {
    label: 'Vendas hoje',
    value: 'R$ 4.892',
    helper: '+12% vs ontem',
    icon: ShoppingCart,
    tone: 'text-brand-600 bg-brand-600/10 dark:text-brand-300 dark:bg-brand-500/15',
  },
  {
    label: 'Cupons emitidos',
    value: '128',
    helper: 'NFC-e autorizadas',
    icon: ReceiptText,
    tone: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-300 dark:bg-emerald-500/15',
  },
  {
    label: 'Ticket medio',
    value: 'R$ 38,21',
    helper: 'Mercado varejo',
    icon: CreditCard,
    tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-300 dark:bg-amber-500/15',
  },
  {
    label: 'Estoque critico',
    value: '14',
    helper: 'Itens para repor',
    icon: Boxes,
    tone: 'text-rose-600 bg-rose-500/10 dark:text-rose-300 dark:bg-rose-500/15',
  },
];

const salesTrend = [
  { label: 'Seg', value: 42 },
  { label: 'Ter', value: 58 },
  { label: 'Qua', value: 51 },
  { label: 'Qui', value: 74 },
  { label: 'Sex', value: 86 },
  { label: 'Sab', value: 68 },
  { label: 'Dom', value: 39 },
];

const paymentMix = [
  { label: 'Pix', value: '38%', color: 'bg-emerald-500' },
  { label: 'Debito', value: '27%', color: 'bg-brand-600' },
  { label: 'Credito', value: '24%', color: 'bg-violet-500' },
  { label: 'Dinheiro', value: '11%', color: 'bg-amber-500' },
];

const recentActivity = [
  { id: 'CX-1042', title: 'Venda finalizada', detail: 'Operador Caixa 01 - Pix', value: 'R$ 86,40', status: 'Autorizada' },
  { id: 'CX-1041', title: 'Sangria registrada', detail: 'Retirada para cofre', value: 'R$ 500,00', status: 'Conferir' },
  { id: 'NF-9128', title: 'NFC-e transmitida', detail: 'Ambiente de producao', value: '2 itens', status: 'Sefaz' },
  { id: 'ES-2207', title: 'Estoque baixo', detail: 'Arroz 5kg - corredor 03', value: '6 un', status: 'Repor' },
];

const menuSections = [
  {
    title: 'Operacao',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, active: true },
      { label: 'Frente de caixa', icon: ShoppingCart },
      { label: 'Notas fiscais', icon: FileText },
      { label: 'Financeiro', icon: WalletCards },
    ],
  },
  {
    title: 'Cadastros',
    items: [
      { label: 'Produtos', icon: PackageSearch },
      { label: 'Estoque', icon: Boxes },
      { label: 'Clientes', icon: Users },
      { label: 'Relatorios', icon: BarChart3 },
    ],
  },
  {
    title: 'Sistema',
    items: [{ label: 'Configuracoes', icon: Settings }],
  },
];

function getRoleLabel(role?: string) {
  const roleMap: Record<string, string> = {
    admin: 'ADMIN',
    manager: 'GERENTE',
    cashier: 'CAIXA',
  };

  return role ? roleMap[role] || role.toUpperCase() : 'OPERADOR';
}

export function Home() {
  const userLogado = useMemo<LoggedUser>(() => JSON.parse(localStorage.getItem('mouseforge:user') || '{}'), []);
  const { theme, toggleTheme } = useTheme(userLogado.id || userLogado.email);
  const firstName = userLogado.name?.split(' ')[0] || 'Operador';
  const userInitial = firstName.charAt(0).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem('mouseforge:token');
    localStorage.removeItem('mouseforge:user');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-slate-950 text-slate-200 lg:flex lg:flex-col">
        <div className="px-6 py-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Store size={22} />
            </div>
            <div>
              <p className="text-lg font-bold text-white">MouseForge</p>
              <p className="text-xs text-slate-500">PDV & Mercado</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-6 px-4">
          {menuSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{section.title}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.label}
                      type="button"
                      className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition ${
                        item.active
                          ? 'bg-brand-600 text-white shadow-lg shadow-brand-950/30'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-slate-900 px-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {userInitial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{userLogado.name || 'Operador'}</p>
              <p className="text-xs text-slate-500">{getRoleLabel(userLogado.role)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={18} />
            Sair do sistema
          </button>
        </div>
      </aside>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                <LayoutDashboard size={16} />
                Painel de gestao
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">Ola, {firstName}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Status em tempo real das operacoes do mercado</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                Todas as lojas
                <ChevronDown size={16} />
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                aria-label="Alternar tema visual"
              >
                {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
              </button>
              <span className="flex min-h-[44px] items-center rounded-lg bg-brand-600 px-4 text-xs font-bold text-white shadow-sm">
                {getRoleLabel(userLogado.role)}
              </span>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.label}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{card.label}</p>
                      <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">{card.value}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{card.helper}</p>
                    </div>
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${card.tone}`}>
                      <Icon size={21} />
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-brand-600 dark:text-brand-400" size={19} />
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">Historico de vendas</h2>
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ultimos 7 dias</span>
              </div>

              <div className="flex h-72 items-end gap-3 border-b border-l border-slate-200 px-3 pb-4 dark:border-slate-800">
                {salesTrend.map((item) => (
                  <div key={item.label} className="flex h-full flex-1 flex-col justify-end gap-3">
                    <div className="relative flex flex-1 items-end">
                      <div
                        className="w-full rounded-t-lg bg-brand-500/85 transition-all hover:bg-brand-600"
                        style={{ height: `${item.value}%` }}
                      />
                    </div>
                    <p className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400">{item.label}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center gap-2">
                <CreditCard className="text-emerald-600 dark:text-emerald-400" size={19} />
                <h2 className="text-base font-bold text-slate-950 dark:text-white">Meios de pagamento</h2>
              </div>

              <div className="mx-auto mb-7 grid h-44 w-44 place-items-center rounded-full bg-[conic-gradient(#10b981_0_38%,#244aa5_38%_65%,#8b5cf6_65%_89%,#f59e0b_89%_100%)]">
                <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-inner dark:bg-slate-900">
                  <span className="text-2xl font-extrabold text-slate-950 dark:text-white">128</span>
                  <span className="-mt-2 text-[11px] font-semibold text-slate-500">vendas</span>
                </div>
              </div>

              <div className="space-y-3">
                {paymentMix.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                      {item.label}
                    </span>
                    <span className="font-bold text-slate-950 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ReceiptText className="text-brand-600 dark:text-brand-400" size={19} />
                <h2 className="text-base font-bold text-slate-950 dark:text-white">Monitoramento operacional</h2>
              </div>
              <span className="w-fit rounded-full border border-slate-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Tempo real
              </span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="grid gap-3 px-6 py-4 text-sm sm:grid-cols-[120px_minmax(0,1fr)_120px_120px] sm:items-center">
                  <span className="font-bold text-brand-600 dark:text-brand-400">{activity.id}</span>
                  <div>
                    <p className="font-bold text-slate-950 dark:text-white">{activity.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{activity.detail}</p>
                  </div>
                  <span className="font-bold text-slate-950 dark:text-white">{activity.value}</span>
                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
