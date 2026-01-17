import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { formatRupiah, cn } from '../../lib/utils';
import { Plus, Trash2, Wallet, Calendar, ArrowUpRight } from 'lucide-react';

export default function ExpensesPage() {
    const { user, shiftId } = useStore();
    const [expenses, setExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form State for adding new expense
    const [newExpense, setNewExpense] = useState({
        title: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
    });

    // State for filtering expenses by date
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchExpenses = async () => {
        if (!user?.storeId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .eq('store_id', user.storeId)
                .eq('date', filterDate) // Filter by the selected date
                .order('created_at', { ascending: false });

            if (error) throw error;
            setExpenses(data || []);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, [user?.storeId, filterDate]); // Re-fetch when storeId or filterDate changes

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!newExpense.title || !newExpense.amount) return;

        try {
            const { error } = await supabase.from('expenses').insert([{
                title: newExpense.title,
                amount: Number(newExpense.amount),
                date: newExpense.date,
                store_id: user.storeId,
                shift_id: shiftId || null // Link to current shift if active
            }]);

            if (error) throw error;

            alert('Pengeluaran berhasil dicatat');
            setNewExpense({
                title: '',
                amount: '',
                date: new Date().toISOString().split('T')[0]
            });
            // If the added expense's date matches the current filter date, re-fetch
            if (newExpense.date === filterDate) {
                fetchExpenses();
            }
        } catch (error) {
            alert('Gagal menambah pengeluaran: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Hapus catatan pengeluaran ini?')) return;
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) alert('Gagal hapus: ' + error.message);
        else fetchExpenses();
    };

    const totalExpenses = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Catatan Pengeluaran</h1>
                    <p className="text-slate-500 dark:text-slate-400">Catat biaya operasional harian untuk kalkulasi profit</p>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Calendar className="w-5 h-5 text-slate-500 ml-2" />
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-300 font-bold"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden sticky top-6">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" />
                            <h3 className="font-bold text-slate-900 dark:text-white">Tambah Pengeluaran</h3>
                        </div>
                        <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Keterangan</label>
                                <input
                                    placeholder="Contoh: Beli Es Batu, Listrik"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nominal (Rp)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <ArrowUpRight className="w-5 h-5" />
                                Simpan Catatan
                            </button>
                        </form>
                    </div>
                </div>

                {/* List */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Summary Card */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-xl">
                            <Wallet className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Pengeluaran ({new Date(date).toLocaleDateString()})</p>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{formatRupiah(totalExpenses)}</h3>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-slate-900 dark:text-white">Riwayat Pengeluaran</h3>
                        </div>
                        <div className="divide-y divide-slate-200 dark:divide-slate-800">
                            {expenses.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">
                                    Belum ada catatan pengeluaran hari ini.
                                </div>
                            ) : (
                                expenses.map(item => (
                                    <div key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div>
                                            <h4 className="font-semibold text-slate-900 dark:text-white">{item.title}</h4>
                                            <span className="text-xs text-slate-500">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-red-600">{formatRupiah(item.amount)}</span>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
