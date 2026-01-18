import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatRupiah, cn } from '../../lib/utils';
import { BarChart3, TrendingUp, Calendar, CreditCard, Clock, User, ChevronRight, Wallet } from 'lucide-react';
import { useStore } from '../../lib/store';

export default function ReportsPage() {
    const { user } = useStore();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedShiftId, setSelectedShiftId] = useState(null);

    const [shifts, setShifts] = useState([]);
    const [dailyTransactions, setDailyTransactions] = useState([]);
    const [shiftTransactions, setShiftTransactions] = useState([]);
    const [dailyExpenses, setDailyExpenses] = useState([]);

    // Enforce Free Plan Limit (Max 3 Days)
    useEffect(() => {
        if (user?.plan_type === 'free') {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            const selected = new Date(selectedDate);

            if (selected < threeDaysAgo) {
                alert('Plan Free hanya bisa melihat laporan 3 hari terakhir. Upgrade ke Pro untuk akses unlimited.');
                setSelectedDate(new Date().toISOString().split('T')[0]);
            }
        }
    }, [selectedDate, user?.plan_type]);

    const fetchShiftsAndDailyTx = async () => {
        if (!user?.storeId) return;

        // Fetch Shifts for selected date
        const { data: shiftData } = await supabase
            .from('shifts')
            .select('*')
            .eq('store_id', user.storeId)
            .gte('start_time', `${selectedDate}T00:00:00`)
            .lte('start_time', `${selectedDate}T23:59:59`)
            .order('start_time', { ascending: false });

        if (shiftData) setShifts(shiftData);

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch Transactions for selected date
        const { data: txData } = await supabase
            .from('transactions')
            .select('*')
            .eq('store_id', user.storeId)
            .gte('created_at', startOfDay.toISOString())
            .lte('created_at', endOfDay.toISOString());

        if (txData) setDailyTransactions(txData);

        // Fetch Expenses for selected date
        const { data: expData } = await supabase
            .from('expenses')
            .select('*')
            .eq('store_id', user.storeId)
            .eq('date', selectedDate);

        if (expData) setDailyExpenses(expData);
    };
    0
    useEffect(() => {
        fetchShiftsAndDailyTx();
    }, [selectedDate, user?.storeId]);

    const getShiftStats = (shift) => {
        // Always calculate from actual transactions if available to ensure accuracy
        const shiftTx = dailyTransactions?.filter(t => t.shift_id === shift.id) || [];
        const txTotal = shiftTx.reduce((sum, t) => sum + (t.amount || 0), 0);

        // If shift is closed, prefer the stored total_sales unless it's 0 (which might mean error)
        if (shift.status === 'closed' && shift.total_sales > 0) {
            return { total: shift.total_sales, count: shiftTx.length };
        }

        return { total: txTotal, count: shiftTx.length };
    };

    useEffect(() => {
        if (shifts && shifts.length > 0) {
            if (!selectedShiftId || !shifts.find(s => s.id === selectedShiftId)) {
                setSelectedShiftId(shifts[0].id);
            }
        } else {
            setSelectedShiftId(null);
        }
    }, [shifts]);

    useEffect(() => {
        const fetchShiftTx = async () => {
            if (!selectedShiftId) {
                setShiftTransactions([]);
                return;
            }
            const { data } = await supabase
                .from('transactions')
                .select('*')
                .eq('shift_id', selectedShiftId)
                .order('created_at', { ascending: false });

            if (data) setShiftTransactions(data);
        };
        fetchShiftTx();
    }, [selectedShiftId]);

    // Stats for the Detail View
    const totalSales = shiftTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const totalCount = shiftTransactions?.length || 0;
    const avgTransaction = totalCount > 0 ? totalSales / totalCount : 0;

    const activeShift = shifts?.find(s => s.id === selectedShiftId);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Shift</h1>
                    <p className="text-slate-500 dark:text-slate-400">Evaluasi penjualan per shift harian</p>
                </div>

                {/* Date Picker */}
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Calendar className="w-5 h-5 text-slate-500 ml-2" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-300 font-bold"
                        min={user?.plan_type === 'free' ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined}
                    />
                </div>
                {user?.plan_type === 'free' && (
                    <div className="text-xs text-orange-500 font-medium bg-orange-100 px-2 py-1 rounded">
                        Free Limit: 3 Hari
                    </div>
                )}
            </div>


            {/* Daily Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
                            <TrendingUp className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Penjualan</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {formatRupiah(dailyTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0)}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg">
                            <Wallet className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Pengeluaran</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {formatRupiah(dailyExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0)}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                            <CreditCard className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Profit Bersih</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {formatRupiah(
                                    (dailyTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0) -
                                    (dailyExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0)
                                )}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* ... List ... */}
            <div className="space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Daftar Shift ({new Date(selectedDate).toLocaleDateString(['id-ID'], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })})
                </h3>

                {shifts?.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <p className="text-slate-500">Belum ada shift yang tercatat pada tanggal ini.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {shifts?.map(shift => {
                            const isSelected = selectedShiftId === shift.id;
                            const isOpen = shift.status === 'open';
                            const stats = getShiftStats(shift);

                            return (
                                <button
                                    key={shift.id}
                                    onClick={() => setSelectedShiftId(shift.id)}
                                    className={cn(
                                        "relative flex flex-col p-4 rounded-xl border transition-all text-left",
                                        isSelected
                                            ? "bg-white dark:bg-slate-900 border-primary ring-1 ring-primary shadow-md"
                                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-primary/50"
                                    )}
                                >
                                    {isOpen && (
                                        <span className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full animate-pulse">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                            AKTIF
                                        </span>
                                    )}

                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center",
                                            isSelected ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"
                                        )}>
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Kasir ID {shift.cashier_id}</p>
                                            <p className="font-bold text-lg text-slate-900 dark:text-white">{formatRupiah(stats.total)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Mulai:</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Selesai:</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {shift.end_time ? new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm border-t border-dashed border-slate-200 dark:border-slate-700 pt-2 mt-2">
                                            <span className="text-slate-500">Modal Awal:</span>
                                            <span className="font-mono text-slate-700 dark:text-slate-300">{formatRupiah(shift.start_cash || 0)}</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedShiftId && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-6 w-1 bg-primary rounded-full" />
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                            Detail Laporan Shift #{selectedShiftId}
                        </h3>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Total Penjualan Shift</p>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatRupiah(totalSales)}</h3>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                                    <CreditCard className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Jumlah Transaksi</p>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{totalCount}</h3>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Modal Akhir (Estimasi)</p>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {activeShift ? formatRupiah((activeShift.start_cash || 0) + totalSales) : '-'}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Rincian Transaksi</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Jam</th>
                                        <th className="px-6 py-4 font-medium">ID Order</th>
                                        <th className="px-6 py-4 font-medium">Metode</th>
                                        <th className="px-6 py-4 font-medium text-right">Nilai</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {shiftTransactions?.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                                                Belum ada transaksi di shift ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        shiftTransactions?.map((t) => (
                                            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 text-slate-500">
                                                    {new Date(t.created_at).toLocaleTimeString()}
                                                </td>
                                                <td className="px-6 py-4 font-medium">#{t.order_id}</td>
                                                <td className="px-6 py-4 capitalize">
                                                    <span className={cn(
                                                        "px-2 py-1 rounded text-xs font-bold",
                                                        t.payment_method === 'cash' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                                    )}>
                                                        {t.payment_method}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                                                    {formatRupiah(t.amount)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
