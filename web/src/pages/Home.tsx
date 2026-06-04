import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  CreditCard,
  Download,
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
  Upload,
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
  companyId?: string | null;
  branchId?: string | null;
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
  companyId?: string | null;
  branchId?: string | null;
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

type TermAcceptanceUser = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role: UserRole;
  companyId?: string | null;
  branchId?: string | null;
  acceptedAt?: string | null;
};

type TermAcceptanceReport = {
  term: LegalTerm;
  users: TermAcceptanceUser[];
};

type Product = {
  id: string;
  companyId: string;
  branchId?: string | null;
  name: string;
  barcode?: string | null;
  sku?: string | null;
  category?: string | null;
  unit: string;
  salePriceCents: number;
  costPriceCents: number;
  minStock: number;
  currentStock: number;
  ncm?: string | null;
  isActive: boolean;
};

type Customer = {
  id: string;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
};

type Sale = {
  id: string;
  totalCents: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  status: 'completed' | 'cancelled';
};

type FiscalDocument = {
  id: string;
  saleId?: string | null;
  type: 'nfce' | 'nfe';
  status: 'draft' | 'pending' | 'authorized' | 'rejected' | 'cancelled';
  number?: string | null;
  series?: string | null;
  accessKey?: string | null;
  protocol?: string | null;
  errorMessage?: string | null;
  totalCents: number;
  createdAt: string;
};

type FiscalSetting = {
  id: string;
  companyId: string;
  branchId?: string | null;
  provider: 'manual' | 'focus' | 'nfeio' | 'tecnospeed' | 'plugnotas';
  environment: 'homologation' | 'production';
  uf?: string | null;
  stateRegistration?: string | null;
  legalName?: string | null;
  cscId?: string | null;
  cscSecretRef?: string | null;
  certificateRef?: string | null;
  nfceSeries: string;
  nextNfceNumber: number;
  isActive: boolean;
};

type DashboardData = {
  summary: {
    salesTodayCents: number;
    salesCount: number;
    averageTicketCents: number;
    criticalStock: number;
    pendingFiscal: number;
  };
  paymentTotals: Record<string, number>;
  recentSales: Sale[];
  criticalProducts: Product[];
  auditLogs: Array<{ id: string; action: string; entity: string; summary?: string | null; createdAt: string }>;
};

type PeriodReport = {
  totalCents: number;
  salesCount: number;
  averageTicketCents: number;
  byPayment: Record<string, number>;
  sales: Sale[];
};

type PaymentMethod = 'pix' | 'debit' | 'credit' | 'cash' | 'voucher' | 'mixed';

type UserFormState = {
  id?: string;
  name: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  companyId: string;
  branchId: string;
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
  companyId: '',
  branchId: '',
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Gerente',
  cashier: 'Caixa',
};

const paymentLabels: Record<PaymentMethod, string> = {
  pix: 'Pix',
  debit: 'Debito',
  credit: 'Credito',
  cash: 'Dinheiro',
  voucher: 'Voucher',
  mixed: 'Misto',
};

const fiscalStatusLabels: Record<FiscalDocument['status'], string> = {
  draft: 'Rascunho',
  pending: 'Pendente',
  authorized: 'Autorizada',
  rejected: 'Rejeitada',
  cancelled: 'Cancelada',
};

function formatMoney(cents = 0) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseMoneyToCents(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  return Math.round(Number(normalized || 0) * 100);
}

function downloadText(filename: string, content: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

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
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/dashboard');
      return response.data;
    },
  });
  const summary = data?.summary;
  const paymentRows = Object.entries(data?.paymentTotals || {});

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Vendas hoje', value: formatMoney(summary?.salesTodayCents || 0), helper: `${summary?.salesCount || 0} cupons`, icon: ShoppingCart, tone: 'text-brand-600 bg-brand-600/10 dark:text-brand-300 dark:bg-brand-500/15' },
          { label: 'Ticket medio', value: formatMoney(summary?.averageTicketCents || 0), helper: 'Por venda finalizada', icon: CreditCard, tone: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-300 dark:bg-emerald-500/15' },
          { label: 'Estoque critico', value: String(summary?.criticalStock || 0), helper: 'Produtos abaixo do minimo', icon: Boxes, tone: 'text-rose-600 bg-rose-500/10 dark:text-rose-300 dark:bg-rose-500/15' },
          { label: 'Fiscal pendente', value: String(summary?.pendingFiscal || 0), helper: 'NFC-e/NF-e para tratar', icon: FileText, tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-300 dark:bg-amber-500/15' },
        ].map((card) => {
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
              <h2 className="text-base font-bold text-slate-950 dark:text-white">Vendas recentes</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Hoje</span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {isLoading ? (
              <p className="py-10 text-center text-sm text-slate-500">Carregando dashboard...</p>
            ) : (data?.recentSales || []).length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">Nenhuma venda finalizada hoje.</p>
            ) : (
              data?.recentSales.map((sale) => (
                <div key={sale.id} className="grid gap-3 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_120px_120px] sm:items-center">
                  <div>
                    <p className="font-bold text-slate-950 dark:text-white">Venda {sale.id.slice(0, 8)}</p>
                    <p className="text-xs text-slate-500">{new Date(sale.createdAt).toLocaleString('pt-BR')} - {paymentLabels[sale.paymentMethod]}</p>
                  </div>
                  <span className="font-bold text-slate-950 dark:text-white">{formatMoney(sale.totalCents)}</span>
                  <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    Finalizada
                  </span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex items-center gap-2">
            <CreditCard className="text-emerald-600 dark:text-emerald-400" size={19} />
            <h2 className="text-base font-bold text-slate-950 dark:text-white">Meios de pagamento</h2>
          </div>

          <div className="space-y-3">
            {paymentRows.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950">Sem pagamentos registrados hoje.</p>
            ) : (
              paymentRows.map(([method, value]) => (
              <div key={method} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
                  {paymentLabels[method as PaymentMethod] || method}
                </span>
                <span className="font-bold text-slate-950 dark:text-white">{formatMoney(value)}</span>
              </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ReceiptText className="text-brand-600 dark:text-brand-400" size={19} />
            <h2 className="text-base font-bold text-slate-950 dark:text-white">Rastreabilidade recente</h2>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {(data?.auditLogs || []).map((activity) => (
            <div key={activity.id} className="grid gap-3 px-6 py-4 text-sm sm:grid-cols-[120px_minmax(0,1fr)_150px] sm:items-center">
              <span className="font-bold text-brand-600 dark:text-brand-400">{activity.entity}</span>
              <div>
                <p className="font-bold text-slate-950 dark:text-white">{activity.action}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{activity.summary || 'Evento operacional'}</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">{new Date(activity.createdAt).toLocaleString('pt-BR')}</span>
            </div>
          ))}
          {(data?.auditLogs || []).length === 0 && <p className="px-6 py-8 text-center text-sm text-slate-500">Nenhum evento rastreado ainda.</p>}
        </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-950 dark:text-white">Estoque critico</h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {(data?.criticalProducts || []).map((product) => (
              <div key={product.id} className="grid gap-2 px-6 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_120px] sm:items-center">
                <div>
                  <p className="font-bold text-slate-950 dark:text-white">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.barcode || product.category || 'Produto cadastrado'}</p>
                </div>
                <span className="font-bold text-rose-600 dark:text-rose-300">{product.currentStock} {product.unit}</span>
              </div>
            ))}
            {(data?.criticalProducts || []).length === 0 && <p className="px-6 py-8 text-center text-sm text-slate-500">Nenhum produto critico.</p>}
          </div>
        </article>
      </section>
    </>
  );
}

function ProductsView({ loggedUser }: { loggedUser: LoggedUser }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', barcode: '', category: '', unit: 'un', salePrice: '', costPrice: '', minStock: '0', currentStock: '0', ncm: '', companyId: loggedUser.companyId || '', branchId: loggedUser.branchId || '' });

  const { data: productsList = [] } = useQuery<Product[]>({
    queryKey: ['products', search],
    queryFn: async () => {
      const response = await api.get('/products', { params: { search: search || undefined } });
      return response.data;
    },
  });
  const { data: companies = [] } = useQuery<Company[]>({ queryKey: ['companies'], queryFn: async () => (await api.get('/companies')).data, enabled: !!loggedUser.isMaster });
  const { data: branches = [] } = useQuery<Branch[]>({ queryKey: ['branches'], queryFn: async () => (await api.get('/branches')).data, enabled: !!loggedUser.isMaster });

  const saveProduct = useMutation({
    mutationFn: async () => api.post('/products', {
      companyId: form.companyId || undefined,
      branchId: form.branchId || undefined,
      name: form.name,
      barcode: form.barcode,
      category: form.category,
      unit: form.unit,
      salePriceCents: parseMoneyToCents(form.salePrice),
      costPriceCents: parseMoneyToCents(form.costPrice),
      minStock: Number(form.minStock || 0),
      currentStock: Number(form.currentStock || 0),
      ncm: form.ncm,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setForm({ name: '', barcode: '', category: '', unit: 'un', salePrice: '', costPrice: '', minStock: '0', currentStock: '0', ncm: '', companyId: form.companyId, branchId: form.branchId });
      toast.success('Produto cadastrado.');
    },
    onError: () => toast.error('Nao foi possivel salvar o produto.'),
  });

  const importProducts = async (file?: File) => {
    if (!file) return;
    const csv = await file.text();
    await api.post('/products/import', { csv, companyId: form.companyId || undefined, branchId: form.branchId || undefined });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success('Importacao concluida.');
  };

  const exportProducts = async () => {
    const response = await api.get('/products/export', { responseType: 'text' });
    downloadText('produtos-mouseforge.csv', response.data);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Produtos</h2>
          <p className="mt-1 text-sm text-slate-500">Cadastro rapido com codigo de barras, preco, estoque e fiscal basico.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 dark:border-slate-800 dark:text-slate-200">
            <Upload size={17} />
            Importar CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => importProducts(event.target.files?.[0])} />
          </label>
          <button type="button" onClick={exportProducts} className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 dark:border-slate-800 dark:text-slate-200">
            <Download size={17} />
            Exportar
          </button>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.name.trim() || !form.salePrice) {
            toast.error('Informe nome e preco de venda.');
            return;
          }
          saveProduct.mutate();
        }}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="grid gap-3 md:grid-cols-4">
          {loggedUser.isMaster && (
            <>
              <select value={form.companyId} onChange={(event) => setForm((current) => ({ ...current, companyId: event.target.value, branchId: '' }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950">
                <option value="">Empresa</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
              <select value={form.branchId} onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950">
                <option value="">Todas as filiais</option>
                {branches.filter((branch) => branch.companyId === form.companyId).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </>
          )}
          <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Nome do produto" />
          <input value={form.barcode} onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Codigo de barras" />
          <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Categoria" />
          <input value={form.salePrice} onChange={(event) => setForm((current) => ({ ...current, salePrice: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Preco venda" />
          <input value={form.costPrice} onChange={(event) => setForm((current) => ({ ...current, costPrice: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Custo" />
          <input value={form.currentStock} onChange={(event) => setForm((current) => ({ ...current, currentStock: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Estoque" />
          <input value={form.minStock} onChange={(event) => setForm((current) => ({ ...current, minStock: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Minimo" />
          <input value={form.ncm} onChange={(event) => setForm((current) => ({ ...current, ncm: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="NCM" />
          <button type="submit" className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white">
            <Plus size={17} />
            Salvar
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Buscar por nome, codigo ou SKU" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-950/50">
              <tr><th className="px-5 py-4">Produto</th><th>Categoria</th><th>Preco</th><th>Estoque</th><th>NCM</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {productsList.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-5 py-4"><p className="font-bold text-slate-950 dark:text-white">{product.name}</p><p className="text-xs text-slate-500">{product.barcode || product.sku || '-'}</p></td>
                  <td>{product.category || '-'}</td>
                  <td className="font-bold">{formatMoney(product.salePriceCents)}</td>
                  <td className={product.currentStock <= product.minStock ? 'font-bold text-rose-600' : 'font-semibold'}>{product.currentStock} {product.unit}</td>
                  <td>{product.ncm || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CustomersView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', document: '', phone: '', email: '' });
  const { data: customersList = [] } = useQuery<Customer[]>({ queryKey: ['customers', search], queryFn: async () => (await api.get('/customers', { params: { search: search || undefined } })).data });
  const saveCustomer = useMutation({
    mutationFn: async () => api.post('/customers', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setForm({ name: '', document: '', phone: '', email: '' });
      toast.success('Cliente salvo.');
    },
  });

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Clientes</h2>
        <p className="mt-1 text-sm text-slate-500">Cadastro rapido para venda identificada, CPF/CNPJ e contato.</p>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); saveCustomer.mutate(); }} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-5">
        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950 md:col-span-2" placeholder="Nome" />
        <input value={form.document} onChange={(event) => setForm((current) => ({ ...current, document: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="CPF/CNPJ" />
        <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Telefone" />
        <button className="min-h-[44px] rounded-lg bg-brand-600 px-4 text-sm font-bold text-white">Salvar</button>
      </form>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-5"><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-[44px] w-full max-w-md rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Pesquisar cliente" /></div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {customersList.map((customer) => <div key={customer.id} className="grid gap-2 px-5 py-4 text-sm md:grid-cols-[minmax(0,1fr)_160px_160px]"><strong>{customer.name}</strong><span>{customer.document || '-'}</span><span>{customer.phone || '-'}</span></div>)}
        </div>
      </div>
    </section>
  );
}

function StockView() {
  const queryClient = useQueryClient();
  const [movement, setMovement] = useState({ productId: '', type: 'entry', quantity: '1', reason: '' });
  const { data: productsList = [] } = useQuery<Product[]>({ queryKey: ['products'], queryFn: async () => (await api.get('/products')).data });
  const { data: movements = [] } = useQuery<Array<{ id: string; productId: string; type: string; quantity: number; reason?: string; createdAt: string }>>({ queryKey: ['stock-movements'], queryFn: async () => (await api.get('/stock/movements')).data });
  const saveMovement = useMutation({
    mutationFn: async () => api.post('/stock/movements', { ...movement, quantity: Number(movement.quantity) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Estoque atualizado.');
    },
  });

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Estoque</h2>
        <p className="mt-1 text-sm text-slate-500">Entradas, perdas e ajustes com rastreabilidade.</p>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); saveMovement.mutate(); }} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-5">
        <select value={movement.productId} onChange={(event) => setMovement((current) => ({ ...current, productId: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950 md:col-span-2">
          <option value="">Produto</option>
          {productsList.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
        <select value={movement.type} onChange={(event) => setMovement((current) => ({ ...current, type: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950">
          <option value="entry">Entrada</option>
          <option value="loss">Perda</option>
          <option value="adjustment">Ajuste</option>
        </select>
        <input value={movement.quantity} onChange={(event) => setMovement((current) => ({ ...current, quantity: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Qtd" />
        <button className="min-h-[44px] rounded-lg bg-brand-600 px-4 text-sm font-bold text-white">Registrar</button>
      </form>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-4 font-bold dark:border-slate-800">Saldos</div>
          {productsList.map((product) => <div key={product.id} className="flex justify-between border-b border-slate-100 px-5 py-3 text-sm dark:border-slate-800"><span>{product.name}</span><strong className={product.currentStock <= product.minStock ? 'text-rose-600' : ''}>{product.currentStock} {product.unit}</strong></div>)}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-4 font-bold dark:border-slate-800">Ultimas movimentacoes</div>
          {movements.map((item) => <div key={item.id} className="flex justify-between border-b border-slate-100 px-5 py-3 text-sm dark:border-slate-800"><span>{item.type}</span><strong>{item.quantity}</strong></div>)}
        </div>
      </div>
    </section>
  );
}

function CashierView({ loggedUser }: { loggedUser: LoggedUser }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
  const { data: productsList = [] } = useQuery<Product[]>({ queryKey: ['products', search], queryFn: async () => (await api.get('/products', { params: { search: search || undefined } })).data });
  const totalCents = cart.reduce((total, item) => total + item.product.salePriceCents * item.quantity, 0);
  const finishSale = useMutation({
    mutationFn: async () => api.post('/sales', { paymentMethod, items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })), companyId: loggedUser.companyId || undefined, branchId: loggedUser.branchId || undefined }),
    onSuccess: () => {
      setCart([]);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Venda finalizada e documento fiscal pendente criado.');
    },
    onError: () => toast.error('Nao foi possivel finalizar a venda.'),
  });

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { product, quantity: 1 }];
    });
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_420px]">
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Frente de caixa</h2>
          <p className="mt-1 text-sm text-slate-500">Busque pelo nome ou codigo, adicione e finalize rapido.</p>
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="mt-4 min-h-[48px] w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Buscar produto ou bipar codigo de barras" autoFocus />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {productsList.slice(0, 20).map((product) => (
            <button key={product.id} type="button" onClick={() => addToCart(product)} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-brand-500 dark:border-slate-800 dark:bg-slate-900">
              <p className="font-bold text-slate-950 dark:text-white">{product.name}</p>
              <p className="text-xs text-slate-500">{product.barcode || product.category || 'Sem codigo'}</p>
              <p className="mt-3 text-lg font-extrabold text-brand-600">{formatMoney(product.salePriceCents)}</p>
            </button>
          ))}
        </div>
      </div>
      <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">Carrinho</h3>
        <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
          {cart.map((item) => <div key={item.product.id} className="flex justify-between py-3 text-sm"><span>{item.quantity}x {item.product.name}</span><strong>{formatMoney(item.product.salePriceCents * item.quantity)}</strong></div>)}
          {cart.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Nenhum item.</p>}
        </div>
        <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} className="mt-5 min-h-[44px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950">
          {Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <div className="mt-5 flex items-center justify-between text-xl font-extrabold"><span>Total</span><span>{formatMoney(totalCents)}</span></div>
        <button disabled={cart.length === 0 || finishSale.isPending} onClick={() => finishSale.mutate()} className="mt-5 min-h-[48px] w-full rounded-lg bg-brand-600 px-4 text-sm font-bold text-white disabled:bg-slate-300">Finalizar venda</button>
      </aside>
    </section>
  );
}

function FiscalView() {
  const queryClient = useQueryClient();
  const { data: documents = [] } = useQuery<FiscalDocument[]>({ queryKey: ['fiscal-documents'], queryFn: async () => (await api.get('/fiscal-documents')).data });
  const issueDocument = useMutation({
    mutationFn: async (id: string) => api.post(`/fiscal-documents/${id}/issue`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Documento fiscal processado.');
    },
    onError: () => toast.error('Nao foi possivel emitir o documento fiscal.'),
  });
  const updateDocument = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FiscalDocument['status'] }) => api.put(`/fiscal-documents/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Notas fiscais</h2>
        <p className="mt-1 text-sm text-slate-500">Controle operacional de NFC-e/NF-e. A transmissao real depende de certificado, CSC e integracao fiscal.</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {documents.map((document) => (
          <div key={document.id} className="grid gap-3 border-b border-slate-200 px-5 py-4 text-sm dark:border-slate-800 md:grid-cols-[120px_minmax(0,1fr)_140px_180px_120px] md:items-center">
            <strong>{document.type.toUpperCase()}</strong>
            <span>
              Venda {document.saleId?.slice(0, 8) || '-'} - {formatMoney(document.totalCents)}
              {document.accessKey && <small className="block text-xs text-slate-500">Chave {document.accessKey}</small>}
              {document.errorMessage && <small className="block text-xs text-rose-600">{document.errorMessage}</small>}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{fiscalStatusLabels[document.status]}</span>
            <select value={document.status} onChange={(event) => updateDocument.mutate({ id: document.id, status: event.target.value as FiscalDocument['status'] })} className="min-h-[40px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950">
              <option value="pending">Pendente</option>
              <option value="authorized">Autorizada</option>
              <option value="rejected">Rejeitada</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <button
              type="button"
              onClick={() => issueDocument.mutate(document.id)}
              disabled={document.status === 'authorized' || document.status === 'cancelled' || issueDocument.isPending}
              className="min-h-[40px] rounded-lg bg-brand-600 px-3 text-xs font-bold text-white disabled:bg-slate-300 dark:disabled:bg-slate-800"
            >
              Emitir
            </button>
          </div>
        ))}
        {documents.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">Nenhum documento fiscal criado.</p>}
      </div>
    </section>
  );
}

function ReportsView() {
  const today = new Date().toISOString().slice(0, 10);
  const [period, setPeriod] = useState({ start: today, end: today });
  const { data } = useQuery<PeriodReport>({ queryKey: ['period-report', period], queryFn: async () => (await api.get('/reports/period', { params: period })).data });
  const exportReport = () => {
    const csv = ['data,total,forma', ...(data?.sales || []).map((sale) => `${sale.createdAt},${sale.totalCents / 100},${sale.paymentMethod}`)].join('\n');
    downloadText('relatorio-vendas.csv', csv);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Relatorios por periodo</h2>
          <p className="mt-1 text-sm text-slate-500">Vendas consolidadas por periodo, forma de pagamento e filial conforme permissao.</p>
        </div>
        <button onClick={exportReport} className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold dark:border-slate-800"><Download size={17} />Exportar</button>
      </div>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
        <input type="date" value={period.start} onChange={(event) => setPeriod((current) => ({ ...current, start: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" />
        <input type="date" value={period.end} onChange={(event) => setPeriod((current) => ({ ...current, end: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold uppercase text-slate-500">Total</p><p className="mt-2 text-2xl font-extrabold">{formatMoney(data?.totalCents || 0)}</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold uppercase text-slate-500">Vendas</p><p className="mt-2 text-2xl font-extrabold">{data?.salesCount || 0}</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold uppercase text-slate-500">Ticket medio</p><p className="mt-2 text-2xl font-extrabold">{formatMoney(data?.averageTicketCents || 0)}</p></article>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {(data?.sales || []).map((sale) => <div key={sale.id} className="grid gap-2 border-b border-slate-100 px-5 py-4 text-sm dark:border-slate-800 md:grid-cols-[minmax(0,1fr)_120px_120px]"><span>{new Date(sale.createdAt).toLocaleString('pt-BR')}</span><strong>{paymentLabels[sale.paymentMethod]}</strong><strong>{formatMoney(sale.totalCents)}</strong></div>)}
      </div>
    </section>
  );
}

function FinanceView() {
  return <ReportsView />;
}

function SettingsView({ loggedUser }: { loggedUser: LoggedUser }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    companyId: loggedUser.companyId || '',
    branchId: loggedUser.branchId || '',
    provider: 'manual',
    environment: 'homologation',
    uf: '',
    legalName: '',
    stateRegistration: '',
    cscId: '',
    cscSecretRef: '',
    certificateRef: '',
    nfceSeries: '1',
    nextNfceNumber: '1',
  });
  const { data: settings = [] } = useQuery<FiscalSetting[]>({ queryKey: ['fiscal-settings'], queryFn: async () => (await api.get('/fiscal-settings')).data });
  const { data: companies = [] } = useQuery<Company[]>({ queryKey: ['companies'], queryFn: async () => (await api.get('/companies')).data, enabled: !!loggedUser.isMaster });
  const { data: branches = [] } = useQuery<Branch[]>({ queryKey: ['branches'], queryFn: async () => (await api.get('/branches')).data, enabled: !!loggedUser.isMaster });
  const saveSetting = useMutation({
    mutationFn: async () => api.put('/fiscal-settings', {
      ...form,
      companyId: form.companyId || undefined,
      branchId: form.branchId || undefined,
      nextNfceNumber: Number(form.nextNfceNumber || 1),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-settings'] });
      toast.success('Configuracao fiscal salva.');
    },
    onError: () => toast.error('Nao foi possivel salvar configuracao fiscal.'),
  });

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Configuracoes fiscais</h2>
        <p className="mt-2 text-sm text-slate-500">Configure NFC-e por empresa/filial. O modo manual em homologacao simula autorizacao para testar o fluxo; producao exige provedor fiscal real.</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          saveSetting.mutate();
        }}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {loggedUser.isMaster && (
            <>
              <select value={form.companyId} onChange={(event) => setForm((current) => ({ ...current, companyId: event.target.value, branchId: '' }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950">
                <option value="">Empresa</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
              <select value={form.branchId} onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950">
                <option value="">Todas as filiais</option>
                {branches.filter((branch) => branch.companyId === form.companyId).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </>
          )}
          <select value={form.provider} onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950">
            <option value="manual">Manual/homologacao</option>
            <option value="focus">Focus NFe</option>
            <option value="nfeio">NFE.io</option>
            <option value="tecnospeed">TecnoSpeed</option>
            <option value="plugnotas">PlugNotas</option>
          </select>
          <select value={form.environment} onChange={(event) => setForm((current) => ({ ...current, environment: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950">
            <option value="homologation">Homologacao</option>
            <option value="production">Producao</option>
          </select>
          <input value={form.uf} onChange={(event) => setForm((current) => ({ ...current, uf: event.target.value.toUpperCase().slice(0, 2) }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="UF" />
          <input value={form.legalName} onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950 md:col-span-2" placeholder="Razao social" />
          <input value={form.stateRegistration} onChange={(event) => setForm((current) => ({ ...current, stateRegistration: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Inscricao estadual" />
          <input value={form.cscId} onChange={(event) => setForm((current) => ({ ...current, cscId: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="ID CSC" />
          <input value={form.cscSecretRef} onChange={(event) => setForm((current) => ({ ...current, cscSecretRef: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Referencia do segredo CSC" />
          <input value={form.certificateRef} onChange={(event) => setForm((current) => ({ ...current, certificateRef: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Referencia certificado A1" />
          <input value={form.nfceSeries} onChange={(event) => setForm((current) => ({ ...current, nfceSeries: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Serie NFC-e" />
          <input value={form.nextNfceNumber} onChange={(event) => setForm((current) => ({ ...current, nextNfceNumber: event.target.value }))} className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950" placeholder="Proximo numero" />
          <button type="submit" className="min-h-[44px] rounded-lg bg-brand-600 px-4 text-sm font-bold text-white">Salvar fiscal</button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 font-bold dark:border-slate-800">Configuracoes salvas</div>
        {settings.map((setting) => (
          <button
            type="button"
            key={setting.id}
            onClick={() => setForm({
              companyId: setting.companyId,
              branchId: setting.branchId || '',
              provider: setting.provider,
              environment: setting.environment,
              uf: setting.uf || '',
              legalName: setting.legalName || '',
              stateRegistration: setting.stateRegistration || '',
              cscId: setting.cscId || '',
              cscSecretRef: setting.cscSecretRef || '',
              certificateRef: setting.certificateRef || '',
              nfceSeries: setting.nfceSeries,
              nextNfceNumber: String(setting.nextNfceNumber),
            })}
            className="grid w-full gap-2 border-b border-slate-100 px-5 py-4 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 md:grid-cols-[minmax(0,1fr)_150px_150px]"
          >
            <span className="font-bold">{setting.legalName || 'Configuracao fiscal'}</span>
            <span>{setting.provider}</span>
            <span>{setting.environment === 'production' ? 'Producao' : 'Homologacao'}</span>
          </button>
        ))}
        {settings.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">Nenhuma configuracao fiscal cadastrada.</p>}
      </div>
    </section>
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

  const saveUser = useMutation({
    mutationFn: async (payload: UserFormState) => {
      if (payload.id) {
        const response = await api.put(`/users/${payload.id}`, {
          name: payload.name,
          username: payload.username,
          role: payload.role,
          companyId: payload.companyId || null,
          branchId: payload.branchId || null,
        });
        return response.data;
      }

      const response = await api.post('/users', {
        name: payload.name,
        email: payload.email,
        username: payload.username,
        password: payload.password,
        role: payload.role,
        companyId: payload.companyId || undefined,
        branchId: payload.branchId || undefined,
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
      companyId: user.companyId || '',
      branchId: user.branchId || '',
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

    if (loggedUser.isMaster && form.role !== 'admin' && !form.companyId) {
      toast.error('Informe a empresa do usuario.');
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
      const companyName = companies.find((company) => company.id === user.companyId)?.name;
      const branchName = branches.find((branch) => branch.id === user.branchId)?.name;
      const searchableText = [user.name, user.email, user.username, roleLabels[user.role], companyName, branchName, user.isMaster ? 'mestre master' : '']
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return terms.every((term) => searchableText.includes(term));
    });
  }, [branches, companies, normalizedSearch, users]);

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
                <th className="px-5 py-4">Empresa/filial</th>
                <th className="px-5 py-4">Cargo</th>
                <th className="px-5 py-4">Criado em</th>
                <th className="px-5 py-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={7}>
                    Carregando usuarios...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={7}>
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
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{companies.find((company) => company.id === user.companyId)?.name || '-'}</p>
                      <p className="text-xs text-slate-500">{branches.find((branch) => branch.id === user.branchId)?.name || 'Todas as filiais'}</p>
                    </td>
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

              {loggedUser.isMaster && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Empresa
                    <select
                      value={form.companyId}
                      onChange={(event) => setForm((current) => ({ ...current, companyId: event.target.value, branchId: '' }))}
                      className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:ring-2 focus:ring-brand-600 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="">Sem empresa</option>
                      {companies
                        .filter((company) => company.isActive)
                        .map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Filial
                    <select
                      value={form.branchId}
                      onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}
                      disabled={!form.companyId}
                      className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:ring-2 focus:ring-brand-600 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="">Todas as filiais</option>
                      {branches
                        .filter((branch) => branch.isActive && branch.companyId === form.companyId)
                        .map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
              )}
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
  const [selectedTermId, setSelectedTermId] = useState('');

  const { data: termsList = [] } = useQuery<LegalTerm[]>({
    queryKey: ['terms'],
    queryFn: async () => {
      const response = await api.get('/terms');
      return response.data;
    },
    enabled: !!loggedUser.isMaster,
  });

  useEffect(() => {
    if (!selectedTermId && termsList.length > 0) {
      setSelectedTermId(termsList.find((term) => term.isActive)?.id || termsList[0].id);
    }
  }, [selectedTermId, termsList]);

  const { data: acceptanceReport, isLoading: isLoadingAcceptances } = useQuery<TermAcceptanceReport>({
    queryKey: ['term-acceptances', selectedTermId],
    queryFn: async () => {
      const response = await api.get(`/terms/${selectedTermId}/acceptances`);
      return response.data;
    },
    enabled: !!loggedUser.isMaster && !!selectedTermId,
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
      queryClient.invalidateQueries({ queryKey: ['term-acceptances'] });
      setForm({ id: '', title: '', version: '', content: '' });
      toast.success('Termo salvo com sucesso.');
    },
  });

  const toggleTerm = useMutation({
    mutationFn: async (term: LegalTerm) => api.put(`/terms/${term.id}`, { isActive: !term.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      queryClient.invalidateQueries({ queryKey: ['term-acceptances'] });
    },
  });

  const acceptanceUsers = acceptanceReport?.users || [];
  const acceptedUsers = acceptanceUsers.filter((user) => user.acceptedAt);
  const pendingUsers = acceptanceUsers.filter((user) => !user.acceptedAt);

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

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white">Aceites dos usuarios</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Auditoria de quem aceitou ou ainda precisa aceitar o termo selecionado.</p>
          </div>
          <select
            value={selectedTermId}
            onChange={(event) => setSelectedTermId(event.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-brand-600 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            {termsList.map((term) => (
              <option key={term.id} value={term.id}>
                {term.title} v{term.version}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 px-5 py-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Usuarios</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">{acceptanceUsers.length}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Aceitaram</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">{acceptedUsers.length}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Pendentes</p>
            <p className="mt-2 text-2xl font-extrabold text-amber-700 dark:text-amber-300">{pendingUsers.length}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                <th className="px-5 py-4">Usuario</th>
                <th className="px-5 py-4">Cargo</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Aceito em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
              {isLoadingAcceptances ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={4}>
                    Carregando aceites...
                  </td>
                </tr>
              ) : acceptanceUsers.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={4}>
                    Nenhum usuario encontrado para auditoria.
                  </td>
                </tr>
              ) : (
                acceptanceUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-950 dark:text-white">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.username ? `@${user.username}` : user.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${user.acceptedAt ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'}`}>
                        <FileCheck2 size={14} />
                        {user.acceptedAt ? 'Aceito' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                      {user.acceptedAt ? new Date(user.acceptedAt).toLocaleString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
          {activeView === 'cashier' && <CashierView loggedUser={userLogado} />}
          {activeView === 'fiscal' && <FiscalView />}
          {activeView === 'finance' && <FinanceView />}
          {activeView === 'products' && <ProductsView loggedUser={userLogado} />}
          {activeView === 'stock' && <StockView />}
          {activeView === 'customers' && <CustomersView />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'settings' && <SettingsView loggedUser={userLogado} />}
        </div>
      </main>
      <TermsAcceptanceGate />
    </div>
  );
}
