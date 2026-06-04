import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { LogOut, UserPlus, Trash2, Users, ReceiptText, ShoppingCart, Boxes, WalletCards } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export function Home() {
  const queryClient = useQueryClient();
  const userLogado = JSON.parse(localStorage.getItem('mouseforge:user') || '{}');

  const { data: userList, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
  });

  const { mutate: deleteUser } = useMutation({
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

  const handleLogout = () => {
    localStorage.removeItem('mouseforge:token');
    localStorage.removeItem('mouseforge:user');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">MouseForge PDV</h2>
          <p className="text-xs text-slate-400">Operador: {userLogado.name || 'Nenhum'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 bg-slate-700 hover:bg-red-600/20 text-slate-300 hover:text-red-400 rounded-xl transition-all"
          title="Sair do sistema"
        >
          <LogOut size={20} />
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-2xl shadow-lg">
            <ShoppingCart className="text-white/80 mb-3" size={24} />
            <h3 className="text-lg font-semibold text-white/90">Frente de Caixa</h3>
            <p className="text-xs text-white/70 mt-1">Terminal pronto para vendas, descontos e formas de pagamento.</p>
            <button className="mt-4 px-4 py-2 bg-white text-emerald-950 font-medium rounded-xl text-sm hover:bg-slate-100 transition-all">
              Abrir Caixa
            </button>
          </div>

          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col justify-between">
            <div>
              <ReceiptText className="text-sky-400 mb-3" size={24} />
              <h3 className="text-lg font-semibold text-white">Notas Fiscais</h3>
              <p className="text-xs text-slate-400 mt-1">Status de transmissao e contingencia NFC-e / NF-e.</p>
            </div>
            <span className="text-xs font-medium text-emerald-400 mt-4 bg-emerald-500/10 px-2 py-1 rounded w-fit">
              Sefaz Online
            </span>
          </div>

          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <Boxes className="text-amber-400 mb-3" size={24} />
            <h3 className="text-lg font-semibold text-white">Estoque</h3>
            <p className="text-xs text-slate-400 mt-1">Cadastro de produtos, codigos de barra, margens e reposicao.</p>
          </div>

          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <WalletCards className="text-violet-400 mb-3" size={24} />
            <h3 className="text-lg font-semibold text-white">Financeiro</h3>
            <p className="text-xs text-slate-400 mt-1">Sangria, suprimento, fechamento de caixa e conferencias.</p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Users className="text-emerald-500" size={22} />
              <h3 className="text-lg font-bold">Colaboradores do Sistema</h3>
            </div>
            <button
              onClick={() => toast.info('Cadastro de colaborador sera aberto aqui.')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 font-semibold rounded-xl text-sm transition-all shadow-md"
            >
              <UserPlus size={16} /> Novo Usuario
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-400 text-center py-4">Buscando colaboradores...</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-700">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Cargo</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3 text-center">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 text-sm">
                  {userList?.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-700/30 transition-all">
                      <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                      <td className="px-4 py-3 text-slate-300">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-900 text-slate-300 rounded text-xs capitalize">{user.role}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 flex justify-center gap-2">
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded transition-all"
                          title="Remover colaborador"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
