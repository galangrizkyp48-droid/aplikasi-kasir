import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../../lib/db';
import { Plus, Search, Pencil, Trash2, Package } from 'lucide-react';
import { formatRupiah, cn } from '../../lib/utils';

export default function ProductListPage() {
    const [search, setSearch] = useState('');

    const products = useLiveQuery(
        () => db.products
            .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
            .toArray(),
        [search]
    );

    const handleDelete = async (id) => {
        if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
            await db.products.delete(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Produk</h1>
                    <p className="text-slate-500 dark:text-slate-400">Kelola daftar menu dan stok barang</p>
                </div>
                <Link
                    to="/products/new"
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary/25"
                >
                    <Plus className="w-5 h-5" />
                    Tambah Produk
                </Link>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Cari produk..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Nama Produk</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Kategori</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-right">Harga</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Stok</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {products?.map((product) => (
                                <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <span className="font-medium text-slate-900 dark:text-white">{product.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            {product.category || 'Umum'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">
                                        {formatRupiah(product.price)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-xs font-medium",
                                            product.stock > 10
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                : product.stock > 0
                                                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        )}>
                                            {product.stock}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                to={`/products/${product.id}`}
                                                className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {products?.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Package className="w-8 h-8 opacity-50" />
                                            <p>Belum ada produk ditemukan</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
