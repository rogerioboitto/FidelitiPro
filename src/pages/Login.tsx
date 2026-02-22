import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Store as StoreIcon, Eye, EyeOff, Rocket, UserPlus, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { translations, type TranslationKeys } from '../config/translations';
import { CloudService } from '../services/api';
import { isTemporaryEmail } from '../utils/emailValidator';



const Login: React.FC = () => {
    const navigate = useNavigate();
    useAuth(); // Ensures AuthContext is initialized

    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', pass: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingVerification, setPendingVerification] = useState(false);
    const [emailNotFound, setEmailNotFound] = useState(false);

    // Forgot Password States
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [modalMessage, setModalMessage] = useState('');

    const t = (key: TranslationKeys) => translations['pt'][key] || key;

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setModalMessage('');

        if (!resetEmail) {
            setModalMessage('Digite seu e-mail.');
            setLoading(false);
            return;
        }

        try {
            await CloudService.auth.resetPassword(resetEmail);
            setModalMessage('Link de redefinição enviado com sucesso! Verifique seu e-mail.');
            setTimeout(() => {
                setShowForgotPassword(false);
                setModalMessage('');
                setResetEmail('');
            }, 3000);
        } catch (error: any) {
            console.error("Reset Password Error:", error);
            if (error.code === 'auth/user-not-found') {
                setModalMessage('E-mail não encontrado.');
            } else {
                setModalMessage('Erro ao enviar link. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (isLogin) {
                try {
                    // Single Firebase Auth flow for all users (admin and stores)
                    await CloudService.auth.signIn(formData.email, formData.pass);
                    const user = CloudService.auth.instance.currentUser;

                    if (user && !user.emailVerified) {
                        // Admin accounts don't need email verification
                        const isAdmin = user.email?.toLowerCase() === CloudService.getAdminEmail().toLowerCase();
                        if (!isAdmin) {
                            setError('E-mail não verificado. Cheque sua caixa de entrada.');
                            await CloudService.auth.signOut();
                            setLoading(false);
                            return;
                        }
                    }

                    // AuthContext onAuthStateChanged will detect admin/store role automatically
                    // and redirect will happen via App.tsx route protection
                    navigate('/dashboard');
                } catch (authError: any) {
                    console.error("Auth Error:", authError);
                    if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
                        setEmailNotFound(true);
                        setLoading(false);
                        return;
                    }
                    if (authError.code === 'auth/wrong-password') {
                        setError('Senha incorreta.');
                    } else if (authError.code === 'auth/too-many-requests') {
                        setError('Muitas tentativas falhas. Tente novamente mais tarde.');
                    } else {
                        setError('Erro ao fazer login. Tente novamente.');
                    }
                }

            } else {
                // Register Logic
                if (!formData.name || !formData.email || !formData.pass) {
                    setError('Preencha todos os campos.');
                    return;
                }

                // TEMP EMAIL CHECK
                if (isTemporaryEmail(formData.email)) {
                    setError('E-mails temporários não são permitidos por segurança.');
                    setLoading(false);
                    return;
                }

                const newStoreData = {
                    name: formData.name,
                    loyaltyItem: 'Ponto',
                    rewardGoal: 10
                };

                try {
                    await CloudService.auth.signUp(formData.email, formData.pass, newStoreData);
                    setPendingVerification(true);
                } catch (signUpError: any) {
                    console.error(signUpError);
                    const msg = signUpError.message || 'Erro de conexão.';
                    if (msg.includes('email-already-in-use')) {
                        setError('Este e-mail já está em uso.');
                    } else {
                        setError('Erro ao criar conta: ' + msg);
                    }
                }
            }
        } catch (err) {
            console.error(err);
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (emailNotFound) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-white to-slate-50">
                <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] overflow-hidden border border-indigo-50 p-10 text-center animate-in fade-in zoom-in duration-300">
                    <div className="bg-red-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-50">
                        <AlertCircle className="text-red-500" size={40} />
                    </div>

                    <h2 className="text-2xl font-black text-slate-800 tracking-tighter mb-2">
                        Ops! Acesso não encontrado
                    </h2>
                    <p className="text-slate-500 font-medium mb-8 text-sm leading-relaxed">
                        O e-mail <span className="text-slate-800 font-bold">{formData.email}</span> não consta em nossa base de dados. Gostaríamos de ter você conosco!
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                setEmailNotFound(false);
                                setIsLogin(false);
                                // Mantém o email para facilitar o cadastro
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-xl flex items-center justify-center gap-3 font-bold transition-all shadow-lg shadow-indigo-100 group"
                        >
                            <UserPlus size={20} className="group-hover:scale-110 transition-transform" />
                            Cadastrar Minha Loja
                        </button>

                        <button
                            onClick={() => {
                                setEmailNotFound(false);
                                setError('Credenciais inválidas. Verifique seus dados.');
                            }}
                            className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 p-4 rounded-xl flex items-center justify-center gap-3 font-bold transition-all border border-slate-100 group"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            Tentar Novamente
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (pendingVerification) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-white to-slate-50">
                <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] overflow-hidden border border-indigo-50 p-10 text-center">
                    <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-100 animate-bounce">
                        <Mail className="text-white" size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tighter mb-4">Confirme seu E-mail</h2>
                    <p className="text-slate-500 font-semibold mb-8">
                        Enviamos um link de confirmação oficial de <span className="text-indigo-600 font-bold">suporte@fidelitipro.com.br</span> para <span className="text-slate-800 font-bold">{formData.email}</span>.
                    </p>
                    <div className="bg-indigo-50 p-6 rounded-2xl mb-4 border border-indigo-100">
                        <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest leading-relaxed">
                            Não recebeu? Verifique sua pasta de spam ou tente novamente em alguns minutos.
                        </p>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-8 animate-pulse">
                        <div className="flex items-center justify-center gap-2 text-amber-600">
                            <AlertCircle size={16} />
                            <p className="text-[10px] font-black uppercase tracking-widest">
                                Importante: Verifique sua caixa de entrada e Spam.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setPendingVerification(false); setIsLogin(true); }}
                        className="text-slate-400 font-black text-[10px] hover:text-indigo-600 transition-all uppercase tracking-widest"
                    >
                        Voltar para o Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-white to-slate-50">
            <button
                onClick={() => navigate('/')}
                className="absolute top-6 left-6 md:top-10 md:left-10 text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all"
            >
                <ArrowLeft size={18} />
                Voltar para o início
            </button>

            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] overflow-hidden border border-indigo-50">
                <div className="p-10 pb-4 text-center">
                    <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                        <ShieldCheck className="text-white" size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tighter">
                        Fideliti<span className="text-indigo-600">Pro</span>
                    </h1>
                    <p className="text-slate-400 mt-2 font-bold text-[10px] uppercase tracking-[0.3em] leading-tight">
                        Sistema de Gestão de Fidelidade
                    </p>
                </div>

                <div className="p-10 pt-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="relative">
                                <StoreIcon className="absolute left-4 top-4 text-slate-300" size={20} />
                                <input
                                    type="text"
                                    placeholder={t('store_name_placeholder')}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-semibold text-slate-700"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="relative">
                            <Mail className="absolute left-4 top-4 text-slate-300" size={20} />
                            <input
                                type="email"
                                placeholder={t('email_placeholder')}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-semibold text-slate-700"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-4 top-4 text-slate-300" size={20} />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder={t('pass_placeholder')}
                                className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-semibold text-slate-700"
                                value={formData.pass}
                                onChange={(e) => setFormData({ ...formData, pass: e.target.value })}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-4 text-slate-300 hover:text-indigo-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        {error && <p className="text-red-500 text-[10px] font-black text-center uppercase tracking-widest bg-red-50 p-2 rounded-lg">{error}</p>}
                        {success && <p className="text-emerald-600 text-[10px] font-black text-center uppercase tracking-widest bg-emerald-50 p-2 rounded-lg">{success}</p>}

                        <Button type="submit" isLoading={loading} className="w-full py-5 text-lg mt-4 flex items-center justify-center gap-2">
                            {!loading && <Rocket size={20} />}
                            {isLogin ? 'Entrar no Sistema' : 'Cadastrar Empresa'}
                        </Button>
                    </form>


                    <div className="mt-8 text-center space-y-4">
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
                            className="text-slate-400 font-black text-[10px] hover:text-indigo-600 transition-all uppercase tracking-widest block w-full"
                        >
                            {isLogin ? 'Não tem uma conta? Registre-se' : 'Já possui conta? Faça login'}
                        </button>

                        {isLogin && (
                            <button
                                onClick={() => setShowForgotPassword(true)}
                                className="text-slate-400 font-black text-[10px] hover:text-rose-500 transition-all uppercase tracking-widest block w-full"
                            >
                                Esqueci minha senha
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgotPassword && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                            <Lock size={120} className="text-indigo-900" />
                        </div>

                        <h3 className="text-2xl font-black text-slate-800 mb-2 relative z-10">Recuperar Senha</h3>
                        <p className="text-slate-500 text-sm font-medium mb-6 relative z-10">Digite seu e-mail cadastrado para receber o link de redefinição.</p>

                        <form onSubmit={handleResetPassword} className="space-y-4 relative z-10">
                            <div>
                                <label className="text-[11px] font-black uppercase text-slate-400 mb-1 block">Seu E-mail</label>
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={e => setResetEmail(e.target.value)}
                                    className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 text-slate-700"
                                    placeholder="exemplo@email.com"
                                    required
                                />
                            </div>

                            {modalMessage && (
                                <p className={`text-[10px] font-black uppercase p-3 rounded-xl text-center ${modalMessage.includes('sucesso') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                                    {modalMessage}
                                </p>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowForgotPassword(false); setModalMessage(''); setResetEmail(''); }}
                                    className="flex-1 py-3 text-slate-400 font-black uppercase rounded-xl hover:bg-slate-50 transition-colors text-xs"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-3 bg-indigo-600 text-white font-black uppercase rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all text-xs flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Enviar Link'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            <footer className="mt-8 text-slate-300 text-[9px] font-black uppercase tracking-[0.4em]">
                FidelitiPro &copy; 2025 • Software Licenciado
            </footer>
        </div>
    );
};

export default Login;
