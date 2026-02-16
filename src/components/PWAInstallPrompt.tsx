import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share } from 'lucide-react';
import { usePWA } from '../contexts/PWAContext';

const PWAInstallPrompt: React.FC = () => {
    const { isInstallable, isIOS, install } = usePWA();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Permanent flag to check if already installed/accepted
        const isAlreadyInstalled = localStorage.getItem('pwa-installed') === 'true';
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

        if (isAlreadyInstalled || isStandalone) return;

        // Check dismissal logic
        const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
        const now = Date.now();
        const shouldShow = !lastDismissed || now - parseInt(lastDismissed) > 24 * 60 * 60 * 1000;

        if (shouldShow) {
            if (isInstallable) {
                setIsVisible(true);
            } else if (isIOS) {
                // Delay for iOS
                const timer = setTimeout(() => setIsVisible(true), 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [isInstallable, isIOS]);

    const handleInstall = async () => {
        await install();
        setIsVisible(false);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-6 right-6 z-[100] animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 blur-3xl -z-10 rounded-full" />

                <div className="bg-indigo-600 p-4 rounded-2xl shrink-0 shadow-lg shadow-indigo-500/20">
                    <Smartphone size={24} className="text-white" />
                </div>

                <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-black text-sm uppercase tracking-widest mb-1">Instalar FidelitiPro</h3>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                        {isIOS
                            ? 'Toque em Compartilhar e depois em "Adicionar à Tela de Início" para uma melhor experiência.'
                            : 'Adicione este aplicativo à sua tela de início para acesso rápido e fácil.'}
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {isIOS ? (
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                            <Share size={16} className="text-indigo-400" /> Tutorial iOS
                        </div>
                    ) : (
                        <button
                            onClick={handleInstall}
                            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                        >
                            <Download size={16} /> Instalar agora
                        </button>
                    )}

                    <button
                        onClick={handleDismiss}
                        className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
