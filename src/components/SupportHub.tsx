import React, { useState } from 'react';
import { MessageCircle, BookOpen, Activity, X, ArrowUpRight } from 'lucide-react';

const SupportHub: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleHub = () => setIsOpen(!isOpen);

    return (
        <div className="fixed bottom-8 right-8 z-[100] font-sans">
            {/* Hub Content */}
            <div className={`absolute bottom-20 right-0 w-72 bg-slate-950 text-white border-2 border-slate-800 transition-all duration-500 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Concierge Hub</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 animate-pulse rounded-full"></div>
                            <span className="text-[10px] font-black uppercase text-emerald-500">Online</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <a
                            href="https://wa.me/5511978526977"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block p-4 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <MessageCircle size={18} className="text-emerald-500" />
                                <ArrowUpRight size={14} className="text-slate-700 group-hover:text-emerald-500 transition-colors" />
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest mb-1">WhatsApp Direto</p>
                            <p className="text-[10px] text-slate-500 font-bold">Fale com um especialista agora</p>
                        </a>

                        <a
                            href="/manual"
                            className="group block p-4 bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <BookOpen size={18} className="text-amber-500" />
                                <ArrowUpRight size={14} className="text-slate-700 group-hover:text-amber-500 transition-colors" />
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest mb-1">Documentação</p>
                            <p className="text-[10px] text-slate-500 font-bold">Guia de integração rápida</p>
                        </a>

                        <div className="p-4 bg-slate-900/50 border border-slate-800/50">
                            <div className="flex items-center gap-3 mb-2">
                                <Activity size={16} className="text-indigo-400" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Status do Sistema</p>
                            </div>
                            <div className="h-1 bg-slate-800 overflow-hidden">
                                <div className="h-full bg-indigo-500 w-[99%] animate-[shimmer_2s_infinite]"></div>
                            </div>
                            <p className="text-[9px] text-slate-500 font-bold mt-2">Operação Normal (99.9%)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Toggle Button */}
            <button
                onClick={toggleHub}
                className={`w-14 h-14 flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-90 ${isOpen ? 'bg-slate-950 border-2 border-slate-800 text-white' : 'bg-slate-900 text-white hover:bg-black border-2 border-transparent'}`}
                aria-label="Toggle Support Hub"
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
            </button>

            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};

export default SupportHub;
