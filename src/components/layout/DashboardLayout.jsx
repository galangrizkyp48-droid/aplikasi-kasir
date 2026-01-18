import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { usePWA } from '../../hooks/usePWA';
import { cn, formatRupiah } from '../../lib/utils';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    ShoppingBag,
    Lock,
    Wallet,
    Wallet,
    Download,
    Trash2,
    Plus,
    Minus,
    CreditCard
} from 'lucide-react';

export default function DashboardLayout() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const { isInstallable, install } = usePWA();
    const { user, logout, cart, updateQuantity, clearCart, openCheckoutModal } = useStore();
    const { shiftId, setShiftId } = useStore();
    const navigate = useNavigate();

    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

    const [storeName, setStoreName] = useState('POS UMKM');
    const [activeShift, setActiveShift] = useState(null);
    const APP_VERSION = 'v1.3.0'; // Update this to force visual change logic check

    // Initial Loaders
    useEffect(() => {
        const loadInitial = async () => {
            if (!user?.storeId) return;

            // Load Store Name
            const { data: storeSetting } = await supabase
                .from('settings')
                .select('value')
                .eq('store_id', user.storeId)
                .eq('key', 'storeName')
                .single();
            if (storeSetting) setStoreName(storeSetting.value);

            // Check for open shift
            const { data: openShift } = await supabase
                .from('shifts')
                .select('*')
                .eq('store_id', user.storeId)
                .eq('status', 'open')
                .single();

            if (openShift) {
                setShiftId(openShift.id);
                setActiveShift(openShift);
                setShowStartWorkModal(false);
            } else {
                setShiftId(null);
                setActiveShift(null);
                setShowStartWorkModal(true);
            }
        };
        loadInitial();
    }, [user?.storeId, shiftId]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Start Work Modal State
    const [showStartWorkModal, setShowStartWorkModal] = useState(false);
    const [startCash, setStartCash] = useState('');

    // End Work Modal State
    const [showEndWorkModal, setShowEndShiftModal] = useState(false);
    const [endWorkStats, setEndShiftStats] = useState(null);

    const handleStartWork = async (e) => {
        e.preventDefault();
        if (!startCash) return alert('Masukkan modal awal untuk mulai bekerja');
        if (!user?.storeId) return alert('Gagal: Store ID tidak ditemukan. Silakan login ulang.');

        try {
            const { data: newShift, error } = await supabase
                .from('shifts')
                .insert([{
                    start_time: new Date().toISOString(),
                    cashier_id: user?.id || 'unknown',
                    start_cash: Number(startCash),
                    status: 'open',
                    store_id: user.storeId
                }])
                .select()
                .single();

            if (error) throw error;
            setShiftId(newShift.id);
            setShowStartWorkModal(false);
            alert('Selamat Bekerja! Shift dimulai.');
        } catch (error) {
            console.error('Shift start error:', error);
            alert('Gagal memulai shift: ' + error.message);
        }
    };

    const prepareEndWork = async () => {
        if (!shiftId) return;

        try {
            // 1. Fetch Sales Stats
            const { data: transactions } = await supabase
                .from('transactions')
                .select('amount')
                .eq('shift_id', shiftId);

            const totalSales = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
            const txCount = transactions?.length || 0;

            // 2. Fetch Shift Info
            const { data: currentShift } = await supabase
                .from('shifts')
                .select('*')
                .eq('id', shiftId)
                .single();

            if (!currentShift) {
                alert('Shift error. Resetting.');
                setShiftId(null);
                window.location.reload();
                return;
            }

            // 3. Fetch Shopping List Expenses (Detailed)
            const today = new Date().toISOString().split('T')[0];
            const { data: shoppingLists } = await supabase
                .from('shopping_lists')
                .select('title, total_estimated, items')
                .eq('store_id', user.storeId)
                .eq('date', today);

            const totalShopping = shoppingLists?.reduce((sum, list) => sum + (list.total_estimated || 0), 0) || 0;

            // 4. Fetch Operational Expenses (Detailed)
            const { data: expenses } = await supabase
                .from('expenses')
                .select('title, amount')
                .eq('shift_id', shiftId);

            const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;

            // 5. Set Stats
            setEndShiftStats({
                shift: currentShift,
                totalSales,
                txCount,
                totalShopping,
                shoppingLists: shoppingLists || [],
                totalExpenses,
                expensesList: expenses || [],
                netIncome: totalSales - totalShopping - totalExpenses,
                expectedCash: (currentShift.start_cash || 0) + totalSales - totalExpenses
            });
            setShowEndShiftModal(true);
        } catch (e) {
            console.error(e);
            alert('Error: ' + e.message);
        }
    };

    const confirmEndWork = async () => {
        if (!endWorkStats || !shiftId) return;

        try {
            // Close all active shopping lists for today
            const today = new Date().toISOString().split('T')[0];
            await supabase
                .from('shopping_lists')
                .update({ status: 'closed' })
                .eq('store_id', user.storeId)
                .eq('date', today)
                .eq('status', 'active');

            // Close Shift
            const { error } = await supabase
                .from('shifts')
                .update({
                    end_time: new Date(),
                    status: 'closed',
                    total_sales: endWorkStats.totalSales,
                    end_cash: endWorkStats.expectedCash
                })
                .eq('id', shiftId);

            if (error) throw error;

            // Send to WhatsApp
            const expenseDetails = endWorkStats.expensesList?.length > 0
                ? endWorkStats.expensesList.map(e => `- ${e.title}: ${formatRupiah(e.amount)}`).join('\n')
                : '- Tidak ada pengeluaran';

            const shoppingDetails = endWorkStats.shoppingLists?.length > 0
                ? endWorkStats.shoppingLists.map(l => {
                    const itemsStr = l.items?.map(i => `   • ${i.name} (${i.quantity}x) - ${formatRupiah(i.price * i.quantity)}`).join('\n') || '';
                    return `- ${l.title} (Total: ${formatRupiah(l.total_estimated)})\n${itemsStr}`;
                }).join('\n\n')
                : '- Tidak ada belanjaan';

            const message = `*Laporan Pekerjaan: ${new Date().toLocaleDateString('id-ID')}*
---------------------------
Kasir: ${user?.name || 'Staff'}
Shift: ${new Date(endWorkStats.shift.start_time).toLocaleTimeString()} - ${new Date().toLocaleTimeString()}

*Ringkasan Keuangan*
Penjualan: ${formatRupiah(endWorkStats.totalSales)} (${endWorkStats.txCount} Trx)
Belanja Bahan: ${formatRupiah(endWorkStats.totalShopping)}
Operasional: ${formatRupiah(endWorkStats.totalExpenses)}
---------------------------
*Pendapatan Bersih: ${formatRupiah(endWorkStats.netIncome)}*
Total Uang Fisik: ${formatRupiah(endWorkStats.expectedCash)}

*Catatan Pengeluaran:*
${expenseDetails}

*List Belanjaan:*
${shoppingDetails}
`;
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');

            // Cleanup & Logout
            setShiftId(null);
            setShowEndShiftModal(false);

            // Clear POS Cart (Imported from store)
            useStore.getState().clearCart();

            logout(); // Clear user state
            navigate('/login'); // Go to login

        } catch (error) {
            alert('Gagal menutup pekerjaan: ' + error.message);
        }
    };

    const downloadReportImage = () => {
        window.print(); // Checking if simple print is enough for "Download" requirement as PDF
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { icon: ShoppingCart, label: 'Kasir', href: '/pos' },
        { icon: ShoppingBag, label: 'Pesanan', href: '/orders' },
        { icon: Package, label: 'Produk', href: '/products' },
        { icon: ShoppingBag, label: 'List Belanja', href: '/shopping-list' },
        { icon: Wallet, label: 'Pengeluaran', href: '/expenses' },
        { icon: FileText, label: 'Laporan', href: '/reports' },
        { icon: Settings, label: 'Pengaturan', href: '/settings' },
    ];

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out lg:transform-none flex flex-col",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                        <span className="material-symbols-outlined text-white text-xl">storefront</span>
                    </div>
                    <span className="font-bold text-lg dark:text-white truncate">{storeName}</span>
                </div>

                <nav className="flex-1 px-3 py-6 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) => cn(
                                "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                            )}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {isInstallable && (
                    <div className="px-4 pb-2">
                        <button
                            onClick={install}
                            className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-dashed border-slate-300 dark:border-slate-700"
                        >
                            <Download className="w-5 h-5 mr-3" />
                            Install Aplikasi
                        </button>
                    </div>
                )}

                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 font-bold">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.name || 'User'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role || 'Staff'} • {APP_VERSION}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Keluar
                    </button>
                </div>
            </aside>

            {/* START WORK MODAL (Global Blocking) */}
            {showStartWorkModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-10 h-10 text-primary" />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Mulai Bekerja</h2>
                            <p className="text-slate-500 dark:text-slate-400">
                                Masukkan modal awal di laci kasir untuk memulai pencatatan transaksi hari ini.
                            </p>
                        </div>

                        <form onSubmit={handleStartWork} className="space-y-4">
                            <div className="text-left">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                                    Modal Awal (Tunai)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                                    <input
                                        autoFocus
                                        type="number"
                                        value={startCash}
                                        onChange={(e) => setStartCash(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-lg focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/25 transition-all"
                            >
                                Buka Kasir & Mulai
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* END WORK ANALYSIS MODAL */}
            {showEndWorkModal && endWorkStats && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-red-600 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <LogOut className="w-6 h-6" />
                                Akhiri Pekerjaan & Laporan
                            </h2>
                            <p className="opacity-90 text-sm mt-1">
                                Tinjau pendapatan bersih dan kirim laporan sebelum pulang.
                            </p>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto" id="report-card">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 col-span-2">
                                    <p className="text-sm text-green-700 dark:text-green-400 mb-1">Total Penjualan</p>
                                    <p className="text-xl font-bold text-green-900 dark:text-white">{formatRupiah(endWorkStats.totalSales)}</p>
                                </div>
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                    <p className="text-sm text-red-700 dark:text-red-400 mb-1">Belanja Bahan</p>
                                    <p className="text-lg font-bold text-red-900 dark:text-white">{formatRupiah(endWorkStats.totalShopping)}</p>
                                </div>
                                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                                    <p className="text-sm text-orange-700 dark:text-orange-400 mb-1">Operasional</p>
                                    <p className="text-lg font-bold text-orange-900 dark:text-white">{formatRupiah(endWorkStats.totalExpenses)}</p>
                                </div>
                            </div>

                            <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                <p className="text-center text-sm text-slate-500 mb-2">Pendapatan Bersih Hari Ini</p>
                                <p className="text-center text-3xl font-black text-slate-900 dark:text-white text-primary">
                                    {formatRupiah(endWorkStats.netIncome)}
                                </p>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-500">Jumlah Transaksi</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{endWorkStats.txCount}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-500">Modal Awal</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{formatRupiah(endWorkStats.shift.startCash || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Total Uang Fisik (Laci)</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{formatRupiah(endWorkStats.expectedCash)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col gap-3">
                            <div className="flex gap-3">
                                <button
                                    onClick={downloadReportImage}
                                    className="flex-1 px-4 py-3 font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Cetak / Simpan
                                </button>
                                <button
                                    onClick={() => setShowEndShiftModal(false)}
                                    className="flex-1 px-4 py-3 font-bold text-slate-600 bg-transparent hover:bg-slate-200 transition-colors rounded-xl"
                                >
                                    Batal
                                </button>
                            </div>

                            <button
                                onClick={confirmEndWork}
                                className="w-full px-4 py-4 font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">send</span>
                                Selesai & Kirim Laporan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-4 ml-auto">
                        {/* Valid Shift Indicator / End Shift Button */}
                        {shiftId && (
                            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-900/50">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                                    Shift Aktif
                                    {activeShift && ` (${new Date(activeShift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                                </span>
                                <button
                                    onClick={prepareEndWork}
                                    className="ml-2 pl-2 border-l border-green-200 dark:border-green-800 text-xs font-bold text-red-500 hover:text-red-600"
                                >
                                    Akhiri Pekerjaan
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Cart Drawer */}
            {isMobileCartOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileCartOpen(false)} />
                    <div className="absolute top-0 right-0 bottom-0 w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-primary" />
                                Keranjang
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        if (window.confirm('Hapus semua?')) clearCart();
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <button onClick={() => setIsMobileCartOpen(false)} className="p-2 text-slate-400">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                                    <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                                    <p>Keranjang kosong</p>
                                </div>
                            ) : (
                                cart.map((item) => (
                                    <div key={item.id} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-slate-900 dark:text-white truncate">{item.name}</h4>
                                            <p className="text-primary font-medium text-sm">{formatRupiah(item.price)}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
                                                <button
                                                    onClick={() => updateQuantity(item.id, -1)}
                                                    className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-red-500"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, 1)}
                                                    className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-primary"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex justify-between items-end">
                                <span className="font-bold text-slate-900 dark:text-white">Total</span>
                                <span className="font-bold text-primary text-xl">
                                    {formatRupiah(cart.reduce((sum, item) => sum + (item.price * item.quantity * 1.11), 0))}
                                </span>
                            </div>
                            <button
                                disabled={cart.length === 0}
                                onClick={() => {
                                    setIsMobileCartOpen(false);
                                    openCheckoutModal();
                                    navigate('/pos');
                                }}
                                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
                            >
                                <CreditCard className="w-5 h-5" />
                                Bayar Sekarang
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
