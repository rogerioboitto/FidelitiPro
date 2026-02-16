
import React, { useState, useMemo, useEffect } from 'react';
import type { HistoryEntry } from '../types';
import { validateCPF, formatCPF } from '../utils/cpfValidator';
import Button from '../components/Button';
import {
    ArrowLeft,
    Search,
    Star,
    Clock,
    Gift,
    Store as StoreIcon,
    AlertCircle,
    ShieldCheck,
    PartyPopper,
    Plus,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CloudService } from '../services/api';
// import type { CustomerData } from '../types';

interface ConsolidatedHistory extends HistoryEntry {
    storeName: string;
}

interface StoreBalance {
    name: string;
    logo?: string;
    points: number;
    redeemed: number;
    availableRewards: number;
    goal: number;
    id: string;
    hasPhone: boolean;
    customerData: any;
}

const CustomerConsultation: React.FC = () => {
    const { stores } = useAuth();
    const navigate = useNavigate();
    const [cpf, setCpf] = useState('');
    const [error, setError] = useState('');
    const [searchDone, setSearchDone] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);

    // WhatsApp Opt-in State (DISABLED)
    // const [showPhoneModal, setShowPhoneModal] = useState(false);
    // const [phoneInput, setPhoneInput] = useState('');
    // const [selectedStore, setSelectedStore] = useState<{ id: string, customer: any } | null>(null);
    // const [savingPhone, setSavingPhone] = useState(false);

    // Email Opt-in State (DISABLED)
    // const [emailInput, setEmailInput] = useState('');
    // const [savingEmail, setSavingEmail] = useState(false);
    // const [emailSuccess, setEmailSuccess] = useState(false);

    useEffect(() => {
        const fetchGeo = async () => {
            try {
                const res = await fetch('https://ipapi.co/json/');
                const data = await res.json();
                const info = { ip: data.ip, location: `${data.city}, ${data.region_code}, ${data.country_code}` };
                (window as any).trackedIpCust = info.ip;
                (window as any).trackedLocCust = info.location;
                CloudService.trackPlatformActivity('customer', 0);
            } catch (e) {
                CloudService.trackPlatformActivity('customer', 0);
            }
        };

        const startTime = Date.now();
        fetchGeo();

        return () => {
            const duration = Math.floor((Date.now() - startTime) / 1000);
            if (duration > 0) {
                CloudService.trackPlatformActivity('customer', duration, (window as any).trackedIpCust, (window as any).trackedLocCust);
            }
        };
    }, []);

    const cleanCPF = cpf.replace(/\D/g, '');

    const results = useMemo(() => {
        if (!searchDone || cleanCPF.length !== 11) return null;

        let totalPoints = 0;
        let totalRedeemed = 0;
        let totalAvailableRewards = 0;
        const history: ConsolidatedHistory[] = [];
        const storeBalances: StoreBalance[] = [];

        stores.forEach(store => {
            const customer = store.customers?.[cleanCPF];
            const goal = store.rewardGoal || 10;

            if (customer) {
                let storePoints = 0;
                let storeRedeemed = 0;

                // Handle varying data structures if any (legacy check)
                if (typeof customer === 'number') {
                    storePoints = customer;
                } else if (customer && typeof customer === 'object') {
                    storePoints = customer.points || 0;

                    if (customer.history && Array.isArray(customer.history)) {
                        customer.history.forEach(entry => {
                            if (entry.type === 'redeem') {
                                storeRedeemed += 1;
                            }
                            history.push({
                                ...entry,
                                storeName: store.name || 'Estabelecimento'
                            });
                        });
                    }
                }

                const available = Math.floor(storePoints / goal);

                if (storePoints > 0 || storeRedeemed > 0) {
                    totalPoints += storePoints;
                    totalRedeemed += storeRedeemed;
                    totalAvailableRewards += available;
                    storeBalances.push({
                        name: store.name || 'Estabelecimento',
                        logo: store.logo,
                        points: storePoints,
                        redeemed: storeRedeemed,
                        availableRewards: available,
                        goal: goal,
                        id: store.id,
                        hasPhone: !!(typeof customer === 'object' && customer.phone),
                        customerData: customer
                    });
                }
            }
        });

        if (storeBalances.length === 0) return null;

        history.sort((a, b) => b.date - a.date);

        return { totalPoints, totalRedeemed, totalAvailableRewards, history, storeBalances };
    }, [searchDone, cleanCPF, stores]);

    useEffect(() => {
        setHistoryPage(1);
    }, [results]);

    const handleSearch = () => {
        setError('');

        if (cleanCPF.length === 0) {
            setError('Informe o CPF para consultar.');
            setSearchDone(false);
            return;
        }

        if (!validateCPF(cleanCPF)) {
            setError('CPF inválido.');
            setSearchDone(false);
            return;
        }

        setSearchDone(true);
    };

    const formatDate = (timestamp: number) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(timestamp);
    };

    /* DISABLED PER USER REQUEST
    const handleOpenPhoneModal = (storeId: string, customerData: any) => {
        setSelectedStore({ id: storeId, customer: customerData });
        setPhoneInput(customerData?.phone || '');
        setShowPhoneModal(true);
    };

    const handleSavePhone = async () => {
        if (!selectedStore || !phoneInput.trim()) return;
        setSavingPhone(true);
        try {
            // Merge existing data with new phone
            const updatedCustomer: CustomerData = {
                ...selectedStore.customer,
                phone: phoneInput.trim(),
                points: selectedStore.customer.points || 0, // Ensure required fields
                history: selectedStore.customer.history || []
            };

            await CloudService.saveCustomer(selectedStore.id, updatedCustomer, cleanCPF);
            setShowPhoneModal(false);
        } catch (err) {
            console.error(err);
        } finally {
            setSavingPhone(false);
        }
    };

    const handleSaveEmail = async () => {
        if (!emailInput.includes('@') || !emailInput.includes('.')) return; // Basic validation
        setSavingEmail(true);
        try {
            // Update email for ALL stores visible in the result
            if (!results?.storeBalances) return;

            const updatePromises = results.storeBalances.map(storeInfo => {
                const updatedCustomer: CustomerData = {
                    ...storeInfo.customerData, // Current data (points, history, etc)
                    email: emailInput.trim(),
                    emailEnabled: true
                };
                return CloudService.saveCustomer(storeInfo.id, updatedCustomer, cleanCPF);
            });

            await Promise.all(updatePromises);
            setEmailSuccess(true);
            setTimeout(() => setEmailSuccess(false), 5000); // Hide success after 5s

        } catch (err) {
            console.error("Error saving email", err);
            alert("Erro ao salvar email. Tente novamente.");
        } finally {
            setSavingEmail(false);
        }
    };

    const formatPhone = (v: string) => {
        return v.replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/g, '($1) $2')
            .replace(/(\d)(\d{4})$/, '$1-$2');
    };
    */

    return (
        <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-white">
            <header className="w-full max-w-2xl mb-8 flex items-center justify-between">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-slate-500 font-black text-[11px] uppercase tracking-widest hover:text-indigo-600 transition-all p-3"
                >
                    <ArrowLeft size={16} />
                    Voltar
                </button>
                <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-indigo-600" />
                    <span className="text-slate-900 font-black text-sm tracking-tight">Fideliti<span className="text-indigo-600">Pro</span></span>
                </div>
            </header>

            <main className="w-full max-w-2xl space-y-6">
                <div className="bg-slate-900 p-8 md:p-12 rounded-[2.5rem] shadow-2xl shadow-indigo-200/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Star size={120} className="text-indigo-400 rotate-12" />
                    </div>
                    <div className="relative z-10 text-center mb-8">
                        <h1 className="text-3xl font-black text-white">Portal do Cliente</h1>
                        <p className="text-indigo-300 mt-2 font-medium">Consulte seus pontos e prêmios em tempo real</p>
                    </div>

                    <div className="relative z-10 flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            placeholder="000.000.000-00"
                            value={formatCPF(cpf)}
                            onChange={(e) => {
                                const numeric = e.target.value.replace(/\D/g, '');
                                const limited = numeric.slice(0, 11);
                                setCpf(limited);
                                setSearchDone(false);
                            }}
                            maxLength={14}
                            inputMode="numeric"
                            className="flex-1 p-5 bg-white/10 border-2 border-white/10 rounded-2xl focus:border-indigo-400 outline-none transition-all text-2xl tracking-tighter text-center font-black text-white placeholder:text-white/20"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Button onClick={handleSearch} className="p-5 rounded-2xl sm:w-24 flex justify-center items-center bg-indigo-500 hover:bg-indigo-600 shadow-xl shadow-indigo-950">
                            <Search size={32} />
                        </Button>
                    </div>
                    {error && (
                        <div className="flex items-center justify-center gap-2 mt-4 text-rose-400 font-black text-[11px] uppercase tracking-widest animate-pulse">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}
                </div>

                {searchDone && results ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
                        {results.totalAvailableRewards > 0 && (
                            <div className="bg-gradient-to-r from-amber-400 to-amber-600 p-6 rounded-[2rem] shadow-xl text-white flex items-center justify-between border-b-4 border-amber-700">
                                <div className="flex items-center gap-4">
                                    <div className="bg-white/20 p-3 rounded-2xl">
                                        <PartyPopper size={32} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="font-black text-xl leading-tight">Você tem Prêmios!</h2>
                                        <p className="text-amber-100 font-bold text-sm">Resgate disponível nos estabelecimentos.</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-4xl font-black">{results.totalAvailableRewards}</p>
                                    <p className="text-[11px] font-black uppercase">Total</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center group hover:border-indigo-500 transition-all">
                                <p className="text-slate-400 text-[11px] font-black uppercase mb-2 tracking-[0.2em]">Meus Pontos</p>
                                <p className="text-6xl font-black text-indigo-600 tracking-tighter group-hover:scale-110 transition-transform">{results.totalPoints}</p>
                                <div className="mt-4 flex justify-center gap-1">
                                    <Star size={14} className="text-amber-400 fill-amber-400" />
                                    <Star size={14} className="text-amber-400 fill-amber-400" />
                                    <Star size={14} className="text-amber-400 fill-amber-400" />
                                </div>
                            </div>
                            <div className={`bg-white p-8 rounded-3xl shadow-xl border text-center group transition-all ${results.totalAvailableRewards > 0 ? 'border-emerald-500 ring-4 ring-emerald-50' : 'border-slate-100'}`}>
                                <p className="text-slate-400 text-[11px] font-black uppercase mb-2 tracking-[0.2em]">Prêmios p/ Retirar</p>
                                <p className={`text-6xl font-black tracking-tighter group-hover:scale-110 transition-transform ${results.totalAvailableRewards > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                    {results.totalAvailableRewards}
                                </p>
                                <div className="mt-4 flex justify-center gap-1">
                                    <Gift size={14} className={results.totalAvailableRewards > 0 ? "text-emerald-500" : "text-slate-200"} />
                                </div>
                            </div>
                        </div>



                        {/* Email Registration Section - REMOVED PER USER REQUEST */}
                        {/* { !emailSuccess ? ( ... ) : ( ... ) } */}

                        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <StoreIcon className="text-indigo-600" size={20} />
                                    <h3 className="text-slate-800 font-black uppercase text-xs tracking-widest">Saldo por Empresa</h3>
                                </div>
                                <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded-full">{results.storeBalances.length}</span>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {results.storeBalances.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shadow-sm ${item.availableRewards > 0 ? 'ring-2 ring-emerald-500' : 'ring-1 ring-slate-200'}`}>
                                                {item.logo ? (
                                                    <img src={item.logo} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="bg-slate-900 text-indigo-400 w-full h-full flex items-center justify-center text-xl font-black">
                                                        {item.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 text-lg leading-tight">{item.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {item.availableRewards > 0 ? (
                                                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                                            Prêmio Liberado!
                                                        </span>
                                                    ) : (
                                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                                                            Próximo prêmio em {item.goal - (item.points % item.goal)} pontos
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-black text-indigo-600">{item.points}</span>
                                            <span className="text-[11px] font-black text-slate-400 block leading-none uppercase mt-1">Pontos</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest">
                                    <Clock className="text-indigo-600" size={18} />
                                    Atividade Recente
                                </h3>
                            </div>
                            <div className="p-4 space-y-1 relative">
                                {results.history
                                    .slice((historyPage - 1) * 15, historyPage * 15)
                                    .map((entry) => (
                                        <div key={entry.id} className="flex items-center gap-3 group p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm border ${entry.type === 'add' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-emerald-50 border-emerald-100 text-emerald-500'}`}>
                                                {entry.type === 'add' ? <Plus size={14} className="stroke-[3px]" /> : <Gift size={14} className="stroke-[3px]" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{formatDate(entry.date)}</p>
                                            </div>
                                            <div className={`text-sm font-black ${entry.type === 'add' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                                                {entry.type === 'add' ? `+${entry.amount}` : 'OK'}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                            {results.history.length > 15 && (
                                <div className="p-3 border-t border-slate-50 flex items-center justify-between bg-slate-50/50 text-xs font-bold text-slate-500 shrink-0">
                                    <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1} className="p-2 hover:bg-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ChevronLeft size={16} /></button>
                                    <span>Página {historyPage} de {Math.ceil(results.history.length / 15)}</span>
                                    <button onClick={() => setHistoryPage(p => Math.min(Math.ceil(results.history.length / 15), p + 1))} disabled={historyPage === Math.ceil(results.history.length / 15)} className="p-2 hover:bg-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ChevronRight size={16} /></button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : searchDone && (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-xl border border-slate-100">
                        <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search size={48} className="text-slate-200" />
                        </div>
                        <h3 className="text-slate-800 font-black text-2xl">Sem resultados</h3>
                        <p className="text-slate-400 font-medium mt-2 px-10 text-sm">
                            Nenhuma movimentação para o CPF <span className="text-slate-800 font-black">{formatCPF(cpf)}</span> em nossa rede.
                        </p>
                    </div>
                )
                }
            </main >

            <footer className="mt-12 py-8 text-slate-400 text-[11px] font-black text-center uppercase tracking-[0.4em]">
                FidelitiPro • Gestão de Fidelidade Licenciada
            </footer>

            {/* DISABLED PER USER REQUEST
            {
                showPhoneModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 bg-emerald-500 text-white flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <MessageCircle size={24} className="fill-white" />
                                    <h3 className="font-black text-lg">Ativar Notificações</h3>
                                </div>
                                <button onClick={() => setShowPhoneModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
                            </div>
                            <div className="p-8">
                                <p className="text-slate-600 text-sm font-medium mb-6 leading-relaxed">
                                    Receba um aviso no seu <strong>WhatsApp</strong> assim que ganhar um prêmio na loja <strong>{results?.storeBalances.find(s => s.id === selectedStore?.id)?.name}</strong>!
                                </p>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seu WhatsApp (com DDD)</label>
                                    <input
                                        type="tel"
                                        autoFocus
                                        placeholder="(00) 00000-0000"
                                        value={formatPhone(phoneInput)}
                                        onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all placeholder:text-slate-300"
                                        maxLength={15}
                                    />
                                </div>

                                <button
                                    onClick={handleSavePhone}
                                    disabled={phoneInput.length < 10 || savingPhone}
                                    className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-wider py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                                >
                                    {savingPhone ? 'Salvando...' : 'Confirmar e Ativar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            */}
        </div >
    );
};

export default CustomerConsultation;

