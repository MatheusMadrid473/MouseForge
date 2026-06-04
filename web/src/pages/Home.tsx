import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  CreditCard,
  Edit,
  FileCheck2,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Moon,
  PackageSearch,
  Plus,
  ReceiptText,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Sun,
  Trash2,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../hooks/useTheme';
import { api } from '../lib/api';

type LoggedUser = {
  id?: string;
  name?: string;
  email?: string;
  username?: string;
  role?: UserRole;
  isMaster?: boolean;
};

type UserRole = 'admin' | 'manager' | 'cashier';
type ActiveView =
  | 'dashboard'
  | 'cashier'
  | 'fiscal'
  | 'finance'
  | 'products'
  | 'stock'
  | 'customers'
  | 'reports'
  | 'companies'
  | 'terms'
  | 'users'
  | 'settings';

type SystemUser = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role: UserRole;
  createdAt: string;
  isMaster?: boolean;
};

type Company = {
  id: string;
  name: string;
  document?: string | null;
  isActive: boolean;
};

type Branch = {
  id: string;
  companyId: string;
  name: string;
  document?: string | null;
  isActive: boolean;
};

type LegalTerm = {
  id: string;
  title: string;
  version: string;
  content: string;
  isActive: boolean;
};

type UserFormState = {
  id?: string;
  name: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
};

type PreviewView = Exclude<ActiveView, 'dashboard' | 'users' | 'companies' | 'terms'>;

type PreviewConfig = {
  title: string;
  eyebrow: string;
  description: string;
  primaryAction: string;
  metrics: Array<{ label: string; value: string; helper: string }>;
  rows: Array<{ title: string; detail: string; status: string }>;
};

type MenuSection = {
  title: string;
  items: Array<{ id: ActiveView; label: string; icon: LucideIcon }>;
};

const emptyUserForm: UserFormState = {
  name: '',
  email: '',
  username: '',
  password: '',
  role: 'cashier',
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Gerente',
  cashier: 'Caixa',
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

const previewConfigs: Record<PreviewView, PreviewConfig> = {
  cashier: {
    title: 'Frente de caixa',
    eyebrow: 'Operacao de venda',
    description: 'Previa do terminal de vendas com busca de produtos, carrinho, descontos e fechamento por forma de pagamento.',
    primaryAction: 'Abrir novo caixa',
    metrics: [
      { label: 'Caixa atual', value: 'Aberto', helper: 'Operador principal' },
      { label: 'Itens no carrinho', value: '5', helper: 'R$ 86,40 parcial' },
      { label: 'Tempo medio', value: '2m 18s', helper: 'Por atendimento' },
    ],
    rows: [
      { title: 'Arroz Tipo 1 5kg', detail: '7891000100101 - 2 un', status: 'R$ 47,80' },
      { title: 'Leite integral 1L', detail: '7891000200202 - 3 un', status: 'R$ 18,90' },
      { title: 'Pagamento selecionado', detail: 'Pix com confirmacao instantanea', status: 'Pronto' },
    ],
  },
  fiscal: {
    title: 'Notas fiscais',
    eyebrow: 'NFC-e / NF-e',
    description: 'Previa do painel fiscal para transmissao, contingencia, autorizacoes e consulta de documentos emitidos.',
    primaryAction: 'Consultar Sefaz',
    metrics: [
      { label: 'Autorizadas hoje', value: '128', helper: 'Sem rejeicoes criticas' },
      { label: 'Pendentes', value: '3', helper: 'Fila de envio' },
      { label: 'Contingencia', value: 'Off', helper: 'Sefaz online' },
    ],
    rows: [
      { title: 'NFC-e 0009128', detail: 'Venda CX-1042 - Serie 1', status: 'Autorizada' },
      { title: 'NFC-e 0009127', detail: 'Cliente nao identificado', status: 'Autorizada' },
      { title: 'NFC-e 0009126', detail: 'Aguardando retorno', status: 'Pendente' },
    ],
  },
  finance: {
    title: 'Financeiro',
    eyebrow: 'Caixa e conferencias',
    description: 'Previa para sangria, suprimento, resumo por meios de pagamento e fechamento diario do caixa.',
    primaryAction: 'Fechar caixa',
    metrics: [
      { label: 'Saldo esperado', value: 'R$ 4.892', helper: 'Vendas do dia' },
      { label: 'Sangrias', value: 'R$ 500', helper: '1 retirada' },
      { label: 'Diferenca', value: 'R$ 0,00', helper: 'Conferencia ok' },
    ],
    rows: [
      { title: 'Pix', detail: '49 transacoes aprovadas', status: 'R$ 1.860' },
      { title: 'Cartao de debito', detail: '35 transacoes aprovadas', status: 'R$ 1.320' },
      { title: 'Dinheiro', detail: 'Conferencia de gaveta', status: 'R$ 538' },
    ],
  },
  products: {
    title: 'Produtos',
    eyebrow: 'Cadastro comercial',
    description: 'Previa do cadastro de produtos com codigo de barras, preco, categoria, NCM e regras fiscais.',
    primaryAction: 'Novo produto',
    metrics: [
      { label: 'Produtos ativos', value: '1.248', helper: 'Catalogo atual' },
      { label: 'Sem codigo', value: '12', helper: 'Revisar cadastro' },
      { label: 'Margem media', value: '24%', helper: 'Base de venda' },
    ],
    rows: [
      { title: 'Arroz Tipo 1 5kg', detail: 'Categoria: Mercearia - NCM 1006.30.21', status: 'Ativo' },
      { title: 'Leite integral 1L', detail: 'Categoria: Frios e laticinios', status: 'Ativo' },
      { title: 'Cafe tradicional 500g', detail: 'Preco sugerido R$ 18,90', status: 'Revisar' },
    ],
  },
  stock: {
    title: 'Estoque',
    eyebrow: 'Saldos e reposicao',
    description: 'Previa para acompanhar saldo atual, estoque minimo, entradas, perdas e necessidades de compra.',
    primaryAction: 'Registrar entrada',
    metrics: [
      { label: 'Itens criticos', value: '14', helper: 'Abaixo do minimo' },
      { label: 'Entradas hoje', value: '7', helper: 'Notas recebidas' },
      { label: 'Perdas', value: 'R$ 92', helper: 'Quebras e validade' },
    ],
    rows: [
      { title: 'Arroz Tipo 1 5kg', detail: 'Saldo 6 un - minimo 12 un', status: 'Repor' },
      { title: 'Banana prata kg', detail: 'Validade curta no hortifruti', status: 'Atencao' },
      { title: 'Refrigerante cola 2L', detail: 'Entrada prevista para amanha', status: 'Ok' },
    ],
  },
  customers: {
    title: 'Clientes',
    eyebrow: 'Cadastro e historico',
    description: 'Previa de clientes para vendas identificadas, dados de contato e historico de compras.',
    primaryAction: 'Novo cliente',
    metrics: [
      { label: 'Clientes ativos', value: '342', helper: 'Com compra recente' },
      { label: 'Ticket medio', value: 'R$ 64', helper: 'Clientes identificados' },
      { label: 'Novos no mes', value: '18', helper: 'Cadastro no caixa' },
    ],
    rows: [
      { title: 'Maria Oliveira', detail: 'Ultima compra hoje - Pix', status: 'Ativa' },
      { title: 'Joao Santos', detail: 'CPF informado no cupom', status: 'Ativo' },
      { title: 'Cliente balcao', detail: 'Venda sem identificacao', status: 'Padrao' },
    ],
  },
  reports: {
    title: 'Relatorios',
    eyebrow: 'Indicadores e exportacao',
    description: 'Previa de relatorios por vendas, operadores, produtos, margem, impostos e fechamento diario.',
    primaryAction: 'Gerar relatorio',
    metrics: [
      { label: 'Vendas no mes', value: 'R$ 82k', helper: '+8,4% vs anterior' },
      { label: 'Produto lider', value: 'Arroz 5kg', helper: '312 unidades' },
      { label: 'Operador destaque', value: 'Caixa 01', helper: '42% das vendas' },
    ],
    rows: [
      { title: 'Resumo diario', detail: 'Vendas, cupons, descontos e formas de pagamento', status: 'Disponivel' },
      { title: 'Curva ABC', detail: 'Produtos por faturamento e giro', status: 'Previa' },
      { title: 'Fechamento fiscal', detail: 'NFC-e autorizadas e rejeitadas', status: 'Previa' },
    ],
  },
  settings: {
    title: 'Configuracoes',
    eyebrow: 'Parametros da loja',
    description: 'Previa das preferencias do PDV, empresa, filial, fiscal, termos de uso, permissoes e integracoes.',
    primaryAction: 'Salvar parametros',
    metrics: [
      { label: 'Empresa ativa', value: 'Matriz', helper: 'Ambiente producao' },
      { label: 'Serie NFC-e', value: '001', helper: 'Numeracao atual' },
      { label: 'Termos vigentes', value: '1', helper: 'Aceite obrigatorio' },
    ],
    rows: [
      { title: 'Empresa e filial', detail: 'CNPJ, razao social, lojas, endereco e isolamento por unidade', status: 'Pendente' },
      { title: 'Fiscal', detail: 'CSC, certificado, serie e ambiente', status: 'Previa' },
      { title: 'Termos e LGPD', detail: 'Cadastro de termos, versoes e aceite individual por usuario', status: 'Previa' },
    ],
  },
};

const menuSections: MenuSection[] = [
  {
    title: 'Operacao',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'cashier', label: 'Frente de caixa', icon: ShoppingCart },
      { id: 'fiscal', label: 'Notas fiscais', icon: FileText },
      { id: 'finance', label: 'Financeiro', icon: WalletCards },
    ],
  },
  {
    title: 'Cadastros',
    items: [
      { id: 'products', label: 'Produtos', icon: PackageSearch },
      { id: 'stock', label: 'Estoque', icon: Boxes },
      { id: 'customers', label: 'Clientes', icon: Users },
      { id: 'reports', label: 'Relatorios', icon: BarChart3 },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { id: 'companies', label: 'Empresas e filiais', icon: Building2 },
      { id: 'terms', label: 'Termos/LGPD', icon: FileCheck2 },
      { id: 'users', label: 'Usuarios', icon: Users },
      { id: 'settings', label: 'Configuracoes', icon: Settings },
    ],
  },
];

function getRoleLabel(role?: string) {
  return role && role in roleLabels ? roleLabels[role as UserRole].toUpperCase() : 'OPERADOR';
}

function canManageUsers(role?: UserRole) {
  return role === 'admin' || role === 'manager';
}

function PreviewView({ view }: { view: PreviewView }) {
  const config = previewConfigs[view];

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">{config.eyebrow}</p>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                Previa
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">{config.title}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{config.description}</p>
          </div>
          <button
            type="button"
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white shadow-sm lg:w-auto"
          >
            <Plus size={18} />
            {config.primaryAction}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {config.metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{metric.label}</p>
            <p className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">{metric.value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{metric.helper}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <article className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-950 dark:text-white">Fluxo principal</h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {config.rows.map((row) => (
              <div key={row.title} className="grid gap-3 px-6 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_120px] sm:items-center">
                <div>
                  <p className="font-bold text-slate-950 dark:text-white">{row.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{row.detail}</p>
                </div>
                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-bold text-slate-950 dark:text-white">Estado da tela</h3>
          <div className="mt-5 space-y-4">
            {['Layout aprovado', 'Integracao pendente', 'Banco nao criado'].map((item, index) => (
              <div key={item} className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${index === 0 ? 'bg-emerald-500' : index === 1 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            Esta tela e apenas visual por enquanto. O proximo passo e conectar este modulo ao banco e criar suas regras de permissao.
          </div>
        </article>
      </div>
    </section>
  );
}

function DashboardView() {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                  <div className="w-full rounded-t-lg bg-brand-500/85 transition-all hover:bg-brand-600" style={{ height: `${item.value}%` }} />
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
    </>
  );
}

function UsersView({ loggedUser }: { loggedUser: LoggedUser }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<UserFormState>(emptyUserForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<SystemUser | null>(null);
  const [resetCandidate, setResetCandidate] = useState<SystemUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const isEditing = !!form.id;

  const { data: users = [], isLoading } = useQuery<SystemUser[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
  });

  const saveUser = useMutation({
    mutationFn: async (payload: UserFormState) => {
      if (payload.id) {
        const response = await api.put(`/users/${payload.id}`, {
          name: payload.name,
          username: payload.username,
          role: payload.role,
        });
        return response.data;
      }

      const response = await api.post('/users', {
        name: payload.name,
        email: payload.email,
        username: payload.username,
        password: payload.password,
        role: payload.role,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setForm(emptyUserForm);
      toast.success(isEditing ? 'Usuario atualizado com sucesso.' : 'Usuario criado com sucesso.');
    },
    onError: () => {
      toast.error('Nao foi possivel salvar este usuario.');
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario removido com sucesso.');
    },
    onError: () => {
      toast.error('Nao foi possivel remover este usuario.');
    },
  });

  const resetPassword = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const response = await api.post(`/users/${id}/reset-password`, { password });
      return response.data;
    },
    onSuccess: () => {
      setResetCandidate(null);
      setNewPassword('');
      toast.success('Senha redefinida com sucesso.');
    },
    onError: () => {
      toast.error('Nao foi possivel redefinir a senha deste usuario.');
    },
  });

  const openCreateModal = () => {
    setForm(emptyUserForm);
    setIsModalOpen(true);
  };

  const openEditModal = (user: SystemUser) => {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username || '',
      password: '',
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.username.trim()) {
      toast.error('Informe nome, e-mail e usuario.');
      return;
    }

    if (!isEditing && form.password.length < 6) {
      toast.error('A senha inicial deve ter pelo menos 6 caracteres.');
      return;
    }

    saveUser.mutate(form);
  };

  const managerAllowed = canManageUsers(loggedUser.role);
  const adminAllowed = loggedUser.role === 'admin';
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    if (!normalizedSearch) {
      return users;
    }

    const terms = normalizedSearch.split(/\s+/).filter(Boolean);

    return users.filter((user) => {
      const searchableText = [user.name, user.email, user.username, roleLabels[user.role], user.isMaster ? 'mestre master' : '']
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return terms.every((term) => searchableText.includes(term));
    });
  }, [normalizedSearch, users]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Usuarios do sistema</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Controle operadores, gerentes e administradores do PDV.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-brand-600 dark:border-slate-800 dark:bg-slate-950 dark:text-white sm:w-72"
              placeholder="Pesquisar nome, usuario, cargo..."
            />
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            disabled={!managerAllowed}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-800"
          >
            <Plus size={18} />
            Novo usuario
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                <th className="px-5 py-4">Nome</th>
                <th className="px-5 py-4">Usuario</th>
                <th className="px-5 py-4">E-mail</th>
                <th className="px-5 py-4">Cargo</th>
                <th className="px-5 py-4">Criado em</th>
                <th className="px-5 py-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={6}>
                    Carregando usuarios...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={6}>
                    Nenhum usuario encontrado para a pesquisa.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-950 dark:text-white">{user.name}</p>
                        {user.isMaster && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-600/10 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                            <ShieldCheck size={12} />
                            Mestre
                          </span>
                        )}
                      </div>
                      {user.id === loggedUser.id && <p className="text-xs text-brand-600 dark:text-brand-400">Usuario logado</p>}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">{user.username ? `@${user.username}` : '-'}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{user.email}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          disabled={!managerAllowed}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-brand-500/10 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:text-brand-300"
                          title="Editar usuario"
                        >
                          <Edit size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetCandidate(user);
                            setNewPassword('');
                          }}
                          disabled={!adminAllowed || (user.isMaster && user.id !== loggedUser.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-amber-500/10 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:text-amber-300"
                          title="Redefinir senha"
                        >
                          <KeyRound size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(user)}
                          disabled={!managerAllowed || user.id === loggedUser.id || user.isMaster || deleteUser.isPending}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:text-red-300"
                          title="Remover usuario"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 py-6">
          <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white">{isEditing ? 'Editar usuario' : 'Novo usuario'}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {isEditing ? 'Atualize nome e cargo do colaborador.' : 'Crie o acesso inicial para um colaborador.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nome
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:ring-2 focus:ring-brand-600 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  placeholder="Nome do colaborador"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                E-mail
                <input
                  type="email"
                  value={form.email}
                  disabled={isEditing}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:ring-2 focus:ring-brand-600 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  placeholder="operador@mercado.com"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Usuario
                <input
                  value={form.username}
                  onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                  className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:ring-2 focus:ring-brand-600 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  placeholder="operador01"
                />
              </label>

              {!isEditing && (
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Senha inicial
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:ring-2 focus:ring-brand-600 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    placeholder="Minimo 6 caracteres"
                  />
                </label>
              )}

              <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Cargo
                <select
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))}
                  className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:ring-2 focus:ring-brand-600 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Gerente</option>
                  <option value="cashier">Caixa</option>
                </select>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="min-h-[44px] rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saveUser.isPending}
                className="flex min-h-[44px] items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-800"
              >
                <Save size={17} />
                {saveUser.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteCandidate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 py-6">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white">Confirmar exclusao</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Voce esta removendo <strong className="text-slate-800 dark:text-slate-200">{deleteCandidate.name}</strong>. Esta acao nao pode ser desfeita.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="min-h-[44px] rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteUser.mutate(deleteCandidate.id);
                  setDeleteCandidate(null);
                }}
                disabled={deleteUser.isPending}
                className="flex min-h-[44px] items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-800"
              >
                <Trash2 size={17} />
                Remover usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {resetCandidate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 py-6">
          <form
            onSubmit={(event) => {
              event.preventDefault();

              if (newPassword.length < 6) {
                toast.error('A nova senha deve ter pelo menos 6 caracteres.');
                return;
              }

              resetPassword.mutate({ id: resetCandidate.id, password: newPassword });
            }}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white">Redefinir senha</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Defina uma nova senha para <strong className="text-slate-800 dark:text-slate-200">{resetCandidate.name}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetCandidate(null);
                  setNewPassword('');
                }}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <label className="mt-5 grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Nova senha
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:ring-2 focus:ring-brand-600 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                placeholder="Minimo 6 caracteres"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setResetCandidate(null);
                  setNewPassword('');
                }}
                className="min-h-[44px] rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={resetPassword.isPending}
                className="flex min-h-[44px] items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-800"
              >
                <KeyRound size={17} />
                {resetPassword.isPending ? 'Redefinindo...' : 'Redefinir'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function CompaniesView({ loggedUser }: { loggedUser: LoggedUser }) {
  const queryClient = useQueryClient();
  const [companyForm, setCompanyForm] = useState({ id: '', name: '', document: '' });
  const [branchForm, setBranchForm] = useState({ id: '', companyId: '', name: '', document: '' });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await api.get('/companies');
      return response.data;
    },
    enabled: !!loggedUser.isMaster,
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data;
    },
    enabled: !!loggedUser.isMaster,
  });

  const saveCompany = useMutation({
    mutationFn: async () => {
      if (companyForm.id) {
        const response = await api.put(`/companies/${companyForm.id}`, {
          name: companyForm.name,
          document: companyForm.document,
        });
        return response.data;
      }

      const response = await api.post('/companies', {
        name: companyForm.name,
        document: companyForm.document,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setCompanyForm({ id: '', name: '', document: '' });
      toast.success('Empresa salva com sucesso.');
    },
  });

  const saveBranch = useMutation({
    mutationFn: async () => {
      if (branchForm.id) {
        const response = await api.put(`/branches/${branchForm.id}`, {
          companyId: branchForm.companyId,
          name: branchForm.name,
          document: branchForm.document,
        });
        return response.data;
      }

      const response = await api.post('/branches', {
        companyId: branchForm.companyId,
        name: branchForm.name,
        document: branchForm.document,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setBranchForm({ id: '', companyId: '', name: '', document: '' });
      toast.success('Filial salva com sucesso.');
    },
  });

  const toggleCompany = useMutation({
    mutationFn: async (company: Company) => api.put(`/companies/${company.id}`, { isActive: !company.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
  });

  const toggleBranch = useMutation({
    mutationFn: async (branch: Branch) => api.put(`/branches/${branch.id}`, { isActive: !branch.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  });

  if (!loggedUser.isMaster) {
    return <PreviewView view="settings" />;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Empresas e filiais</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Cadastre empresas clientes e suas unidades para isolar operacoes por loja.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!companyForm.name.trim()) {
              toast.error('Informe o nome da empresa.');
              return;
            }
            saveCompany.mutate();
          }}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">{companyForm.id ? 'Editar empresa' : 'Nova empresa'}</h3>
          <div className="mt-4 grid gap-4">
            <input
              value={companyForm.name}
              onChange={(event) => setCompanyForm((current) => ({ ...current, name: event.target.value }))}
              className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-600 dark:border-slate-800 dark:bg-slate-950"
              placeholder="Nome da empresa"
            />
            <input
              value={companyForm.document}
              onChange={(event) => setCompanyForm((current) => ({ ...current, document: event.target.value }))}
              className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-600 dark:border-slate-800 dark:bg-slate-950"
              placeholder="CNPJ ou documento"
            />
          </div>
          <button className="mt-4 flex min-h-[44px] items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white" type="submit">
            <Save size={17} />
            Salvar empresa
          </button>
        </form>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!branchForm.companyId || !branchForm.name.trim()) {
              toast.error('Informe empresa e nome da filial.');
              return;
            }
            saveBranch.mutate();
          }}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">{branchForm.id ? 'Editar filial' : 'Nova filial'}</h3>
          <div className="mt-4 grid gap-4">
            <select
              value={branchForm.companyId}
              onChange={(event) => setBranchForm((current) => ({ ...current, companyId: event.target.value }))}
              className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-600 dark:border-slate-800 dark:bg-slate-950"
            >
              <option value="">Selecione a empresa</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <input
              value={branchForm.name}
              onChange={(event) => setBranchForm((current) => ({ ...current, name: event.target.value }))}
              className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-600 dark:border-slate-800 dark:bg-slate-950"
              placeholder="Nome da filial"
            />
            <input
              value={branchForm.document}
              onChange={(event) => setBranchForm((current) => ({ ...current, document: event.target.value }))}
              className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-600 dark:border-slate-800 dark:bg-slate-950"
              placeholder="CNPJ ou documento"
            />
          </div>
          <button className="mt-4 flex min-h-[44px] items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white" type="submit">
            <Save size={17} />
            Salvar filial
          </button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h3 className="font-bold text-slate-950 dark:text-white">Empresas</h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {companies.map((company) => (
              <div key={company.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-bold text-slate-950 dark:text-white">{company.name}</p>
                  <p className="text-xs text-slate-500">{company.document || 'Sem documento'}</p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setCompanyForm({ id: company.id, name: company.name, document: company.document || '' })}>
                    <Edit size={17} />
                  </button>
                  <button className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => toggleCompany.mutate(company)}>
                    {company.isActive ? 'Inativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h3 className="font-bold text-slate-950 dark:text-white">Filiais</h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {branches.map((branch) => (
              <div key={branch.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-bold text-slate-950 dark:text-white">{branch.name}</p>
                  <p className="text-xs text-slate-500">{companies.find((company) => company.id === branch.companyId)?.name || 'Empresa'} - {branch.document || 'Sem documento'}</p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setBranchForm({ id: branch.id, companyId: branch.companyId, name: branch.name, document: branch.document || '' })}>
                    <Edit size={17} />
                  </button>
                  <button className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => toggleBranch.mutate(branch)}>
                    {branch.isActive ? 'Inativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TermsView({ loggedUser }: { loggedUser: LoggedUser }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ id: '', title: '', version: '', content: '' });

  const { data: termsList = [] } = useQuery<LegalTerm[]>({
    queryKey: ['terms'],
    queryFn: async () => {
      const response = await api.get('/terms');
      return response.data;
    },
    enabled: !!loggedUser.isMaster,
  });

  const saveTerm = useMutation({
    mutationFn: async () => {
      if (form.id) {
        const response = await api.put(`/terms/${form.id}`, {
          title: form.title,
          version: form.version,
          content: form.content,
        });
        return response.data;
      }

      const response = await api.post('/terms', {
        title: form.title,
        version: form.version,
        content: form.content,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      setForm({ id: '', title: '', version: '', content: '' });
      toast.success('Termo salvo com sucesso.');
    },
  });

  const toggleTerm = useMutation({
    mutationFn: async (term: LegalTerm) => api.put(`/terms/${term.id}`, { isActive: !term.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['terms'] }),
  });

  if (!loggedUser.isMaster) {
    return <PreviewView view="settings" />;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Termos e LGPD</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Cadastre versoes de termos de uso. Usuarios precisam aceitar os termos ativos para usar a plataforma.</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.title.trim() || !form.version.trim() || form.content.trim().length < 10) {
            toast.error('Informe titulo, versao e conteudo do termo.');
            return;
          }
          saveTerm.mutate();
        }}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <h3 className="text-lg font-bold text-slate-950 dark:text-white">{form.id ? 'Editar termo' : 'Novo termo'}</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-600 dark:border-slate-800 dark:bg-slate-950" placeholder="Titulo" />
          <input value={form.version} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-600 dark:border-slate-800 dark:bg-slate-950" placeholder="Versao, ex: 2026.1" />
        </div>
        <textarea value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} className="mt-4 min-h-40 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-600 dark:border-slate-800 dark:bg-slate-950" placeholder="Texto do termo de uso e privacidade" />
        <button className="mt-4 flex min-h-[44px] items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white" type="submit">
          <Save size={17} />
          Salvar termo
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="font-bold text-slate-950 dark:text-white">Termos cadastrados</h3>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {termsList.map((term) => (
            <div key={term.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-950 dark:text-white">{term.title}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">v{term.version}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${term.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{term.isActive ? 'Ativo' : 'Inativo'}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{term.content}</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setForm({ id: term.id, title: term.title, version: term.version, content: term.content })}>
                  <Edit size={17} />
                </button>
                <button className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => toggleTerm.mutate(term)}>
                  {term.isActive ? 'Inativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TermsAcceptanceGate() {
  const [pendingTerms, setPendingTerms] = useState<LegalTerm[]>(() => JSON.parse(localStorage.getItem('mouseforge:pending-terms') || '[]'));

  const { data } = useQuery<LegalTerm[]>({
    queryKey: ['pending-terms'],
    queryFn: async () => {
      const response = await api.get('/terms/pending');
      return response.data;
    },
  });

  useEffect(() => {
    if (data) {
      setPendingTerms(data);
      localStorage.setItem('mouseforge:pending-terms', JSON.stringify(data));
    }
  }, [data]);

  const acceptTerms = useMutation({
    mutationFn: async () => {
      await Promise.all(pendingTerms.map((term) => api.post(`/terms/${term.id}/accept`)));
    },
    onSuccess: () => {
      setPendingTerms([]);
      localStorage.setItem('mouseforge:pending-terms', '[]');
      toast.success('Termos aceitos com sucesso.');
    },
  });

  const logout = () => {
    localStorage.removeItem('mouseforge:token');
    localStorage.removeItem('mouseforge:user');
    localStorage.removeItem('mouseforge:pending-terms');
    window.location.href = '/';
  };

  if (pendingTerms.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/70 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Aceite obrigatorio</p>
        <h2 className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">Termos de uso e privacidade</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Para continuar usando o MouseForge, aceite os termos ativos abaixo. Caso contrario, voce sera desconectado.</p>

        <div className="mt-5 space-y-4">
          {pendingTerms.map((term) => (
            <article key={term.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h3 className="font-bold text-slate-950 dark:text-white">{term.title} v{term.version}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{term.content}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button className="min-h-[44px] rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 dark:border-slate-800 dark:text-slate-200" onClick={logout}>
            Nao aceitar e sair
          </button>
          <button className="min-h-[44px] rounded-lg bg-brand-600 px-4 text-sm font-bold text-white" onClick={() => acceptTerms.mutate()} disabled={acceptTerms.isPending}>
            {acceptTerms.isPending ? 'Registrando...' : 'Aceitar termos'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Home() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const userLogado = useMemo<LoggedUser>(() => JSON.parse(localStorage.getItem('mouseforge:user') || '{}'), []);
  const { theme, toggleTheme } = useTheme(userLogado.id || userLogado.username || userLogado.email);
  const firstName = userLogado.name?.split(' ')[0] || 'Operador';
  const userInitial = firstName.charAt(0).toUpperCase();
  const visibleMenuSections = useMemo(
    () =>
      menuSections.map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if ((item.id === 'companies' || item.id === 'terms') && !userLogado.isMaster) {
            return false;
          }

          return item.id !== 'users' || canManageUsers(userLogado.role);
        }),
      })),
    [userLogado.isMaster, userLogado.role]
  );

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
          {visibleMenuSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{section.title}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;

                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setActiveView(item.id)}
                      className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition ${
                        isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-950/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
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
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{userInitial}</div>
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
          <header className={`mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between ${activeView !== 'dashboard' ? 'md:justify-end' : ''}`}>
            {activeView === 'dashboard' && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  <LayoutDashboard size={16} />
                  Painel de gestao
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">Ola, {firstName}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Status em tempo real das operacoes do mercado</p>
              </div>
            )}

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

          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'companies' && <CompaniesView loggedUser={userLogado} />}
          {activeView === 'terms' && <TermsView loggedUser={userLogado} />}
          {activeView === 'users' && <UsersView loggedUser={userLogado} />}
          {activeView === 'cashier' && <PreviewView view="cashier" />}
          {activeView === 'fiscal' && <PreviewView view="fiscal" />}
          {activeView === 'finance' && <PreviewView view="finance" />}
          {activeView === 'products' && <PreviewView view="products" />}
          {activeView === 'stock' && <PreviewView view="stock" />}
          {activeView === 'customers' && <PreviewView view="customers" />}
          {activeView === 'reports' && <PreviewView view="reports" />}
          {activeView === 'settings' && <PreviewView view="settings" />}
        </div>
      </main>
      <TermsAcceptanceGate />
    </div>
  );
}
