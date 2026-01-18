import { useState } from 'react';
import { useStore } from '../../lib/store';
import { SUBSCRIPTION_PLANS, MOCK_PAYMENT_GATEWAY, upgradeUserToPro } from './subscription';
import { Crown, CheckCircle2, ShieldCheck, Loader2, CreditCard } from 'lucide-react';
import { formatRupiah } from '../../lib/utils';

export default function SubscriptionPage() {
    const { user, setUser } = useStore();
    const [isLoading, setIsLoading] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const isPro = user?.plan_type === 'pro';
    const subEndDate = user?.subscription_end ? new Date(user.subscription_end) : null;

    const handleUpgrade = async () => {
        setIsLoading(true);
        try {
            // 1. Simulate Payment Popup / Process
            await MOCK_PAYMENT_GATEWAY.initiatePayment(50000, user);

            // 2. Mock "Waiting for payment..." UI delay
            await new Promise(r => setTimeout(r, 2000));

            // 3. Process Upgrade on backend (simulated via Supabase call)
            const result = await upgradeUserToPro(user.id, user.storeId);

            if (result.success) {
                // Update local state
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 30);

                setUser({
                    ...user,
                    plan_type: 'pro',
                    subscription_end: endDate.toISOString(),
                    max_staff: 99
                });

                setShowPaymentModal(false);
                alert('Selamat! Akun Anda sekarang PRO.');
            } else {
                throw new Error(result.error.message);
            }
        } catch (error) {
            alert('Gagal upgrade: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Crown className="w-8 h-8 text-yellow-500" />
                    Status Langganan
                </h1>
                <p className="text-slate-500 dark:text-slate-400">Kelola paket langganan toko Anda</p>
            </div>

            {/* Current Plan Status */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <p className="text-slate-300 font-medium mb-1">Paket Saat Ini</p>
                        <h2 className="text-3xl font-bold flex items-center gap-3">
                            {isPro ? 'PRO PLAN' : 'FREE PLAN'}
                            {isPro && <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded font-bold">ACTIVE</span>}
                        </h2>
                        {isPro && subEndDate && (
                            <p className="mt-2 text-slate-300">
                                Berakhir pada: {subEndDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        )}
                        {!isPro && (
                            <p className="mt-2 text-slate-300">
                                Upgrade untuk akses fitur tanpa batas.
                            </p>
                        )}
                    </div>

                    {!isPro && (
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-xl shadow-lg shadow-yellow-500/20 transition-all transform hover:scale-105"
                        >
                            Upgrade Sekarang
                        </button>
                    )}
                </div>
            </div>

            {/* Plans Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Free Plan */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Basic (Gratis)</h3>
                        <p className="text-3xl font-bold mt-2 text-slate-900 dark:text-white">Rp 0</p>
                        <p className="text-slate-500 text-sm">per bulan</p>
                    </div>
                    <ul className="space-y-3 mb-6 flex-1">
                        {SUBSCRIPTION_PLANS.FREE.features.map((feat, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-slate-400" />
                                {feat}
                            </li>
                        ))}
                    </ul>
                    <button disabled className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-lg cursor-not-allowed">
                        Paket Dasar
                    </button>
                </div>

                {/* Pro Plan */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-yellow-500 p-6 flex flex-col relative">
                    <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-lg">
                        POPULAR
                    </div>
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            Professional
                            <Crown className="w-5 h-5 text-yellow-500" />
                        </h3>
                        <p className="text-3xl font-bold mt-2 text-slate-900 dark:text-white">{formatRupiah(50000)}</p>
                        <p className="text-slate-500 text-sm">per bulan</p>
                    </div>
                    <ul className="space-y-3 mb-6 flex-1">
                        {SUBSCRIPTION_PLANS.PRO.features.map((feat, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-slate-900 dark:text-white font-medium text-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                {feat}
                            </li>
                        ))}
                    </ul>
                    {!isPro ? (
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg shadow-lg shadow-yellow-500/20 transition-all"
                        >
                            Pilih Pro
                        </button>
                    ) : (
                        <div className="w-full py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold rounded-lg text-center flex items-center justify-center gap-2">
                            <ShieldCheck className="w-4 h-4" />
                            Aktif
                        </div>
                    )}
                </div>
            </div>

            {/* Mock Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Pembayaran (Simulasi)</h3>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-600 dark:text-slate-300 font-medium">Total Tagihan</span>
                                    <span className="text-lg font-bold text-primary">{formatRupiah(50000)}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-500 border-t border-blue-200 dark:border-blue-800/50 pt-2">
                                    <div className="w-8 h-5 bg-blue-500 rounded flex items-center justify-center text-[10px] text-white font-bold">DANA</div>
                                    <span>0813 1513 8168 (Galang)</span>
                                </div>
                            </div>

                            <p className="text-sm text-slate-500 mb-6 text-center">
                                Klik tombol di bawah untuk mensimulasikan pembayaran sukses via aplikasi DANA.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={handleUpgrade}
                                    disabled={isLoading}
                                    className="w-full bg-[#008CFF] hover:bg-[#007bd4] text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Memproses Pembayaran...
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="w-5 h-5" />
                                            Bayar Sekarang (Simulasi)
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    disabled={isLoading}
                                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold py-3 rounded-xl transition-all"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
