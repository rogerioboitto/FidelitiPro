import React from 'react';
import { ArrowLeft, Key, Terminal, CheckCircle, AlertTriangle, Copy, ShieldCheck, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const IntegrationManual: React.FC = () => {
    const navigate = useNavigate();

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copiado!');
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Header */}
            <header className="bg-slate-900 text-white py-12 px-6 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden print:rounded-none print:shadow-none print:py-4">
                <div className="absolute top-0 right-0 p-12 opacity-5 print:hidden">
                    <Terminal size={200} />
                </div>
                <div className="max-w-3xl mx-auto relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest print:hidden"
                        >
                            <ArrowLeft size={16} /> Voltar
                        </button>
                        <div className="flex gap-2 print:hidden">
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors text-xs font-black uppercase shadow-lg hover:shadow-indigo-500/25 transition-all"
                            >
                                <Printer size={16} /> Salvar PDF
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-indigo-500 p-2 rounded-lg print:hidden">
                            <Key size={24} className="text-white" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white print:text-slate-900">Manual de Integração</h1>
                    </div>
                    <p className="text-slate-400 text-lg max-w-xl leading-relaxed print:text-slate-600">
                        Documentação técnica para conectar seu sistema de caixa (PDV/ERP) ao FidelitiPro.
                    </p>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 -mt-8 relative z-20 space-y-8">

                {/* Introduction Card */}
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
                    <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                        <ShieldCheck className="text-indigo-600" size={24} />
                        Objetivo
                    </h2>
                    <p className="text-slate-600 leading-relaxed font-medium">
                        Esta API permite que seu sistema de vendas lance pontos automaticamente para o cliente assim que uma compra for finalizada.
                        Isso elimina filas e garante fidelização instantânea.
                    </p>
                </div>

                {/* Step 1: Credentials */}
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-slate-100 text-slate-300 font-black text-[8rem] leading-none -mr-4 -mt-4 opacity-20 pointer-events-none">1</div>
                    <h2 className="text-xl font-black mb-6 relative z-10">Credenciais de Acesso</h2>
                    <div className="space-y-4 relative z-10">
                        <p className="text-slate-600 font-medium">
                            O primeiro passo é obter a <strong>Chave de API</strong> (API Key) única da loja.
                        </p>
                        <ul className="space-y-2 bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <li className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                                <CheckCircle size={16} className="text-emerald-500" /> Acesse o Painel FidelitiPro
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                                <CheckCircle size={16} className="text-emerald-500" /> Vá em Configurações {'>'} Integração
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                                <CheckCircle size={16} className="text-emerald-500" /> Clique em "Gerar Chave de Acesso"
                            </li>
                        </ul>
                        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-sm font-bold">
                            <AlertTriangle size={20} className="shrink-0" />
                            <p>Esta chave é secreta (tipo `fp_live_...`). Nunca a compartilhe publicamente. Armazene-a no banco de dados do seu PDV.</p>
                        </div>
                    </div>
                </div>

                {/* Step 2: Request */}
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-slate-100 text-slate-300 font-black text-[8rem] leading-none -mr-4 -mt-4 opacity-20 pointer-events-none">2</div>
                    <h2 className="text-xl font-black mb-6 relative z-10">Fazendo a Requisição</h2>

                    <div className="space-y-6 relative z-10">
                        <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-100 px-2 py-1 rounded-md">Endpoint (POST)</span>
                            <div className="mt-2 bg-slate-900 text-indigo-300 font-mono text-sm p-4 rounded-xl break-all">
                                https://us-central1-fidelitipro.cloudfunctions.net/addPoints
                            </div>
                        </div>

                        <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-100 px-2 py-1 rounded-md">Corpo do JSON</span>
                            <div className="mt-2 bg-slate-900 text-slate-300 font-mono text-xs sm:text-sm p-6 rounded-xl relative group">
                                <button onClick={() => copyToClipboard(`{
  "apiKey": "fp_live_SUA_CHAVE_AQUI",
  "cpf": "123.456.789-00",
  "value": 150.00,
  "name": "Nome do Cliente (Opcional)"
}`)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Copy size={16} />
                                </button>
                                <pre>{`{
  "apiKey": "fp_live_SUA_CHAVE_AQUI",
  "cpf": "123.456.789-00",
  "value": 150.00,
  "name": "Nome do Cliente (Opcional)"
}`}</pre>
                            </div>
                            <p className="mt-2 text-xs text-slate-500 font-medium">
                                * O campo <code>name</code> é opcional. Se enviado, o sistema cadastra o cliente automaticamente caso ele não exista.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Step 3: Responses */}
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-slate-100 text-slate-300 font-black text-[8rem] leading-none -mr-4 -mt-4 opacity-20 pointer-events-none">3</div>
                    <h2 className="text-xl font-black mb-6 relative z-10">Respostas da API</h2>

                    <div className="space-y-3 relative z-10 text-sm">
                        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <span className="font-black text-emerald-700">200 OK</span>
                            <span className="font-medium text-emerald-900">Sucesso! Pontos lançados.</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-xl">
                            <span className="font-black text-amber-700">401 Unauthorized</span>
                            <span className="font-medium text-amber-900">Chave de API inválida.</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-xl">
                            <span className="font-black text-rose-700">403 Forbidden</span>
                            <span className="font-medium text-rose-900">Loja bloqueada (pagamento pendente).</span>
                        </div>
                    </div>
                </div>

            </main>

            <footer className="max-w-3xl mx-auto px-6 mt-12 text-center">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    Dúvidas? Fale com o suporte técnico.
                </p>
            </footer>
        </div>
    );
};

export default IntegrationManual;
