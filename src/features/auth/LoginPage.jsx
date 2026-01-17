import { useState } from 'react';
import { useStore } from '../../lib/store';
import { useNavigate } from 'react-router-dom';
import { supabase, seedDatabase } from '../../lib/supabase';

export default function LoginPage() {
    const [isRegistering, setIsRegistering] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Login State
    const [formData, setFormData] = useState({ username: '', password: '' });

    // Register State
    const [regData, setRegData] = useState({
        name: '',
        username: '',
        password: '',
        pin: '',
        role: 'owner'
    });

    const navigate = useNavigate();
    const setUser = useStore((state) => state.setUser);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Fallback Admin first (no DB dependency)
            if (formData.username === 'admin' && formData.password === 'admin') {
                setUser({
                    id: 'admin',
                    name: 'Administrator',
                    role: 'owner',
                    storeId: 'admin-store' // Default storeId for admin
                });
                navigate('/dashboard');
                return;
            }

            // Check in Supabase
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', formData.username)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (user && user.password === formData.password) {
                setUser({
                    ...user,
                    storeId: user.store_id
                });
                navigate('/dashboard');
            } else {
                alert('Username atau password salah!');
            }
        } catch (error) {
            console.error('Login error:', error);
            // If DB error and using admin credentials, allow login
            if (formData.username === 'admin' && formData.password === 'admin') {
                setUser({
                    id: 'admin',
                    name: 'Administrator',
                    role: 'owner',
                    storeId: 'admin-store'
                });
                navigate('/dashboard');
            } else {
                alert('Login error: ' + error.message);
            }
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!regData.username || !regData.password || !regData.name) {
            alert('Mohon lengkapi data!');
            return;
        }

        try {
            // Check existing in Supabase
            const { data: existing, error: checkError } = await supabase
                .from('users')
                .select('username')
                .eq('username', regData.username);

            if (checkError) throw checkError;
            if (existing && existing.length > 0) {
                alert('Username sudah digunakan!');
                return;
            }

            // Generate new Store ID
            const newStoreId = Date.now().toString();

            const payload = {
                name: regData.name,
                username: regData.username,
                password: regData.password,
                role: 'owner', // Force owner role for new signups
                store_id: newStoreId,
                pin: regData.pin || null // Send null if empty
            };

            const { error: regError } = await supabase.from('users').insert([payload]);

            if (regError) {
                console.log('Registration Payload:', payload);
                console.error('Registration Error:', regError);
                throw regError;
            }

            // Seed initial data for this store in Supabase
            await seedDatabase(newStoreId);

            alert('Registrasi Berhasil! Silakan login.');
            setIsRegistering(false);
            setFormData({ username: regData.username, password: '' });
        } catch (error) {
            console.error('Full Error:', error);
            alert(`Gagal registrasi: ${error.message} (${error.details || error.hint || 'No details'})`);
        }
    };

    return (
        <div className="flex-1 flex flex-col max-w-[480px] mx-auto w-full px-6 pb-12">
            <div className="pt-16 pb-10 flex flex-col items-center">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-primary text-5xl">storefront</span>
                </div>
                <h1 className="text-[#1e293b] dark:text-white tracking-tight text-3xl font-bold leading-tight text-center">
                    {isRegistering ? 'Buat Akun Bisnis' : 'Selamat Datang'}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-center mt-2 font-medium">
                    {isRegistering ? 'Mulai kelola usaha Anda secara gratis' : 'Masuk ke dashboard kasir Anda'}
                </p>
            </div>

            {isRegistering ? (
                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-slate-700 dark:text-slate-200 text-sm font-semibold ml-1">Nama Lengkap / Bisnis</label>
                        <input
                            value={regData.name}
                            onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white"
                            placeholder="Nama Bisnis Anda"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-slate-700 dark:text-slate-200 text-sm font-semibold ml-1">Username</label>
                        <input
                            value={regData.username}
                            onChange={(e) => setRegData({ ...regData, username: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white"
                            placeholder="Username"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-slate-700 dark:text-slate-200 text-sm font-semibold ml-1">Password</label>
                        <input
                            type="password"
                            value={regData.password}
                            onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white"
                            placeholder="Password"
                            required
                        />
                    </div>
                    <div className="pt-4">
                        <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-lg py-4 rounded-xl transition-all shadow-lg shadow-primary/25 active:scale-[0.98]">
                            Daftar Sekarang
                        </button>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-slate-700 dark:text-slate-200 text-sm font-semibold ml-1">Username</label>
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">person</span>
                            <input
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                                className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                                placeholder="Username atau Email"
                                type="text"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-slate-700 dark:text-slate-200 text-sm font-semibold">Kata Sandi</label>
                        </div>
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">lock</span>
                            <input
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                className="w-full pl-12 pr-12 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                                placeholder="••••••••"
                                type={showPassword ? "text" : "password"}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[22px]">
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-lg py-4 rounded-xl transition-all shadow-lg shadow-primary/25 active:scale-[0.98]">
                            Masuk
                        </button>
                        <div className="mt-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                            <p className="font-semibold mb-1">Aplikasi yang dibuat oleh Galang untuk mendukung UMKM</p>
                        </div>
                    </div>
                </form>
            )}

            <div className="mt-auto pt-12 text-center">
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                    {isRegistering ? 'Sudah punya akun?' : 'Belum punya akun?'}
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-primary font-bold hover:underline ml-1"
                    >
                        {isRegistering ? 'Login Disini' : 'Daftar Bisnis Baru (Offline)'}
                    </button>
                </p>
                <div className="mt-8 flex justify-center items-center gap-4">
                    <span className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">Versi 2.4.0</span>
                </div>
            </div>
        </div>
    );
}
