
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Store, HistoryEntry, CustomerData } from '../types';
import { validateCPF, formatCPF } from '../utils/cpfValidator';
import {
    Plus, LogOut, Search, Gift, X, Users, Settings,
    ShieldCheck, Clock, Upload, Zap, Share2, Trash2, ChevronLeft, ChevronRight, MessageCircle, Key, Copy, FileText
} from 'lucide-react';
import { TRIAL_LIMITS, PRICING_DEFAULTS, PLAN_LIMITS } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { CloudService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import UpgradeModal from '../components/UpgradeModal';
import QRCodeModal from '../components/QRCodeModal';

const Dashboard: React.FC = () => {
    const { user, stores, logout, pricing, limits, setStores } = useAuth();
    const navigate = useNavigate();
    const store = stores.find(s => s.id === (user as Store)?.id) || (user as Store);

    // Fallbacks
    const effectivePricing = pricing || PRICING_DEFAULTS;
    const effectiveLimits = limits || PLAN_LIMITS;

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);

    const [searchCPF, setSearchCPF] = useState('');
    const [activeCustomerCPF, setActiveCustomerCPF] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [showCustomerList, setShowCustomerList] = useState(false);
    const [customerListSearch, setCustomerListSearch] = useState('');
    const [settingsMessage, setSettingsMessage] = useState({ type: '', text: '' });
    const [showTrialBanner, setShowTrialBanner] = useState(true);
    const [activityPage, setActivityPage] = useState(1);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [launchAmount, setLaunchAmount] = useState<string | number>(1);
    const [isGeneratingKey, setIsGeneratingKey] = useState(false);
    const [recentKey, setRecentKey] = useState("");

    useEffect(() => {
        if (store?.defaultLaunchAmount) {
            setLaunchAmount(store.defaultLaunchAmount);
        }
    }, [store?.defaultLaunchAmount]);

    const isNameManuallyTyped = useRef(false);

    useEffect(() => {
        setActivityPage(1);
    }, [activeCustomerCPF]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const paymentStatus = params.get('payment');
        const planName = params.get('plan') as any;

        if (paymentStatus === 'success' && planName && store) {
            const updateSubscription = async () => {
                const expiryDate = Date.now() + 30 * 24 * 60 * 60 * 1000;
                const updatedStore = {
                    ...store,
                    subscription: { status: 'active' as const, plan: planName, expiryDate }
                };
                onSaveStoreMetadata(updatedStore);
                navigate('/dashboard', { replace: true });
                alert(`Pagamento confirmado! Plano ${planName} ativado.`);
            };
            updateSubscription();
        }
    }, [store?.id]);

    const handleLogout = () => { logout(); navigate('/'); };

    const onUpdateStoreLocally = (updatedStore: Store) => {
        setStores(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s));
    };

    const onSaveStoreMetadata = async (updatedStore: Store) => {
        onUpdateStoreLocally(updatedStore);
        await CloudService.addStore(updatedStore);
    };

    const isSubscriptionActive = store?.subscription?.status === 'active' || store?.subscription?.status === 'trial';
    const isTrial = store?.subscription?.status === 'trial';
    const currentPlan = isTrial ? 'Trial' : (store?.subscription?.plan || 'Basic');
    const currentLimit = limits ? limits[currentPlan] : (isTrial ? 5 : 100);

    const metrics = useMemo(() => {
        if (!store?.customers) return { totalCustomers: 0, totalRecords: 0, prizesPaid: 0, prizesPending: 0 };
        const customers = Object.values(store.customers) as CustomerData[];
        return {
            totalCustomers: customers.length,
            totalRecords: customers.reduce((acc, c) => acc + (c.history?.length || 0), 0),
            prizesPaid: customers.reduce((acc, c) => acc + (c.history?.filter(h => h.type === 'redeem').length || 0), 0),
            prizesPending: customers.reduce((acc, c) => acc + Math.floor(c.points / (store.rewardGoal || 10)), 0)
        };
    }, [store?.customers, store?.rewardGoal]);

    const isCustomerLimitReached = !store?.customers?.[activeCustomerCPF || ''] && metrics.totalCustomers >= currentLimit;
    const isRecordLimitReached = isTrial && metrics.totalRecords >= TRIAL_LIMITS.RECORDS;

    const [settingsForm, setSettingsForm] = useState({
        name: store?.name || '',
        loyaltyItem: store?.loyaltyItem || 'Ponto',
        rewardGoal: store?.rewardGoal || 10,
        logo: store?.logo || '',
        defaultLaunchAmount: store?.defaultLaunchAmount || 1
    });

    useEffect(() => {
        if (store) {
            setSettingsForm(prev => ({
                ...prev,
                name: store.name,
                loyaltyItem: store.loyaltyItem,
                rewardGoal: store.rewardGoal,
                logo: store.logo || '',
                defaultLaunchAmount: store.defaultLaunchAmount || 1
            }));
        }
    }, [store]);

    const activeCustomer = activeCustomerCPF && store?.customers ? (store.customers[activeCustomerCPF] || { points: 0, history: [] }) : null;

    useEffect(() => {
        if (activeCustomerCPF) {
            if (store?.customers?.[activeCustomerCPF]) {
                setCustomerName(store.customers[activeCustomerCPF].name || '');
                isNameManuallyTyped.current = false;
            } else {
                if (isCustomerLimitReached) setShowUpgradeModal(true);
                if (!isNameManuallyTyped.current) setCustomerName('');
            }
        } else {
            if (!isNameManuallyTyped.current) setCustomerName('');
        }
    }, [activeCustomerCPF, isCustomerLimitReached, store?.customers]);

    const handleDeleteCustomer = async (targetCpf?: string) => {
        const cpfToDelete = targetCpf || activeCustomerCPF;
        const customerToDelete = cpfToDelete && store?.customers?.[cpfToDelete];
        if (!cpfToDelete || !store || !customerToDelete) return;

        if (confirm(`Excluir ${customerToDelete.name || cpfToDelete}?`)) {
            try {
                await CloudService.deleteCustomer(store.id, cpfToDelete, customerToDelete.docId);
                const newCustomers = { ...store.customers };
                delete newCustomers[cpfToDelete];
                onUpdateStoreLocally({ ...store, customers: newCustomers });
                if (cpfToDelete === activeCustomerCPF) {
                    setActiveCustomerCPF(null);
                    setSearchCPF('');
                }
            } catch (err) {
                console.error(err);
                alert('Erro ao excluir.');
            }
        }
    };

    const handleUpdateAction = (type: 'add' | 'redeem') => {
        if (!isSubscriptionActive || !activeCustomerCPF) return;
        if (isCustomerLimitReached || isRecordLimitReached) {
            setShowUpgradeModal(true);
            return;
        }

        const isNewCustomer = !store.customers?.[activeCustomerCPF];
        if ((isNewCustomer || !customerName) && !customerName.trim()) {
            alert('Nome obrigatório.');
            return;
        }

        const goal = store.rewardGoal || 10;
        if (type === 'redeem' && activeCustomer && activeCustomer.points < goal) return;

        const amount = type === 'add' ? Number(launchAmount) : -goal;
        const currentPoints = activeCustomer ? activeCustomer.points : 0;
        const newPoints = Math.max(0, currentPoints + amount);

        const historyEntry: HistoryEntry = { id: crypto.randomUUID(), date: Date.now(), type, amount: Math.abs(amount) };

        const updatedCustomer = {
            docId: activeCustomer?.docId,
            name: customerName || activeCustomer?.name || 'Cliente',
            points: newPoints,
            history: [historyEntry, ...(activeCustomer?.history || [])]
        };

        const updatedStore = {
            ...store,
            customers: { ...store.customers, [activeCustomerCPF]: updatedCustomer }
        };

        onUpdateStoreLocally(updatedStore);
        CloudService.saveCustomer(store.id, updatedCustomer, activeCustomerCPF).catch(err => {
            console.error(err);
            alert("Erro ao salvar.");
        });
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setSettingsForm({ ...settingsForm, logo: reader.result as string });
            reader.readAsDataURL(file);
        }
    };

    const handleSaveSettings = () => {
        onSaveStoreMetadata({
            ...store,
            name: settingsForm.name,
            loyaltyItem: settingsForm.loyaltyItem,
            rewardGoal: settingsForm.rewardGoal,
            logo: settingsForm.logo,
            defaultLaunchAmount: settingsForm.defaultLaunchAmount
        });
        setSettingsMessage({ type: 'success', text: 'Atualizado!' });
        setTimeout(() => setShowSettings(false), 1000);
    };

    const handleGenerateApiKey = async () => {
        if (store.apiKey && !confirm("Gerar uma nova chave irá invalidar a anterior. Todos os caixas conectados pararão de funcionar até serem atualizados. Continuar?")) return;

        setIsGeneratingKey(true);
        try {
            const result = await CloudService.generateApiKey();
            setRecentKey(result.apiKey);
            // Force refresh store data (local update)
            onUpdateStoreLocally({ ...store, apiKey: result.apiKey, integrationEnabled: true });
            alert("Chave gerada com sucesso! Copie-a agora.");
        } catch (e) {
            console.error(e);
            alert("Erro ao gerar chave. Verifique se seu plano permite integrações.");
        } finally {
            setIsGeneratingKey(false);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(timestamp);
    };

    if (!store) return <div className="p-10 text-center">Carregando...</div>;
    const goal = store.rewardGoal || 10;

    return (
        <div className="max-w-[1700px] mx-auto p-4 md:p-6 space-y-6 font-sans">
            {/* Header */}
            <header className="bg-white p-4 lg:py-4 lg:px-6 rounded-[2rem] shadow-xl border border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 lg:gap-6 relative z-30">

                {/* Top Row (Mobile): Logo + Actions */}
                <div className="flex items-center justify-between w-full lg:w-auto">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-600 w-12 h-12 lg:w-10 lg:h-10 rounded-2xl lg:rounded-xl flex items-center justify-center overflow-hidden shrink-0 text-white shadow-lg shadow-indigo-200">
                            {store.logo ? <img src={store.logo} className="w-full h-full object-cover" /> : <ShieldCheck size={20} />}
                        </div>
                        <div className="hidden lg:block">
                            <h1 className="font-extrabold text-slate-800 text-sm uppercase tracking-tight leading-none">{store.name}</h1>
                            <p className={`text-[10px] font-bold uppercase mt-1 ${isTrial ? 'text-amber-500' : 'text-indigo-500'}`}>
                                {isTrial ? 'Versão Trial' : `Plano ${store.subscription?.plan}`}
                            </p>
                        </div>
                        {/* Mobile Name Display */}
                        <div className="lg:hidden text-left">
                            <h1 className="font-extrabold text-slate-800 text-xs uppercase tracking-tight leading-none">{store.name}</h1>
                            <p className={`text-[9px] font-bold uppercase ${isTrial ? 'text-amber-500' : 'text-indigo-500'}`}>
                                {isTrial ? 'Trial' : store.subscription?.plan}
                            </p>
                        </div>
                    </div>

                    {/* Mobile Actions */}
                    <div className="flex lg:hidden items-center gap-2">
                        <button onClick={() => setShowCustomerList(true)} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-100 transition-colors"><Users size={18} /></button>
                        <button onClick={() => setShowQRModal(true)} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-100 transition-colors"><Share2 size={18} /></button>
                        <button onClick={() => setShowSettings(true)} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-100 transition-colors"><Settings size={18} /></button>
                        <button onClick={handleLogout} className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-100 transition-colors"><LogOut size={18} /></button>
                    </div>
                </div>

                <div className="flex-1 w-full flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                    {/* Search Bar Block */}
                    <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50 rounded-2xl transition-all h-40 lg:h-16 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-4 pl-4 pr-4 w-full h-full">
                            <Search className="text-slate-400 shrink-0" size={24} />
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="CPF DO CLIENTE..."
                                value={formatCPF(searchCPF)}
                                onChange={(e) => {
                                    const numeric = e.target.value.replace(/\D/g, '');
                                    const limited = numeric.slice(0, 11);
                                    setSearchCPF(limited);
                                    if (limited.length === 11) {
                                        if (validateCPF(limited)) setActiveCustomerCPF(limited);
                                    } else {
                                        setActiveCustomerCPF(null);
                                    }
                                }}
                                className="w-full bg-transparent outline-none font-black text-slate-700 tracking-widest text-2xl placeholder:text-slate-300 text-center uppercase"
                                maxLength={14}
                            />
                        </div>
                    </div>

                    {/* Desktop Customer Name Block (Now Separate) */}
                    <div className="hidden lg:flex flex-1 items-center bg-slate-50 border border-slate-200 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50 rounded-2xl transition-all h-16 px-6 shadow-sm">
                        <Users className="text-slate-300 mr-4 shrink-0" size={20} />
                        <input
                            type="text"
                            placeholder={activeCustomerCPF && !store.customers?.[activeCustomerCPF] ? "Digite o nome..." : "Cliente não identificado"}
                            value={customerName}
                            onChange={(e) => {
                                setCustomerName(e.target.value);
                                isNameManuallyTyped.current = true;
                            }}
                            disabled={!activeCustomerCPF}
                            className="w-full bg-transparent outline-none font-bold text-slate-700 uppercase text-lg placeholder:text-slate-300/50"
                        />
                    </div>



                    {/* Usage Indicator (Desktop Only) */}
                    <div className="hidden xl:flex flex-col items-end mr-2 shrink-0 self-center">
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Uso</p>
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, (metrics.totalCustomers / currentLimit) * 100)}%` }}></div>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-rose-500"> {metrics.totalCustomers}/{currentLimit} </p>
                    </div>
                </div>

                {/* Desktop Actions */}
                <div className="hidden lg:flex items-center gap-2 w-full lg:w-auto justify-end">
                    <button onClick={() => setShowCustomerList(true)} title="Clientes" className="bg-white border border-slate-100 text-slate-600 p-3 rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all hover:scale-105 active:scale-95 shadow-sm"><Users size={18} /></button>
                    <button onClick={() => setShowQRModal(true)} title="Compartilhar" className="bg-white border border-slate-100 text-slate-600 p-3 rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all hover:scale-105 active:scale-95 shadow-sm"><Share2 size={18} /></button>
                    <button onClick={() => setShowSettings(true)} title="Configurações" className="bg-white border border-slate-100 text-slate-600 p-3 rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all hover:scale-105 active:scale-95 shadow-sm"><Settings size={18} /></button>
                    <button onClick={handleLogout} title="Sair" className="bg-rose-50 border border-rose-100 text-rose-500 p-3 rounded-xl hover:bg-rose-100 transition-all hover:scale-105 active:scale-95 shadow-sm"><LogOut size={18} /></button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* LEFT COLUMN: METRICS */}
                <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-4 mb-6 lg:mb-0">
                    <div className="bg-white p-4 lg:p-6 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 text-center hover:border-indigo-200 transition-all group">
                        <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 group-hover:text-indigo-500 transition-colors">Total de Clientes</p>
                        <p className="text-2xl lg:text-4xl font-extrabold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">{metrics.totalCustomers}</p>
                    </div>
                    <div className="bg-white p-4 lg:p-6 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 text-center hover:border-indigo-200 transition-all group">
                        <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 group-hover:text-indigo-500 transition-colors">Registros Totais</p>
                        <p className="text-2xl lg:text-4xl font-extrabold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">{metrics.totalRecords}</p>
                    </div>
                    <div className="bg-white p-4 lg:p-6 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 text-center hover:border-indigo-200 transition-all group">
                        <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 group-hover:text-indigo-500 transition-colors">Prêmios Pagos</p>
                        <p className="text-2xl lg:text-4xl font-extrabold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">{metrics.prizesPaid}</p>
                    </div>
                    <div className="bg-white p-4 lg:p-6 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 text-center hover:border-indigo-200 transition-all group">
                        <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 group-hover:text-indigo-500 transition-colors">Prêmios a Retirar</p>
                        <p className="text-2xl lg:text-4xl font-extrabold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">{metrics.prizesPending}</p>
                    </div>
                </div>

                {/* CENTER COLUMN: ACTION AREA */}
                <div className="lg:col-span-5 relative">
                    {activeCustomerCPF ? (
                        <div className="bg-white rounded-[2rem] shadow-xl shadow-indigo-100 border border-slate-100 overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-6">
                            {/* Header Bar */}
                            <div className="bg-slate-900 px-6 py-5 text-white flex items-center gap-3">
                                <Users size={18} className="text-indigo-400" />
                                <h2 className="font-bold uppercase text-sm tracking-widest text-indigo-50 line-clamp-1">
                                    {customerName || "Novo Cliente"}
                                </h2>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-5 rounded-3xl text-center border-2 border-transparent hover:border-indigo-100 transition-all">
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Saldo Atual</p>
                                        <p className="text-5xl font-black text-indigo-600 tracking-tighter leading-none">{activeCustomer ? activeCustomer.points : 0}</p>
                                    </div>
                                    <div className={`p-5 rounded-3xl text-center border-2 transition-all ${activeCustomer && activeCustomer.points >= goal ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-transparent'}`}>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${activeCustomer && activeCustomer.points >= goal ? 'text-emerald-500' : 'text-slate-400'}`}>Prêmios</p>
                                        <p className={`text-5xl font-black tracking-tighter leading-none ${activeCustomer && activeCustomer.points >= goal ? 'text-emerald-500' : 'text-slate-300'}`}>
                                            {activeCustomer ? Math.floor(activeCustomer.points / goal) : 0}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-lg shadow-slate-100/50 flex flex-col sm:flex-row items-center gap-3">
                                    <div className="relative group w-full sm:w-48 shrink-0">
                                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full z-10 shadow-md">
                                            VALOR
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={launchAmount}
                                            onChange={(e) => setLaunchAmount(e.target.value)}
                                            className="w-full h-16 bg-slate-50 rounded-2xl text-center font-black text-3xl text-indigo-900 focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleUpdateAction('add')}
                                        className="w-full sm:w-auto px-8 h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={18} className="stroke-[3px]" /> Lançar
                                    </button>
                                    <button
                                        onClick={() => { if (confirm("Confirmar resgate?")) handleUpdateAction('redeem'); }}
                                        disabled={!activeCustomer || activeCustomer.points < goal}
                                        className={`w-full sm:w-auto h-16 px-6 rounded-2xl font-bold uppercase tracking-widest text-[10px] border-2 transition-all flex items-center justify-center gap-2 ${activeCustomer && activeCustomer.points >= goal ? 'border-emerald-500 text-emerald-600 hover:bg-emerald-50' : 'border-slate-100 text-slate-300 hover:bg-slate-50'}`}
                                    >
                                        <Gift size={16} /> Resgatar
                                    </button>

                                    {/* WhatsApp Notification Button */}
                                    {activeCustomer && (activeCustomer as any).phone && (
                                        <a
                                            href={`https://wa.me/55${(activeCustomer as any).phone}?text=${encodeURIComponent(`Olá ${activeCustomer.name || 'Cliente'}, parabéns! Você completou seus pontos e tem um prêmio disponível em ${store.name}. Venha retirar!`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full sm:w-auto h-16 px-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] border-2 border-emerald-100 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                                            title="Enviar Aviso no WhatsApp"
                                        >
                                            <MessageCircle size={18} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[380px] bg-white rounded-[2rem] shadow-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-8 opacity-60">
                            <Search size={40} className="text-slate-300 mb-4" />
                            <h3 className="text-slate-400 font-bold uppercase tracking-widest text-sm">AGUARDANDO IDENTIFICAÇÃO DE CLIENTE</h3>
                            <p className="text-[10px] text-slate-300 mt-2 font-bold uppercase">DIGITE O CPF ACIMA PARA COMEÇAR</p>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: ACTIVITY */}
                <div className="lg:col-span-4 h-full mt-6 lg:mt-0">
                    <div className="bg-white rounded-[2rem] shadow-xl shadow-indigo-50 border border-slate-100 flex flex-col h-auto overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
                            <h3 className="font-bold uppercase text-xs tracking-widest text-indigo-900 flex items-center gap-2">
                                <Clock size={16} className="text-indigo-500 mb-0.5" /> Atividade
                            </h3>
                            <div className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {activeCustomer?.history?.length || 0}
                            </div>
                        </div>

                        <div className="p-4 space-y-1 relative">
                            {activeCustomer && activeCustomer.history?.length > 0 ? (
                                activeCustomer.history
                                    .slice((activityPage - 1) * 15, activityPage * 15)
                                    .map((entry) => (
                                        <div key={entry.id} className="flex items-center gap-3 group p-1.5 hover:bg-slate-50 rounded-xl transition-colors">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm border ${entry.type === 'add' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-emerald-50 border-emerald-100 text-emerald-500'}`}>
                                                {entry.type === 'add' ? <Plus size={14} className="stroke-[3px]" /> : <Gift size={14} className="stroke-[3px]" />}
                                            </div>
                                            <div className="flex-1">
                                                {entry.type === 'redeem' && (
                                                    <p className="text-[10px] font-bold uppercase leading-tight text-emerald-700">
                                                        Resgate Efetuado
                                                    </p>
                                                )}
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{formatDate(entry.date)}</p>
                                            </div>
                                            <div className={`text-sm font-black ${entry.type === 'add' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                                                {entry.type === 'add' ? `+${entry.amount}` : 'OK'}
                                            </div>
                                        </div>
                                    ))
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                                    <Clock size={32} className="mb-3 opacity-20" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">Sem movimentação</p>
                                </div>
                            )}
                        </div>
                        {activeCustomer && activeCustomer.history?.length > 15 && (
                            <div className="p-3 border-t border-slate-50 flex items-center justify-between bg-slate-50/50 text-xs font-bold text-slate-500 shrink-0">
                                <button onClick={() => setActivityPage(p => Math.max(1, p - 1))} disabled={activityPage === 1} className="p-2 hover:bg-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ChevronLeft size={16} /></button>
                                <span>Página {activityPage} de {Math.ceil(activeCustomer.history.length / 15)}</span>
                                <button onClick={() => setActivityPage(p => Math.min(Math.ceil(activeCustomer.history.length / 15), p + 1))} disabled={activityPage === Math.ceil(activeCustomer.history.length / 15)} className="p-2 hover:bg-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ChevronRight size={16} /></button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Bar for Trial */}
            {isTrial && showTrialBanner && (
                <div className="fixed bottom-0 left-0 right-0 bg-[#1a1033] text-white p-4 z-40 flex flex-col sm:flex-row items-center justify-between px-6 lg:px-20 border-t border-white/5 shadow-2xl rounded-t-[2rem]">
                    <div className="flex items-center gap-4 mb-3 sm:mb-0 w-full sm:w-auto">
                        <div className="bg-amber-400 p-2 rounded-xl text-slate-900 animate-pulse shrink-0">
                            <Zap size={18} className="fill-slate-900" />
                        </div>
                        <div>
                            <p className="font-black text-[11px] uppercase tracking-widest text-white leading-tight">Atenção: Versão de Demonstração (Trial)</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{metrics.totalCustomers}/{currentLimit} Clientes Cadastrados</p>
                        </div>
                    </div>
                    <button onClick={() => setShowUpgradeModal(true)} className="w-full sm:w-auto bg-white text-indigo-900 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all shadow-lg active:scale-95">
                        Ativar Plano Profissional
                    </button>
                    <button onClick={() => setShowTrialBanner(false)} className="absolute top-4 right-4 sm:static sm:ml-4 p-2 text-white/30 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Fechar aviso">
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Modals... (CustomerList, Settings, Upgrade, QR - keep as is) */}
            {showCustomerList && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                    {/* ... same implementation ... */}
                    <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-8 bg-indigo-600 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <Users size={22} />
                                <h2 className="font-black uppercase text-xs tracking-widest">Meus Clientes</h2>
                            </div>
                            <button onClick={() => setShowCustomerList(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input type="text" placeholder="Buscar..." value={customerListSearch} onChange={(e) => setCustomerListSearch(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-sm text-slate-700 shadow-sm focus:border-indigo-500 transition-colors" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-2">
                            {store && store.customers && Object.entries(store.customers)
                                .filter(([cpf, cust]) => {
                                    if (!customerListSearch) return true;
                                    const term = customerListSearch.toLowerCase();
                                    return cpf.includes(term) || (cust.name && cust.name.toLowerCase().includes(term));
                                })
                                .map(([cpf, cust]) => (
                                    <div key={cpf} className="flex items-center justify-between py-3 px-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-lg transition-all cursor-pointer group" onClick={() => { setShowCustomerList(false); setActiveCustomerCPF(cpf); setSearchCPF(cpf); }}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">{cust.name ? cust.name.charAt(0).toUpperCase() : <Users size={16} />}</div>
                                            <div><p className="font-black text-slate-800 text-sm uppercase">{cust.name || 'SEM NOME'}</p><p className="font-mono text-slate-400 text-xs">{formatCPF(cpf)}</p></div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="px-4 py-2 bg-slate-50 rounded-xl font-black text-indigo-600 text-sm">{cust.points} PTS</div>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(cpf); }} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}

            {showSettings && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
                        <div className="p-8 bg-indigo-600 text-white flex justify-between items-center sticky top-0 z-20">
                            <div className="flex items-center gap-3"><Settings size={22} /><h2 className="font-black uppercase text-xs tracking-widest">Configurações</h2></div>
                            <button onClick={() => setShowSettings(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="space-y-4">
                                <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Nome</label><input type="text" value={settingsForm.name} onChange={e => setSettingsForm({ ...settingsForm, name: e.target.value })} className="w-full p-3 bg-slate-50 border-2 rounded-2xl outline-none font-bold text-sm" /></div>
                                <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Item</label><input type="text" value={settingsForm.loyaltyItem} onChange={e => setSettingsForm({ ...settingsForm, loyaltyItem: e.target.value })} className="w-full p-3 bg-slate-50 border-2 rounded-2xl outline-none font-bold text-sm" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Qtd Padrão</label><input type="number" value={settingsForm.defaultLaunchAmount} onChange={e => setSettingsForm({ ...settingsForm, defaultLaunchAmount: parseInt(e.target.value) || 1 })} className="w-full p-3 bg-slate-50 border-2 rounded-2xl outline-none font-bold text-sm" /></div>
                                    <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Meta</label><input type="number" value={settingsForm.rewardGoal} onChange={e => setSettingsForm({ ...settingsForm, rewardGoal: parseInt(e.target.value) || 1 })} className="w-full p-3 bg-slate-50 border-2 rounded-2xl outline-none font-bold text-sm" /></div>
                                </div>
                                <div className="flex flex-col items-center"><label className="block text-[10px] font-black uppercase text-slate-400 mb-4">Logo</label>
                                    <div className="w-24 h-24 rounded-[1.5rem] bg-slate-50 border-2 border-dashed flex items-center justify-center overflow-hidden relative" onClick={() => fileInputRef.current?.click()}>
                                        {settingsForm.logo ? <img src={settingsForm.logo} className="w-full h-full object-cover" /> : <Upload size={24} className="text-slate-300" />}
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                                </div>
                            </div>

                            {/* Integration Section */}
                            <div className="pt-6 border-t border-slate-100">
                                <h3 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
                                    <Key size={14} /> Integração Automática (API)
                                </h3>

                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                    <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                                        Conecte seu sistema de caixa (PDV) para pontuar automaticamente.
                                        <br />
                                        {/* TODO: Add Manual Link */}
                                        <a onClick={() => window.open('/manual', '_blank')} className="cursor-pointer text-indigo-600 font-bold hover:underline flex items-center gap-1 mt-1">
                                            <FileText size={10} /> Ver Manual de Integração
                                        </a>
                                    </p>

                                    {store.apiKey || recentKey ? (
                                        <div className="bg-white p-3 rounded-xl border border-dashed border-indigo-200 flex items-center justify-between gap-2 shadow-sm mb-3">
                                            <code className="text-[10px] font-mono font-bold text-slate-600 break-all">
                                                {recentKey || store.apiKey}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(recentKey || store.apiKey || '');
                                                    alert("Copiado!");
                                                }}
                                                className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Copiar Chave"
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-2">
                                            <p className="text-[10px] text-slate-400 italic mb-2">Nenhuma chave gerada.</p>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleGenerateApiKey}
                                        disabled={isGeneratingKey}
                                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isGeneratingKey ? <Clock size={14} className="animate-spin" /> : <Key size={14} />}
                                        {isGeneratingKey ? "Gerando..." : (store.apiKey ? "Gerar Nova Chave" : "Gerar Chave de Acesso")}
                                    </button>
                                </div>
                            </div>
                            {settingsMessage.text && (
                                <p className={`text-[10px] font-black text-center uppercase tracking-widest p-3 rounded-xl ${settingsMessage.type === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                    {settingsMessage.text}
                                </p>
                            )}
                            <button onClick={handleSaveSettings} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {effectivePricing && effectiveLimits && (
                <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} currentPlan={currentPlan} pricing={effectivePricing} limits={effectiveLimits} storeId={store.id} />
            )}
            <QRCodeModal isOpen={showQRModal} onClose={() => setShowQRModal(false)} url={`${window.location.origin}/customer`} storeName={store.name} />
        </div>
    );
};

export default Dashboard;
