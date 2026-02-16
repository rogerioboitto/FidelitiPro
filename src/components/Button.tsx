
import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
    isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    className = '',
    isLoading = false,
    disabled,
    ...props
}) => {
    const baseStyles = "px-6 py-3 rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2";

    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100",
        secondary: "bg-slate-200 text-slate-700 hover:bg-slate-300",
        danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-xl shadow-rose-100",
        success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-100",
        outline: "border-2 border-slate-200 text-slate-500 hover:border-indigo-600 hover:text-indigo-600 bg-transparent"
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], className)}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading && <Loader2 className="animate-spin" size={20} />}
            {children}
        </button>
    );
};

export default Button;
