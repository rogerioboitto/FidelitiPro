
import React, { useState, useMemo } from 'react';
import type { Store, PlanPricing, SubscriptionPlan, PlanLimits, PlatformStats } from '../types';
import {
    Store as StoreIcon, ShieldCheck, LogOut, Trash2,
    LayoutGrid, DollarSign, Save, Search, CheckCircle, CreditCard, AlertCircle,
    Clock, Users, HelpCircle, TrendingUp, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CloudService } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
    const { stores, logout, refreshStores, loginAsStore } = useAuth();
    const navigate = useNavigate();

    // Local state for pricing (since it's not in context yet, let's fetch it or props?
    // Ideally context should have pricing, but let's fetch on mount or keep it simple)
    // For now, let's fetch pricing on mount inside this component or add to context.
    // Context is better. Let's assume we add pricing to context later or just fetch here.
    // I'll add a simple local fetch for now to keep it isolated.
    const [pricing, setPricing] = useState<PlanPricing>({ Trial: 0, Basic: 49.9, Pro: 99.9, Enterprise: 199.9 });
    const [limits, setLimits] = useState<PlanLimits>({ Trial: 10, Basic: 100, Pro: 500, Enterprise: 999999 });

    const [tab, setTab] = useState<'overview' | 'stores' | 'pricing' | 'analytics'>('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState<'24h' | '7d' | '30d' | 'all'>('all');
    const [revenueFilter, setRevenueFilter] = useState<'24h' | '7d' | '30d' | 'all'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [tempPricing, setTempPricing] = useState<PlanPricing>(pricing);
    const [tempLimits, setTempLimits] = useState<PlanLimits>(limits);
    const [saveStatus, setSaveStatus] = useState('');
    const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);

    // Fetch pricing on mount
    React.useEffect(() => {
        CloudService.getPricing().then(p => {
            setPricing(p);
            setTempPricing(p);
        });
        CloudService.getLimits().then(l => {
            setLimits(l);
            setTempLimits(l);
        });
        CloudService.getPlatformStats().then(setPlatformStats);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleDeleteStore = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta loja? Todos os dados serão perdidos de forma IRREVERSÍVEL.')) {
            await CloudService.deleteStore(id);
            await refreshStores();
        }
    };



    const handleSavePricing = async () => {
        await CloudService.savePricing(tempPricing);
        await CloudService.saveLimits(tempLimits);
        setPricing(tempPricing);
        setLimits(tempLimits);
        setSaveStatus('Configurações atualizadas com sucesso!');
        setTimeout(() => setSaveStatus(''), 3000);
    };

    const handleAccessStore = (store: Store) => {
        loginAsStore(store);
        navigate('/dashboard');
    };

    const stats = useMemo(() => {
        const counts = {
            Trial: stores.filter(s => s.subscription?.plan === 'Trial').length,
            Basic: stores.filter(s => s.subscription?.plan === 'Basic').length,
            Pro: stores.filter(s => s.subscription?.plan === 'Pro').length,
            Enterprise: stores.filter(s => s.subscription?.plan === 'Enterprise').length,
        };

        return {
            totalStores: stores.length,
            counts,
            activeSubscriptions: stores.filter(s => s.subscription?.status === 'active').length,
            revenue: stores.reduce((acc, s) => {
                if (s.subscription?.status === 'active') {
                    return acc + (pricing[s.subscription.plan] || 0);
                }
                return acc;
            }, 0),
            totalCustomers: stores.reduce((acc, s) => acc + Object.keys(s.customers || {}).length, 0)
        };
    }, [stores, pricing]);

    const revenueStats = useMemo(() => {
        const now = Date.now();
        const Day = 24 * 60 * 60 * 1000;

        return stores.reduce((acc, store) => {
            const price = pricing[store.subscription?.plan || 'Basic'] || 0;
            // Use createdAt to estimate history
            const createdAt = store.createdAt || now;
            const diff = now - createdAt;

            if (revenueFilter === '24h') {
                return diff <= Day ? acc + price : acc;
            }
            if (revenueFilter === '7d') {
                return diff <= 7 * Day ? acc + price : acc;
            }
            if (revenueFilter === '30d') {
                return diff <= 30 * Day ? acc + price : acc;
            }

            // For 'All', we estimate total collected over lifetime
            // Months Active = (Now - CreatedAt) / 30 days
            const months = Math.max(1, Math.ceil(diff / (30 * Day)));
            return acc + (price * months);
        }, 0);
    }, [stores, pricing, revenueFilter]);

    // Pagination Logic
    const filteredLogs = useMemo(() => {
        if (!platformStats?.history) return [];
        const logs = [...platformStats.history].reverse();
        if (dateFilter === 'all') return logs;

        const now = Date.now();
        return logs.filter(item => {
            const time = item.timestamp;
            if (dateFilter === '24h') return (now - time) < 24 * 60 * 60 * 1000;
            if (dateFilter === '7d') return (now - time) < 7 * 24 * 60 * 60 * 1000;
            if (dateFilter === '30d') return (now - time) < 30 * 24 * 60 * 60 * 1000;
            return true;
        });
    }, [platformStats, dateFilter]);

    const totalPages = Math.ceil(filteredLogs.length / 50);
    const paginatedLogs = filteredLogs.slice((currentPage - 1) * 50, currentPage * 50);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [dateFilter]);

    const [currentStorePage, setCurrentStorePage] = useState(1);

    // Reset pagination when search changes
    React.useEffect(() => {
        setCurrentStorePage(1);
    }, [searchTerm]);

    // Filtered and Paginated Stores
    const filteredStores = stores.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalStorePages = Math.ceil(filteredStores.length / 50);
    const paginatedStores = filteredStores.slice((currentStorePage - 1) * 50, currentStorePage * 50);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            <aside className="w-full md:w-72 bg-slate-900 text-white p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-12 p-2">
                    <div className="bg-amber-500 p-2 rounded-xl text-slate-900 shadow-lg">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h1 className="font-black text-lg tracking-tight leading-none">FidelitiPro</h1>
                        <p className="text-[11px] font-black uppercase tracking-widest text-amber-500 mt-1">SaaS Admin</p>
                    </div>
                </div>

                <nav className="space-y-2 flex-1">
                    <button onClick={() => setTab('overview')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all ${tab === 'overview' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-white/5 text-slate-400'}`}><LayoutGrid size={18} /> Visão Geral</button>
                    <button onClick={() => setTab('stores')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all ${tab === 'stores' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-white/5 text-slate-400'}`}><StoreIcon size={18} /> Lojas e Assinantes</button>
                    <button onClick={() => setTab('pricing')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all ${tab === 'pricing' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-white/5 text-slate-400'}`}><DollarSign size={18} /> Planos & Preços</button>

                </nav>

                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-4 text-rose-400 font-black text-xs uppercase tracking-widest hover:bg-rose-400/10 rounded-2xl transition-all mt-auto"><LogOut size={18} /> Sair</button>
            </aside>

            <main className="flex-1 p-8 md:p-12 overflow-y-auto h-screen no-scrollbar">
                {tab === 'overview' && (
                    <div className="animate-in fade-in zoom-in-95 duration-500">
                        <header className="mb-10">
                            <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Métricas da Plataforma</h2>
                            <p className="text-slate-400 font-medium mt-1">Sua receita e base de usuários em tempo real.</p>
                        </header>

                        {/* Revenue Card */}
                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 mb-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                                <TrendingUp size={150} className="text-indigo-600" />
                            </div>

                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Faturamento Total do App</p>
                                        <div className="group relative">
                                            <HelpCircle size={14} className="text-slate-300 cursor-help" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-800 text-white text-[10px] p-3 rounded-xl invisible group-hover:visible transition-all opacity-0 group-hover:opacity-100 font-medium z-50 text-center shadow-xl">
                                                Faturamento total do app, independente se a loja foi excluida, parou e voltou.
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="text-5xl font-black text-slate-800 tracking-tighter">
                                        R$ {revenueStats.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h3>
                                </div>

                                <div className="flex bg-slate-50 p-1.5 rounded-xl">
                                    {([['24h', '24H'], ['7d', '7 Dias'], ['30d', '30 Dias'], ['all', 'Tudo']] as const).map(([key, label]) => (
                                        <button
                                            key={key}
                                            onClick={() => setRevenueFilter(key)}
                                            className={`px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${revenueFilter === key ? 'bg-white shadow-md text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Metric Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Lojas Cadastradas</p>
                                    <p className="text-4xl font-black text-slate-800">{stores.length}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl text-slate-400">
                                    <StoreIcon size={24} />
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Total de Clientes</p>
                                    <p className="text-4xl font-black text-slate-800">
                                        {stores.reduce((acc, store) => acc + Object.keys(store.customers || {}).length, 0)}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl text-slate-400">
                                    <Users size={24} />
                                </div>
                            </div>
                        </div>

                        {/* Distribution Cards */}
                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 mb-8">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">Distribuição de Lojas por Plano</p>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {['Trial', 'Basic', 'Pro', 'Enterprise'].map(plan => (
                                    <div key={plan} className="relative pl-6 border-l-4 border-indigo-100 p-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{plan}</p>
                                        <div className="flex items-baseline gap-1">
                                            <p className="text-3xl font-black text-slate-800">{stats.counts[plan as keyof typeof stats.counts]}</p>
                                            <span className="text-[10px] font-bold text-slate-400">lojas</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Logs Table with Filter */}
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest">
                                    <Clock className="text-indigo-600" size={18} />
                                    Logs de Sessão
                                </h3>

                                <div className="flex items-center gap-2">
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        {([['24h', '24h'], ['7d', '7 Dias'], ['30d', '30 Dias'], ['all', 'Tudo']] as const).map(([key, label]) => (
                                            <button
                                                key={key}
                                                onClick={() => setDateFilter(key)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${dateFilter === key ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-2 rounded-xl uppercase ml-2">
                                        {filteredLogs.length} REGISTROS
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="p-3 pl-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                            <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loja</th>
                                            <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data e Hora</th>
                                            <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">IP</th>
                                            <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização</th>
                                            <th className="p-3 pr-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Duração</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {paginatedLogs.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-3 pl-6">
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${item.type === 'landing' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {item.type === 'landing' ? 'Site' : 'Painel Lojista'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-[10px] font-bold text-slate-500 font-mono">
                                                    {item.storeId ? stores.find(s => s.id === item.storeId)?.name || '---' : '---'}
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-700 text-xs">
                                                            {new Date(item.timestamp).toLocaleDateString('pt-BR')}
                                                        </span>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase">
                                                            {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-[10px] font-bold text-slate-500 font-mono">
                                                    {item.ip || '---'}
                                                </td>
                                                <td className="p-3 text-[10px] font-bold text-slate-500">
                                                    {item.location || '---'}
                                                </td>
                                                <td className="p-3 pr-6 text-right font-black text-slate-900 text-xs">
                                                    {item.duration < 60
                                                        ? `${item.duration}s`
                                                        : `${Math.floor(item.duration / 60)}m ${item.duration % 60}s`}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredLogs.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-12 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                                                    Nenhum dado detalhado capturado ainda.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between p-4 border-t border-slate-50">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Página {currentPage} de {totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )
                }

                {
                    tab === 'pricing' && (
                        <div className="animate-in slide-in-from-bottom-10 duration-500">
                            <header className="mb-10">
                                <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Tabela de Preços Global</h2>
                                <p className="text-slate-400 font-medium mt-1">Defina quanto você cobra de cada lojista por mês.</p>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                                {(['Trial', 'Basic', 'Pro', 'Enterprise'] as SubscriptionPlan[]).map(plan => (
                                    <div key={plan} className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col">
                                        <div className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-2xl flex items-center justify-center mb-4">
                                            <CreditCard size={20} />
                                        </div>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-black text-lg text-slate-800 uppercase tracking-tighter">{plan}</h3>
                                            <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded-lg uppercase">{stats.counts[plan]} LOJAS</span>
                                        </div>

                                        <div className="space-y-4 flex-1">
                                            <div>
                                                <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-1 block">Limite de Clientes</label>
                                                <input
                                                    type="number"
                                                    value={tempLimits[plan]}
                                                    onChange={e => setTempLimits({ ...tempLimits, [plan]: parseInt(e.target.value) || 0 })}
                                                    className="w-full p-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-black text-xl text-slate-700"
                                                />
                                                <p className="text-[11px] text-slate-400 mt-1 uppercase font-bold">{tempLimits[plan] >= 999999 ? 'Ilimitado' : `Até ${tempLimits[plan]}`}</p>
                                            </div>

                                            <div>
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Valor Mensal (R$)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={tempPricing[plan]}
                                                    onChange={e => setTempPricing({ ...tempPricing, [plan]: parseFloat(e.target.value) || 0 })}
                                                    className="w-full p-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-black text-xl text-slate-700"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col items-center gap-4">
                                <button onClick={handleSavePricing} className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-base flex items-center gap-3 shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest">
                                    <Save size={20} /> Salvar Nova Tabela de Preços
                                </button>
                                {saveStatus && <p className="text-emerald-600 font-black text-xs uppercase tracking-widest flex items-center gap-2"><CheckCircle size={16} /> {saveStatus}</p>}
                            </div>
                        </div>
                    )
                }

                {
                    tab === 'stores' && (
                        <div className="animate-in slide-in-from-right-10 duration-500">
                            <header className="flex justify-between items-end mb-10">
                                <div>
                                    <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Gestão de Lojas</h2>
                                    <p className="text-slate-400 font-medium mt-1">Acesso e planos por estabelecimento.</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="relative w-72">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <input type="text" placeholder="Buscar loja..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none shadow-sm" />
                                    </div>
                                </div>
                            </header>

                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-400 border-b border-slate-100">
                                        <tr>
                                            <th className="p-3 pl-6">Loja</th>
                                            <th className="p-3">Login (E-mail / Senha)</th>
                                            <th className="p-3">Plano</th>
                                            <th className="p-3">Clientes / Limite</th>
                                            <th className="p-3">Última Visita</th>
                                            <th className="p-3">Custo/Mês</th>
                                            <th className="text-right p-3 pr-6">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {paginatedStores.map(store => {
                                            const custCount = Object.keys(store.customers || {}).length;
                                            const limit = limits[store.subscription?.plan || 'Basic'];
                                            const isNearLimit = custCount >= limit * 0.9;

                                            return (
                                                <tr key={store.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-3 pl-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-indigo-100 rounded-xl overflow-hidden flex items-center justify-center font-black text-xs">
                                                                {store.logo ? <img src={store.logo} className="w-full h-full object-cover" /> : store.name.charAt(0)}
                                                            </div>
                                                            <div><p className="font-bold text-slate-800 text-xs">{store.name}</p></div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="text-[10px] font-bold text-slate-500">
                                                            <p className="flex items-center gap-1"><span className="text-indigo-500 text-[9px] uppercase tracking-widest min-w-[35px]">Email:</span> {store.email}</p>
                                                            <p className="flex items-center gap-1"><span className="text-rose-400 text-[9px] uppercase tracking-widest min-w-[35px]">Senha:</span> <span className="font-mono bg-slate-100 px-1 rounded text-[9px]">{store.password || 'Auth Google'}</span></p>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="bg-slate-100 rounded-lg p-1.5 font-bold text-[10px] text-slate-600 uppercase tracking-wider block text-center min-w-[70px]">
                                                            {store.subscription?.plan || 'Basic'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-black text-xs ${isNearLimit ? 'text-rose-500' : 'text-slate-800'}`}>
                                                                {custCount}
                                                            </span>
                                                            <span className="text-slate-300 font-bold text-xs">/</span>
                                                            <span className="text-slate-400 font-bold text-xs">{limit === Infinity ? '∞' : limit}</span>
                                                            {isNearLimit && <AlertCircle size={12} className="text-rose-500 animate-pulse" />}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        {store.lastVisit ? (
                                                            <div className="text-[9px] font-bold text-slate-500">
                                                                <p className="text-slate-800">{new Date(store.lastVisit).toLocaleDateString('pt-BR')}</p>
                                                                <p className="uppercase tracking-widest opacity-60">{new Date(store.lastVisit).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Nunca acessou</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="font-black text-slate-800 text-xs">R$ {pricing[store.subscription?.plan || 'Basic']?.toFixed(2)}</span>
                                                    </td>
                                                    <td className="p-3 pr-6 text-right flex items-center justify-end gap-2">
                                                        <button onClick={() => handleAccessStore(store)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-bold text-[10px] uppercase border border-indigo-100">
                                                            Acessar
                                                        </button>
                                                        <button onClick={() => handleDeleteStore(store.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls for Stores */}
                            {totalStorePages > 1 && (
                                <div className="flex items-center justify-between p-4 mt-4">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Página {currentStorePage} de {totalStorePages}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentStorePage(p => Math.max(1, p - 1))}
                                            disabled={currentStorePage === 1}
                                            className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <button
                                            onClick={() => setCurrentStorePage(p => Math.min(totalStorePages, p + 1))}
                                            disabled={currentStorePage === totalStorePages}
                                            className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }
            </main >
        </div >
    );
};

export default AdminDashboard;
