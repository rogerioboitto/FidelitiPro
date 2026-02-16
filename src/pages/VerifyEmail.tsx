
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { CloudService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const VerifyEmail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { loginAsStore, refreshStores } = useAuth();

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verificando seu e-mail...');

    const id = searchParams.get('id');
    const token = searchParams.get('token');

    const hasRun = React.useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        const verify = async () => {
            if (!id || !token) {
                setStatus('error');
                setMessage('Link de verificação inválido ou expirado.');
                return;
            }

            try {
                const store = await CloudService.verifyStoreEmail(id, token);
                if (store) {
                    setStatus('success');
                    setMessage('E-mail verificado com sucesso! Redirecionando...');

                    // Auto-login after verification
                    setTimeout(async () => {
                        // Wait a bit more to ensure Firebase has fully saved the changes
                        await new Promise(resolve => setTimeout(resolve, 500));
                        // Refresh stores to get updated data
                        await refreshStores();
                        // Update last visit timestamp
                        await CloudService.updateStoreLastVisit(store.id);
                        loginAsStore(store);
                        navigate('/dashboard');
                    }, 1500);
                } else {
                    setStatus('error');
                    setMessage('Não foi possível verificar seu e-mail. O link pode ter expirado ou já foi utilizado.');
                }
            } catch (err) {
                console.error(err);
                setStatus('error');
                setMessage('Erro ao processar verificação. Tente novamente mais tarde.');
            }
        };

        verify();
    }, [id, token, navigate, loginAsStore, refreshStores]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-white to-slate-50 font-sans">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] overflow-hidden border border-indigo-50 p-10 text-center">
                <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-100 transform -rotate-2">
                    <ShieldCheck className="text-white" size={40} />
                </div>

                <h1 className="text-3xl font-black text-slate-800 tracking-tighter mb-4">
                    Fideliti<span className="text-indigo-600">Pro</span>
                </h1>

                <div className="py-8">
                    {status === 'verifying' && (
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="text-indigo-600 animate-spin" size={48} />
                            <p className="font-bold text-slate-600 uppercase tracking-widest text-xs">{message}</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                            <div className="bg-emerald-100 p-4 rounded-full text-emerald-600">
                                <CheckCircle size={48} />
                            </div>
                            <p className="font-black text-emerald-600 uppercase tracking-widest text-sm">{message}</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center gap-4 animate-in shake duration-500">
                            <div className="bg-rose-100 p-4 rounded-full text-rose-600">
                                <AlertCircle size={48} />
                            </div>
                            <p className="font-black text-rose-600 uppercase tracking-widest text-sm">{message}</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="mt-4 px-8 py-3 bg-slate-800 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 transition-all shadow-lg"
                            >
                                Voltar para o Login
                            </button>
                        </div>
                    )}
                </div>

                <footer className="mt-8 text-slate-300 text-[9px] font-black uppercase tracking-[0.4em]">
                    Verificação de Segurança Obrigatória
                </footer>
            </div>
        </div>
    );
};

export default VerifyEmail;
