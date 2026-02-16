import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            <header className="bg-slate-900 text-white py-12 px-6 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="max-w-3xl mx-auto relative z-10">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest mb-8"
                    >
                        <ArrowLeft size={16} /> Voltar
                    </button>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-indigo-500 p-2 rounded-lg">
                            <ShieldCheck size={24} className="text-white" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Política de Privacidade</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 -mt-8 relative z-20 space-y-8">
                <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl border border-slate-100 space-y-6 text-slate-600 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">1. Coleta de Dados</h2>
                        <p>O FidelitiPro coleta informações básicas para o funcionamento do programa de fidelidade, como nome, CPF e e-mail dos clientes finais, conforme fornecido pelos lojistas.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">2. Uso das Informações</h2>
                        <p>Os dados são utilizados exclusivamente para gerenciar os pontos de fidelidade, enviar notificações de prêmios e permitir que o lojista identifique seus melhores clientes.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">3. Segurança</h2>
                        <p>Utilizamos tecnologias de ponta (Google Cloud e Firebase) para garantir que os dados dos seus clientes estejam protegidos contra acessos não autorizados.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">4. Seus Direitos</h2>
                        <p>A qualquer momento, o usuário pode solicitar a exclusão de seus dados da nossa plataforma entrando em contato com o suporte oficial.</p>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default PrivacyPolicy;
