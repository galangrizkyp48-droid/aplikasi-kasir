import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { formatRupiah, cn } from '../../lib/utils';
import { Plus, Save, Trash2, ShoppingCart, Search, Package, ArrowRight, Minus } from 'lucide-react';

export default function ShoppingListPage() {
    const { user } = useStore();
    // State
    const [search, setSearch] = useState('');
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [showAddItem, setShowAddItem] = useState(false);

    const [todayList, setTodayList] = useState(null);
    const [catalogItems, setCatalogItems] = useState([]);

    const fetchTodayList = async () => {
        if (!user?.storeId) return;
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('shopping_lists')
            .select('*')
            .eq('store_id', user.storeId)
            .eq('date', today)
            .eq('status', 'active')
            .single();

        if (data) setTodayList(data);
        else setTodayList(null);
    };

    const fetchCatalog = async () => {
        if (!user?.storeId) return;
        let query = supabase
            .from('shopping_items')
            .select('*')
            .eq('store_id', user.storeId);

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        const { data } = await query.order('name');
        if (data) setCatalogItems(data);
    };

    useEffect(() => {
        fetchTodayList();
        fetchCatalog();
    }, [user?.storeId, search]);

    // Actions
    const addToCart = async (item) => {
        const itemToAdd = { ...item, quantity: 1, checked: false };

        if (!todayList) {
            const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const today = new Date().toISOString().split('T')[0];

            console.log('Creating new shopping list for:', today);

            const { data, error } = await supabase
                .from('shopping_lists')
                .insert([{
                    title: `Belanja ${dateStr}`,
                    date: today,
                    status: 'active',
                    items: [itemToAdd],
                    total_estimated: item.price,
                    store_id: user.storeId
                }])
                .select()
                .single();

            if (error) {
                console.error('Error creating list:', error);
                alert('Gagal buat list: ' + error.message + ' (' + error.details + ')');
            } else {
                fetchTodayList();
            }
        } else {
            console.log('Updating existing list:', todayList.id);
            const existingItem = todayList.items.find(i => i.id === item.id);
            let newItems;

            if (existingItem) {
                newItems = todayList.items.map(i =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            } else {
                newItems = [...todayList.items, itemToAdd];
            }

            const newTotal = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

            const { error } = await supabase
                .from('shopping_lists')
                .update({ items: newItems, total_estimated: newTotal })
                .eq('id', todayList.id);

            if (error) {
                console.error('Error updating list:', error);
                alert('Gagal update list: ' + error.message);
            } else {
                fetchTodayList();
            }
        }
    };

    const updateQuantity = async (itemId, delta) => {
        if (!todayList) return;

        const newItems = todayList.items.map(i => {
            if (i.id === itemId) return { ...i, quantity: Math.max(1, i.quantity + delta) };
            return i;
        });

        const newTotal = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        await supabase
            .from('shopping_lists')
            .update({ items: newItems, total_estimated: newTotal })
            .eq('id', todayList.id);
        fetchTodayList();
    };

    const toggleItemCheck = async (itemId) => {
        if (!todayList) return;

        const newItems = todayList.items.map(i => {
            if (i.id === itemId) return { ...i, checked: !i.checked };
            return i;
        });

        await supabase
            .from('shopping_lists')
            .update({ items: newItems })
            .eq('id', todayList.id);
        fetchTodayList();
    };

    const removeFromCart = async (itemId) => {
        if (!todayList) return;
        const newItems = todayList.items.filter(i => i.id !== itemId);
        const newTotal = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        await supabase
            .from('shopping_lists')
            .update({ items: newItems, total_estimated: newTotal })
            .eq('id', todayList.id);
        fetchTodayList();
    };

    const addNewCatalogItem = async (e) => {
        e.preventDefault();
        if (!newItemName || !newItemPrice) return;

        try {
            const { error } = await supabase.from('shopping_items').insert([{
                name: newItemName,
                price: Number(newItemPrice),
                unit: 'pcs',
                store_id: user.storeId
            }]);

            if (error) throw error;
            setNewItemName('');
            setNewItemPrice('');
            setShowAddItem(false);
            alert('Item berhasil ditambahkan ke katalog!');
            fetchCatalog();
        } catch (error) {
            alert('Gagal tambah item: ' + error.message);
        }
    };

    const deleteCatalogItem = async (id, e) => {
        e.stopPropagation();
        if (window.confirm('Hapus item ini dari katalog?')) {
            const { error } = await supabase.from('shopping_items').delete().eq('id', id);
            if (error) alert('Gagal hapus: ' + error.message);
            else fetchCatalog();
        }
    };

    return (
        <div className="h-[calc(100vh-theme(spacing.32))] flex flex-col md:flex-row gap-6">
            {/* Left: Catalog (Menu) */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-lg flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" />
                            Katalog Barang Belanja
                        </h2>
                        <button
                            onClick={() => setShowAddItem(!showAddItem)}
                            className="text-sm bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg font-bold transition-colors"
                        >
                            + Item Baru
                        </button>
                    </div>

                    {showAddItem && (
                        <form onSubmit={addNewCatalogItem} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                <input
                                    placeholder="Nama Barang (mis. Plastik 1kg)"
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    className="md:col-span-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600"
                                    autoFocus
                                />
                                <input
                                    type="number"
                                    placeholder="Harga Beli"
                                    value={newItemPrice}
                                    onChange={e => setNewItemPrice(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600"
                                />
                            </div>
                            <button type="submit" className="w-full bg-primary text-white font-bold py-2 rounded-lg text-sm">Simpan ke Katalog</button>
                        </form>
                    )}

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Cari barang..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {catalogItems?.map(item => (
                            <button
                                key={item.id}
                                onClick={() => addToCart(item)}
                                className="group relative flex flex-col p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:shadow-md transition-all text-left"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                        <Package className="w-4 h-4" />
                                    </div>
                                    <div
                                        onClick={(e) => deleteCatalogItem(item.id, e)}
                                        className="text-slate-300 hover:text-red-500 cursor-pointer p-1"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </div>
                                </div>
                                <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 mb-1">{item.name}</h3>
                                <p className="font-bold text-primary text-sm mt-auto">{formatRupiah(item.price)}</p>
                            </button>
                        ))}
                        {catalogItems?.length === 0 && (
                            <div className="col-span-full text-center py-10 text-slate-400 text-sm">
                                Katalog kosong. Tambahkan item baru.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Today's List (Cart) */}
            <div className="w-full md:w-96 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                        List Belanja Hari Ini
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Total Estimasi: <span className="font-bold text-slate-900 dark:text-white">{formatRupiah(todayList?.total_estimated || 0)}</span>
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {!todayList || todayList.items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
                            <ShoppingCart className="w-10 h-10 mb-3 opacity-20" />
                            <p className="text-sm">List hari ini kosong</p>
                        </div>
                    ) : (
                        todayList.items.map(item => (
                            <div
                                key={item.id}
                                className={cn(
                                    "flex gap-3 p-3 rounded-xl border transition-colors cursor-pointer",
                                    item.checked
                                        ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30 opacity-75"
                                        : "bg-slate-50 border-transparent hover:border-slate-200 dark:bg-slate-800/50 dark:hover:border-slate-700"
                                )}
                                onClick={() => toggleItemCheck(item.id)}
                            >
                                <div className="flex-1 min-w-0">
                                    <h4 className={cn(
                                        "font-semibold text-sm truncate transition-all",
                                        item.checked ? "text-slate-500 line-through decoration-slate-400" : "text-slate-900 dark:text-white"
                                    )}>{item.name}</h4>
                                    <p className="text-xs text-slate-500">{formatRupiah(item.price)} / pcs</p>
                                </div>
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => updateQuantity(item.id, -1)}
                                        className="w-6 h-6 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100"
                                    ><Minus className="w-3 h-3" /></button>
                                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.id, 1)}
                                        className="w-6 h-6 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100"
                                    ><Plus className="w-3 h-3" /></button>
                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        className="ml-1 text-slate-400 hover:text-red-500"
                                    ><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-center text-slate-400">
                    Otomatis tersimpan untuk tanggal {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>
    );
}
