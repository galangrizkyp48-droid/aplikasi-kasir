import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../lib/db';
import { useStore } from '../../lib/store';
import { ChevronLeft, Save } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

export default function ProductFormPage() {
    const { user } = useStore();
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        price: '',
        stock: '',
        barcode: ''
    });

    const [isUnlimited, setIsUnlimited] = useState(false);

    // Load existing product if edit mode
    useEffect(() => {
        if (isEditMode) {
            db.products.get(Number(id)).then(product => {
                if (product) {
                    setFormData({
                        name: product.name,
                        category: product.category,
                        price: product.price,
                        stock: product.stock === -1 ? '' : product.stock,
                        barcode: product.barcode || ''
                    });
                    if (product.stock === -1) {
                        setIsUnlimited(true);
                    }
                }
            });
        }
    }, [id, isEditMode]);

    // Load categories for dropdown
    const categories = useLiveQuery(() => {
        if (!user?.storeId) return [];
        return db.categories.where('storeId').equals(user.storeId).toArray();
    }, [user?.storeId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = {
            ...formData,
            price: Number(formData.price),
            stock: isUnlimited ? -1 : Number(formData.stock),
            storeId: user.storeId
        };

        try {
            if (isEditMode) {
                await db.products.update(Number(id), data);
            } else {
                await db.products.add(data);
            }
            navigate('/products');
        } catch (error) {
            alert('Gagal menyimpan produk: ' + error.message);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/products')}
                    className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {isEditMode ? 'Edit Produk' : 'Tambah Produk Baru'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nama Produk</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="Contoh: Nasi Goreng Spesial"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Kategori</label>
                            <input
                                list="categories"
                                type="text"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                placeholder="Pilih atau ketik baru"
                            />
                            <datalist id="categories">
                                {categories?.map(c => (
                                    <option key={c.id} value={c.name} />
                                ))}
                            </datalist>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Barcode / SKU (Opsional)</label>
                            <input
                                type="text"
                                value={formData.barcode}
                                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                placeholder="12345678"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Harga (Rp)</label>
                            <input
                                required
                                type="number"
                                min="0"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                placeholder="0"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Stok Awal</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isUnlimited"
                                        checked={isUnlimited}
                                        onChange={e => setIsUnlimited(e.target.checked)}
                                        className="rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="isUnlimited" className="text-xs text-slate-500 cursor-pointer select-none">Tak Terbatas (Unlimited)</label>
                                </div>
                            </div>
                            <input
                                required={!isUnlimited}
                                disabled={isUnlimited}
                                type="number"
                                min="0"
                                value={isUnlimited ? '' : formData.stock}
                                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                                placeholder={isUnlimited ? "∞" : "0"}
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button
                        type="submit"
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-primary/25 active:scale-[0.98]"
                    >
                        <Save className="w-5 h-5" />
                        Simpan Produk
                    </button>
                </div>
            </form>
        </div>
    );
}
