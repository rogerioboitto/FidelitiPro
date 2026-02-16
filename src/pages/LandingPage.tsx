import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Zap, Check, ArrowRight, ShieldCheck,
    Smartphone, Store,
    Menu, X, Download, MessageCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePWA } from '../contexts/PWAContext';
import { CloudService } from '../services/api';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { isInstallable, install } = usePWA();
    const { pricing, limits } = useAuth();
    const [scrolled, setScrolled] = React.useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    const [geoData, setGeoData] = React.useState<{ ip: string; location: string } | null>(null);

    React.useEffect(() => {
        const fetchGeo = async () => {
            try {
                const res = await fetch('https://ipapi.co/json/');
                const data = await res.json();
                const info = { ip: data.ip, location: `${data.city}, ${data.region_code}, ${data.country_code}` };
                setGeoData(info);
                // Initial track
                CloudService.trackPlatformActivity('landing', 0);
            } catch (e) {
                CloudService.trackPlatformActivity('landing', 0);
            }
        };

        const startTime = Date.now();
        fetchGeo();

        return () => {
            const duration = Math.floor((Date.now() - startTime) / 1000);
            if (duration > 0) {
                // Use a ref-like approach or just the current state if possible, 
                // but since state updates might not be ready for the cleanup, 
                // we'll try to use what we have or a global var.
                // For simplicity in this session-based tracking, let's just pass it if we have it.
                CloudService.trackPlatformActivity('landing', duration, (window as any).trackedIp, (window as any).trackedLoc);
            }
        };
    }, []);

    // Helper to store geo data globally for cleanup access
    React.useEffect(() => {
        if (geoData) {
            (window as any).trackedIp = geoData.ip;
            (window as any).trackedLoc = geoData.location;
        }
    }, [geoData]);

    React.useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    React.useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [mobileMenuOpen]);

    const features = [
        {
            icon: <Zap className="text-indigo-600" size={24} />,
            title: "Velocidade Extrema",
            desc: "Lance pontos em menos de 1 segundo. Sem filas, sem cadastro demorado."
        },
        {
            icon: <Smartphone className="text-indigo-600" size={24} />,
            title: "Sem Baixar App",
            desc: "Seu cliente consulta saldo e prêmios direto no navegador. Zero barreira de entrada.",
            onClick: () => navigate('/customer'),
            className: "cursor-pointer hover:border-indigo-200 hover:shadow-2xl hover:-translate-y-1 active:scale-95 active:bg-indigo-50"
        },
        {
            icon: <MessageCircle className="text-indigo-600" size={24} />,
            title: "Avisos Automáticos",
            desc: "O sistema avisa seu cliente via E-mail e WhatsApp quando ele ganha prêmios."
        },
        {
            icon: <ShieldCheck className="text-indigo-600" size={24} />,
            title: "Gestão Simples",
            desc: "Painel completo para você acompanhar quem são seus melhores clientes."
        }
    ];

    const planNames = ['Basic', 'Pro', 'Enterprise'];

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
            {/* Header */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-lg shadow-sm py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-600 p-2 rounded-xl text-white">
                            <ShieldCheck size={24} />
                        </div>
                        <span className="font-black text-xl tracking-tighter uppercase">Fideliti<span className="text-indigo-600">Pro</span></span>
                    </div>

                    <nav className="hidden md:flex items-center gap-8 text-sm font-black uppercase tracking-widest text-slate-600">
                        <a href="#features" className="hover:text-indigo-600 transition-colors">Recursos</a>
                        <a href="#pricing" className="hover:text-indigo-600 transition-colors">Preços</a>
                        <div className="relative group/nav">
                            <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                                Acesso <ArrowRight size={14} className="group-hover/nav:rotate-90 transition-transform duration-300" />
                            </button>

                            {/* Header Dropdown */}
                            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all duration-300 translate-y-2 group-hover/nav:translate-y-0 z-[100]">
                                <button onClick={() => navigate('/login')} className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 group/item">
                                    <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all">
                                        <Store size={14} />
                                    </div>
                                    <span className="font-black text-[10px] uppercase tracking-widest text-slate-600">Lojista</span>
                                </button>
                                <button onClick={() => navigate('/customer')} className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 group/item">
                                    <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all">
                                        <Smartphone size={14} />
                                    </div>
                                    <span className="font-black text-[10px] uppercase tracking-widest text-slate-600">Cliente</span>
                                </button>
                            </div>
                        </div>
                    </nav>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center gap-4">
                        {isInstallable && (
                            <button
                                onClick={install}
                                className="hidden md:flex bg-slate-900 text-white px-4 py-3 rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 items-center gap-2"
                            >
                                <Download size={16} />
                                <span className="font-black text-[10px] uppercase tracking-widest">Baixar App</span>
                            </button>
                        )}

                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-slate-900 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all z-50 relative"
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 top-[76px] bg-white z-40 p-6 flex flex-col h-screen animate-in slide-in-from-top duration-300">
                        <div className="flex flex-col gap-4 flex-1">
                            <button
                                onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                                className="w-full p-6 text-left bg-slate-50 rounded-[2rem] flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <Store size={24} />
                                    </div>
                                    <span className="font-black uppercase tracking-widest text-slate-600">Acesso Lojista</span>
                                </div>
                                <ArrowRight size={20} className="text-slate-300" />
                            </button>
                            <button
                                onClick={() => { navigate('/customer'); setMobileMenuOpen(false); }}
                                className="w-full p-6 text-left bg-slate-50 rounded-[2rem] flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <Smartphone size={24} />
                                    </div>
                                    <span className="font-black uppercase tracking-widest text-slate-600">Consultar Pontos</span>
                                </div>
                                <ArrowRight size={20} className="text-slate-300" />
                            </button>
                            {isInstallable && (
                                <button
                                    onClick={() => { install(); setMobileMenuOpen(false); }}
                                    className="w-full p-6 text-left bg-slate-900 text-white rounded-[2rem] flex items-center justify-between group mt-4 shadow-xl"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white/10 p-3 rounded-xl">
                                            <Download size={24} />
                                        </div>
                                        <span className="font-black uppercase tracking-widest">Baixar App</span>
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* Bottom Footer or Padding to prevent see-through */}
                        <div className="pb-24">
                            <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">FidelitiPro 2024</p>
                        </div>
                    </div>
                )}
            </header>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 relative z-10">
                    <div className="flex-1 text-center lg:text-left space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
                        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em]">
                            <Zap size={14} className="animate-pulse" /> Plataforma de Fidelização #1
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tighter">
                            Transforme <span className="text-indigo-600">Clientes</span> em Fãs Apaixonados.
                        </h1>

                        <p className="text-lg lg:text-xl text-slate-500 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                            Aumente o faturamento da sua loja criando um programa de fidelidade moderno, rápido e 100% digital. Sem cartões de papel, sem burocracia.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                            <div className="relative group/hero w-full sm:w-auto hidden sm:block">
                                <button
                                    className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    Acessar Agora <ArrowRight className="group-hover/hero:rotate-90 transition-transform duration-300" size={18} />
                                </button>

                                {/* Hero Dropdown */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-56 bg-white rounded-3xl shadow-2xl border border-slate-100 py-3 opacity-0 invisible group-hover/hero:opacity-100 group-hover/hero:visible transition-all duration-300 translate-y-4 group-hover/hero:translate-y-0 z-[100]">
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="w-full px-8 py-5 text-left text-sm font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all flex items-center gap-4"
                                    >
                                        <Store className="text-indigo-600" size={20} />
                                        Lojista
                                    </button>
                                    <div className="h-px bg-slate-100 mx-6" />
                                    <button
                                        onClick={() => navigate('/customer')}
                                        className="w-full px-8 py-5 text-left text-sm font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all flex items-center gap-4"
                                    >
                                        <Smartphone className="text-indigo-600" size={20} />
                                        Cliente
                                    </button>
                                </div>
                            </div>
                            <a href="#pricing" className="w-full sm:w-auto px-10 py-5 bg-white text-slate-900 border-2 border-slate-100 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:border-indigo-100 transition-all flex items-center justify-center gap-3">
                                Ver Planos
                            </a>
                        </div>
                    </div>

                    <div className="flex-1 relative animate-in fade-in zoom-in-95 duration-1000 delay-300">
                        <div className="relative z-10 w-full max-w-[600px] mx-auto scale-110 lg:translate-x-12">
                            <img
                                src="/mockup.png"
                                alt="FidelitiPro Dashboard"
                                className="w-full h-auto drop-shadow-[0_35px_35px_rgba(79,70,229,0.2)] rounded-[3rem]"
                            />
                        </div>
                        {/* Decorative blobs */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-indigo-100 rounded-full blur-[100px] opacity-40 -z-10"></div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tighter uppercase">Tecnologia que impulsiona</h2>
                        <p className="text-slate-500 font-bold uppercase text-sm tracking-widest">Sua empresa merece o melhor em gestão de fidelidade</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((f, i) => (
                            <div
                                key={i}
                                onClick={f.onClick as any}
                                className={`p-8 bg-slate-50 rounded-[2.5rem] border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-xl transition-all group ${f.className || ''}`}
                            >
                                <div className="bg-white group-hover:bg-indigo-600 group-hover:text-white p-4 w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center mb-6 transition-all duration-300">
                                    {f.icon}
                                </div>
                                <h3 className="font-black text-lg mb-3 uppercase tracking-tight">{f.title}</h3>
                                <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <div className="mb-16 space-y-4 text-center">
                        <h2 className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tighter uppercase">Nossos Planos</h2>
                        <p className="text-slate-500 font-bold uppercase text-sm tracking-widest">Escolha o plano ideal para o seu momento</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {planNames.map((plan) => (
                            <div key={plan} className={`p-10 rounded-[3rem] text-center transition-all bg-white border ${plan === 'Pro' ? 'scale-105 border-indigo-500 shadow-2xl shadow-indigo-100 ring-4 ring-indigo-50 relative' : 'border-slate-100 shadow-xl'}`}>
                                {plan === 'Pro' && (
                                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Mais Popular</span>
                                )}
                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">{plan}</h3>
                                <div className="flex items-baseline justify-center gap-1 mb-8">
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">R$</span>
                                    <span className="text-5xl font-black text-slate-900">{pricing ? pricing[plan as keyof typeof pricing].toFixed(2).split('.')[0] : '00'}</span>
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">,{pricing ? pricing[plan as keyof typeof pricing].toFixed(2).split('.')[1] : '00'}/mês</span>
                                </div>

                                <ul className="space-y-4 mb-10 text-left">
                                    <li className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                                        <Check size={18} className="text-emerald-500 shrink-0" /> Até {limits ? limits[plan as keyof typeof limits] : '0'} clientes
                                    </li>
                                    <li className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                                        <Check size={18} className="text-emerald-500 shrink-0" /> Registros Ilimitados
                                    </li>
                                    <li className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                                        <Check size={18} className="text-emerald-500 shrink-0" /> Portal do Cliente
                                    </li>
                                </ul>

                                <button
                                    onClick={() => navigate('/login')}
                                    className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${plan === 'Pro' ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg active:scale-95' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 active:scale-95'}`}
                                >
                                    Começar Grátis
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-white py-20">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-600 p-2 rounded-xl text-white">
                                <ShieldCheck size={24} />
                            </div>
                            <span className="font-black text-xl tracking-tighter uppercase">Fideliti<span className="text-indigo-400">Pro</span></span>
                        </div>
                        <p className="text-white/40 font-medium leading-relaxed">
                            A plataforma de fidelização feita para pequenos e médios lojistas que buscam o próximo nível.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-black uppercase text-xs tracking-widest mb-6">Plataforma</h4>
                        <ul className="space-y-4 text-white/50 font-bold text-sm uppercase tracking-widest">
                            <li><a href="#features" className="hover:text-indigo-400 transition-colors">Recursos</a></li>
                            <li><a href="#pricing" className="hover:text-indigo-400 transition-colors">Preços</a></li>
                            <li><a href="/login" className="hover:text-indigo-400 transition-colors">Acesso Lojista</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-black uppercase text-xs tracking-widest mb-6">Suporte</h4>
                        <ul className="space-y-4 text-white/50 font-bold text-sm uppercase tracking-widest">
                            <li><a href="/manual" className="hover:text-indigo-400 transition-colors">Dúvidas</a></li>
                            <li><a href="mailto:suporte@fidelitipro.com.br" className="hover:text-indigo-400 transition-colors">Contato</a></li>
                            <li><a href="/manual" className="hover:text-indigo-400 transition-colors">Documentação</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-black uppercase text-xs tracking-widest mb-6">Legal</h4>
                        <ul className="space-y-4 text-white/50 font-bold text-sm uppercase tracking-widest">
                            <li><a href="/privacy" className="hover:text-indigo-400 transition-colors">Privacidade</a></li>
                            <li><a href="/terms" className="hover:text-indigo-400 transition-colors">Termos</a></li>
                        </ul>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 pt-16 mt-16 border-t border-white/5 text-center text-white/20 text-[10px] font-black uppercase tracking-[0.4em]">
                    © {new Date().getFullYear()} FidelitiPro • Todos os Direitos Reservados • Powered by Google Cloud
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
