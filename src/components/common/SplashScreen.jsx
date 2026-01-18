import React from 'react';
import { Store } from 'lucide-react';

export default function SplashScreen() {
    return (
        <div className="fixed inset-0 bg-white dark:bg-slate-900 z-50 flex flex-col items-center justify-center animate-out fade-out duration-1000 fill-mode-forwards" style={{ animationDelay: '2.5s' }}>
            <div className="flex flex-col items-center animate-bounce">
                <div className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 mb-6">
                    <Store className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Aplikasi Kasir
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    Solusi Cerdas UMKM Indonesia
                </p>
            </div>

            <div className="absolute bottom-10 text-center">
                <p className="text-sm text-slate-400 dark:text-slate-500">
                    Developed by
                </p>
                <p className="text-md font-semibold text-primary">
                    Galang Rizky Pratama
                </p>
                <div className="mt-4 w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto opacity-50"></div>
            </div>
        </div>
    );
}
