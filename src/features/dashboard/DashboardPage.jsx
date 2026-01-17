import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { formatRupiah } from '../../lib/utils';
import { TrendingUp, ShoppingBag, Package } from 'lucide-react';
import { useStore } from '../../lib/store';

export default function DashboardPage() {
    const { shiftId } = useStore();

    const stats = useLiveQuery(async () => {
        if (!shiftId) {
            return {
                totalSales: 0,
                totalTransactions: 0,
                productCount: await db.products.count()
            };
        }

        // Fetch orders ONLY for the current shift
        const orders = await db.orders.where('shiftId').equals(shiftId).toArray();
        const productCount = await db.products.count();

        const totalSales = orders.reduce((sum, order) =>
            sum + (order.status === 'completed' ? order.total : 0), 0
        );

        const totalTransactions = orders.filter(o => o.status === 'completed').length;

        return {
            totalSales,
            totalTransactions,
            productCount
        };
    }, [shiftId]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Overview</h1>
                <p className="text-slate-500 dark:text-slate-400">Ringkasan aktivitas bisnis hari ini</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-primary/10 text-primary rounded-xl">
                        <TrendingUp className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm">Total Penjualan</h3>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {formatRupiah(stats?.totalSales || 0)}
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-xl">
                        <ShoppingBag className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm">Transaksi Selesai</h3>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {stats?.totalTransactions || 0}
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 rounded-xl">
                        <Package className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm">Total Produk</h3>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {stats?.productCount || 0}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
