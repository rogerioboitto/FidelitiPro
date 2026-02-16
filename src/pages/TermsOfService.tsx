import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsOfService: React.FC = () => {
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
                            <FileText size={24} className="text-white" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Termos de Uso</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 -mt-8 relative z-20 space-y-8">
                <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl border border-slate-100 space-y-6 text-slate-600 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">1. Aceitação dos Termos</h2>
                        <p>Ao utilizar o FidelitiPro, você concorda com estes termos. O serviço é destinado a lojistas que desejam gerenciar programas de pontos.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">2. Responsabilidade do Lojista</h2>
                        <p>O lojista é responsável por garantir que o lançamento de pontos seja feito de forma justa e honesta para seus clientes.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">3. Disponibilidade do Serviço</h2>
                        <p>Trabalhamos para manter o sistema online 24/7, porém manutenções programadas podem ocorrer para garantir a estabilidade da plataforma.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">4. Alterações nos Planos</h2>
                        <p>O FidelitiPro reserva-se o direito de ajustar valores e limites dos planos, comunicando os usuários com antecedência mínima de 30 dias.</p>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default TermsOfService;
