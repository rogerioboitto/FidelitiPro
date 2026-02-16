
import React, { useState } from 'react';
import { X, Check, Zap, Rocket, Building2, CreditCard, Loader2 } from 'lucide-react';
import type { SubscriptionPlan, PlanPricing, PlanLimits } from '../types';
import { PaymentService } from '../services/payment';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPlan: SubscriptionPlan;
    pricing: PlanPricing;
    limits: PlanLimits;
    storeId: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, currentPlan, pricing, limits, storeId }) => {
    const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | null>(null);

    const handleUpgrade = async (plan: SubscriptionPlan) => {
        setLoadingPlan(plan);
        try {
            const price = pricing[plan];
            const preferenceId = await PaymentService.createPreference(storeId, plan, price);
            PaymentService.openCheckout(preferenceId);
        } catch (error) {
            alert("Erro ao iniciar o pagamento. Tente novamente.");
        } finally {
            setLoadingPlan(null);
        }
    };

    if (!isOpen) return null;

    const plans: { id: SubscriptionPlan, icon: any, color: string, features: string[] }[] = [
        {
            id: 'Basic',
            icon: Zap,
            color: 'text-blue-500',
            features: [`Até ${limits.Basic} clientes`, 'Histórico simplificado', 'Suporte por e-mail']
        },
        {
            id: 'Pro',
            icon: Rocket,
            color: 'text-indigo-600',
            features: [`Até ${limits.Pro} clientes`, 'Histórico detalhado', 'Logo personalizada', 'Suporte prioritário']
        },
        {
            id: 'Enterprise',
            icon: Building2,
            color: 'text-slate-900',
            features: ['Clientes ilimitados', 'Múltiplos operadores', 'API de integração', 'Gerente de contas']
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white/80 w-full max-w-5xl rounded-[3rem] shadow-2xl border border-white/50 backdrop-blur-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 flex justify-between items-center border-b border-indigo-50 bg-white/50">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Upgrade FidelitiPro</h2>
                        <p className="text-slate-400 font-bold text-[11px] uppercase tracking-widest mt-1">Sua base cresceu? Hora de dar o próximo passo.</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col ${currentPlan === plan.id
                                ? 'border-indigo-600 bg-indigo-50/30'
                                : 'border-slate-100 bg-white/50 hover:border-indigo-200 hover:shadow-xl'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 ${plan.color}`}>
                                <plan.icon size={26} />
                            </div>

                            <h3 className="font-black text-xl text-slate-800 uppercase tracking-tighter mb-1">{plan.id}</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-3xl font-black text-slate-800">R$ {pricing[plan.id].toFixed(2)}</span>
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">/mês</span>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                                        <div className="p-0.5 bg-indigo-100 text-indigo-600 rounded-lg">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleUpgrade(plan.id)}
                                className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${currentPlan === plan.id || (loadingPlan && loadingPlan !== plan.id)
                                    ? 'bg-slate-100 text-slate-400 cursor-default'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95'
                                    }`}
                                disabled={currentPlan === plan.id || !!loadingPlan}
                            >
                                {loadingPlan === plan.id ? (
                                    <Loader2 className="animate-spin" size={14} />
                                ) : (
                                    <CreditCard size={14} />
                                )}
                                {currentPlan === plan.id ? 'Seu Plano Atual' : loadingPlan === plan.id ? 'Processando...' : 'Contratar Agora'}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="p-8 bg-slate-900 text-center text-white/50 text-[11px] font-black uppercase tracking-[0.3em]">
                    FidelitiPro • Pagamento 100% Seguro via Google Cloud
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
