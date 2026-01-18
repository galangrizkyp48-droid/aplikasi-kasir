import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Clock, Wallet, Lock, Banknote, Share2, Printer, CheckCircle2, X, ChefHat, Save } from 'lucide-react';
import { formatRupiah, cn } from '../../lib/utils';
import { APP_VERSION } from '../../lib/version';
import { useNavigate } from 'react-router-dom';

export default function POSPage() {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    // Removed local showCheckoutModal state
    const [customerName, setCustomerName] = useState('');

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [settings, setSettings] = useState({ taxRate: 11 });

    // Payment UI State
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [cashReceived, setCashReceived] = useState('');
    const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);
    const [lastOrderId, setLastOrderId] = useState(null);

    // Shift State
    const [isShiftOpen, setIsShiftOpen] = useState(false);
    const [whatsappNumber, setWhatsappNumber] = useState('');

    const {
        cart, addToCart, removeFromCart, clearCart,
        setShiftId, shiftId, user,
        currentOrderId, setCurrentOrderId, updateQuantity,
        currentCustomerName, setCustomerNameStore,
        isCheckoutModalOpen, openCheckoutModal, closeCheckoutModal, // Added global state
        addToQueue // Import addToQueue
    } = useStore();

    const setStoreCustomerName = useStore(state => state.setCustomerName);
    const storeCustomerName = useStore(state => state.currentCustomerName);

    // Initialize local state from store if editing
    useEffect(() => {
        if (currentOrderId && storeCustomerName) {
            setCustomerName(storeCustomerName);
        }
    }, [currentOrderId, storeCustomerName]);

    const navigate = useNavigate();

    // Reset payment state when modal opens
    useEffect(() => {
        // Global state listener to reset form
        if (isCheckoutModalOpen) {
            setPaymentMethod('cash');
            setCashReceived('');
            setIsPaymentSuccess(false);
            setLastOrderId(null);
        }
    }, [isCheckoutModalOpen]);


    // Shift validation is handled globally in DashboardLayout.jsx
    // Removed duplicate logic here to prevent shiftId from being cleared



    // Data Loaders
    useEffect(() => {
        const loadPOSData = async () => {
            if (!user?.storeId) return;

            // Load categories
            const { data: catData } = await supabase
                .from('categories')
                .select('*')
                .eq('store_id', user.storeId)
                .order('name');
            if (catData) setCategories(catData);

            // Load settings
            const { data: taxSetting } = await supabase
                .from('settings')
                .select('*')
                .eq('store_id', user.storeId)
                .eq('key', 'taxRate')
                .single();

            setSettings({
                taxRate: taxSetting ? Number(taxSetting.value) : 11
            });
        };
        loadPOSData();
    }, [user?.storeId]);

    // Products Loader with filtering
    useEffect(() => {
        const loadProducts = async () => {
            if (!user?.storeId) return;
            let query = supabase
                .from('products')
                .select('*')
                .eq('store_id', user.storeId);

            if (selectedCategory) {
                query = query.eq('category', selectedCategory);
            }
            if (search) {
                query = query.ilike('name', `%${search}%`);
            }

            const { data } = await query.order('name');
            if (data) setProducts(data);
        };
        loadProducts();
    }, [search, selectedCategory, user?.storeId]);

    // Reset payment state when modal opens
    useEffect(() => {
        if (isCheckoutModalOpen) {
            setPaymentMethod('cash');
            setCashReceived('');
            setIsPaymentSuccess(false);
            setLastOrderId(null);
        }
    }, [isCheckoutModalOpen]);

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxRate = settings?.taxRate ?? 11;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    const change = paymentMethod === 'cash' && cashReceived ? Number(cashReceived) - total : 0;
    const canPay = paymentMethod === 'qris' || (paymentMethod === 'cash' && Number(cashReceived) >= total);

    const handleClearCart = () => {
        if (window.confirm('Hapus semua pesanan?')) {
            clearCart();
            setCurrentOrderId(null);
        }
    };



    // ...

    const processOrder = async (status) => {
        try {
            // OFFLINE HANDLING
            if (!navigator.onLine) {
                if (status === 'save') {
                    alert('Fitur "Simpan" hanya tersedia saat online.');
                    return;
                }

                const finalStatus = status === 'pay' ? 'paid' : (status === 'hold' ? 'cooking' : status);
                const finalCustomerName = customerName.trim() || (finalStatus === 'paid' ? 'Walk-in Customer' : 'Table Order');

                // Generate Local ID
                const offlineOrderId = `OFFLINE-${Date.now()}`;

                const offlineOrderData = {
                    id: offlineOrderId,
                    status: finalStatus,
                    total,
                    customer_name: finalCustomerName,
                    shift_id: shiftId || 'offline_shift',
                    store_id: user.storeId,
                    created_at: new Date().toISOString(),
                    items: cart.map(item => ({
                        product_id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity
                    })),
                    payment: finalStatus === 'paid' ? {
                        payment_method: paymentMethod,
                        amount: total
                    } : null
                };

                // Add to Retry Queue
                addToQueue({
                    type: 'ORDER',
                    data: offlineOrderData,
                    id: offlineOrderId
                });

                // Optimistic Local Stock Update (Optional: could handle via separate store slice, but for now just clear cart)
                // Note: We don't update local product list stock here because it might get out of sync. 
                // We rely on the concept that offline = optimistic.

                setLastOrderId(offlineOrderId);
                setIsPaymentSuccess(true);
                if (status !== 'pay') {
                    clearCart();
                    setCurrentOrderId(null);
                    closeCheckoutModal();
                    setCustomerName('');
                    alert('Mode Offline: Pesanan disimpan di antrian & akan diupload saat online.');
                    navigate('/orders');
                }
                return;
            }

            // ONLINE HANDLING
            let finalStatus = status;
            if (status === 'pay') finalStatus = 'paid'; // Changed from 'completed' to 'paid' to keep it in orders list
            else if (status === 'hold') finalStatus = 'cooking';
            // ... (rest of online logic)

            let currentShiftId = shiftId;
            if (!currentShiftId) {
                const { data: openShift } = await supabase
                    .from('shifts')
                    .select('id')
                    .eq('store_id', user.storeId)
                    .eq('status', 'open')
                    .single();
                if (openShift) currentShiftId = openShift.id;
            }

            const finalCustomerName = customerName.trim() || (finalStatus === 'paid' ? 'Walk-in Customer' : 'Table Order');

            let orderId = currentOrderId;

            if (orderId) {
                // UPDATE existing order
                const updateData = {
                    total,
                    customer_name: finalCustomerName,
                    shift_id: currentShiftId
                };

                if (status !== 'save') {
                    updateData.status = finalStatus;
                }

                const { error: updateError } = await supabase
                    .from('orders')
                    .update(updateData)
                    .eq('id', orderId);

                if (updateError) throw updateError;

                // Clear old items and replace
                const { error: deleteError } = await supabase
                    .from('order_items')
                    .delete()
                    .eq('order_id', orderId);

                if (deleteError) throw deleteError;
            } else {
                // CREATE new order
                const initialStatus = status === 'save' ? 'pending' : finalStatus;

                const { data: newOrder, error: insertError } = await supabase
                    .from('orders')
                    .insert([{
                        status: initialStatus,
                        total,
                        customer_name: finalCustomerName,
                        shift_id: currentShiftId,
                        store_id: user.storeId
                    }])
                    .select()
                    .single();

                if (insertError) throw insertError;
                orderId = newOrder.id;
            }

            // Save Items
            const items = cart.map(item => ({
                order_id: orderId,
                product_id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(items);

            if (itemsError) throw itemsError;

            // Update Stock if Paid or Completed
            if (finalStatus === 'completed' || finalStatus === 'paid') {
                for (const item of cart) {
                    const { data: product } = await supabase
                        .from('products')
                        .select('stock')
                        .eq('id', item.id)
                        .single();

                    if (product && product.stock !== -1) {
                        await supabase
                            .from('products')
                            .update({ stock: Math.max(0, product.stock - item.quantity) })
                            .eq('id', item.id);
                    }
                }

                // Record Transaction
                const { error: transError } = await supabase
                    .from('transactions')
                    .insert([{
                        order_id: orderId,
                        payment_method: paymentMethod,
                        amount: total,
                        shift_id: currentShiftId,
                        store_id: user.storeId
                    }]);

                if (transError) throw transError;

                setLastOrderId(orderId);
                setIsPaymentSuccess(true);
            } else {
                clearCart();
                setCurrentOrderId(null);
                closeCheckoutModal();
                setCustomerName('');
                alert('Pesanan Disimpan! Masuk ke daftar pesanan.');
                navigate('/orders');
            }
        } catch (error) {
            alert('Gagal memproses pesanan: ' + error.message);
        }
    };

    const handleCloseSuccess = () => {
        clearCart();
        setCurrentOrderId(null);
        closeCheckoutModal();
        setCustomerName('');
    };

    const sendWhatsApp = async () => {
        if (!lastOrderId) return;
        const itemsList = cart.map(item => `- ${item.name} (${item.quantity}x) ${formatRupiah(item.price * item.quantity)}`).join('\n');
        const message = `*Struk Pesanan #${lastOrderId}*\n` +
            `Pelanggan: ${customerName || 'Walk-in'}\n\n` +
            `*Detail Pesanan:*\n${itemsList}\n\n` +
            `--------------------------------\n` +
            `Total: *${formatRupiah(total)}*\n` +
            `Status: LUNAS (${paymentMethod.toUpperCase()})\n\n` +
            `Terima kasih telah berbelanja!`;

        window.open(`https://wa.me/${whatsappNumber || ''}?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <>
            <div className="block md:flex md:flex-row h-auto md:h-[calc(100vh-theme(spacing.32))] gap-6">
                {/* Product Grid (Left) */}
                <div className="order-last md:order-first w-full md:flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px] md:min-h-0 mb-6 md:mb-0">
                    {/* Filter Header */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Cari menu..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                                    !selectedCategory
                                        ? "bg-primary text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                                )}
                            >
                                Semua
                            </button>
                            {categories?.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedCategory(c.name)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                                        selectedCategory === c.name
                                            ? "bg-primary text-white"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                                    )}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grid Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 min-h-0 overflow-auto">
                            {products?.map(product => {
                                const isUnlimited = product.stock === -1;
                                const isOutOfStock = !isUnlimited && product.stock <= 0;
                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        disabled={isOutOfStock}
                                        className="relative group flex flex-col p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:shadow-md transition-all text-left"
                                    >
                                        {/* Counter Badge */}
                                        {cart.find(c => c.id === product.id) && (
                                            <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm z-10">
                                                {cart.find(c => c.id === product.id).quantity}
                                            </div>
                                        )}
                                        <div className="mb-3 w-12 h-12 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                            <span className="material-symbols-outlined">restaurant</span>
                                        </div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2 mb-1">{product.name}</h3>
                                        <div className="mt-auto flex items-center justify-between w-full">
                                            <p className="font-bold text-primary">{formatRupiah(product.price)}</p>
                                            <span className={cn(
                                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                                isOutOfStock ? "text-red-500 bg-red-100" : "text-slate-500 bg-slate-200"
                                            )}>
                                                {isUnlimited ? 'Unlimited' : (isOutOfStock ? 'Habis' : `Stok ${product.stock}`)}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Cart Sidebar (Right) */}
                <div className="order-first md:order-last w-full md:w-96 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-auto md:h-auto mb-6 md:mb-0">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-primary" />
                            {currentOrderId ? `Edit Pesanan #${currentOrderId}` : 'Pesanan Baru'} <span className="text-xs text-slate-400 ml-2">({APP_VERSION})</span>
                        </h2>
                        <button
                            onClick={handleClearCart}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Semua"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
                                <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                                <p>Keranjang kosong</p>
                                <p className="text-sm">Pilih menu di sebelah kiri</p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.id} className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-900 dark:text-white truncate">{item.name}</h4>
                                        <p className="text-primary font-medium text-sm">{formatRupiah(item.price)}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
                                            <button
                                                onClick={() => updateQuantity(item.id, -1)}
                                                className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, 1)}
                                                className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                                            {formatRupiah(item.price * item.quantity)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                <span>Subtotal</span>
                                <span>{formatRupiah(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                <span>Pajak (11%)</span>
                                <span>{formatRupiah(tax)}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-end pt-3 border-t border-slate-200 dark:border-slate-700">
                            <span className="font-bold text-slate-900 dark:text-white text-lg">Total</span>
                            <span className="font-bold text-primary text-2xl">{formatRupiah(total)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                disabled={cart.length === 0}
                                onClick={() => processOrder('hold')}
                                className="w-full bg-slate-100 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <ChefHat className="w-5 h-5" />
                                <span className="hidden sm:inline">Dapur</span>
                            </button>
                            <button
                                disabled={cart.length === 0}
                                onClick={openCheckoutModal}
                                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <CreditCard className="w-5 h-5" />
                                Bayar
                            </button>
                        </div>

                        {currentOrderId && (
                            <button
                                onClick={() => processOrder('save')}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
                            >
                                <Save className="w-5 h-5" />
                                Simpan Perubahan
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Checkout Modal */}
            {isCheckoutModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col md:flex-row max-h-[90vh]">

                        {/* Summary Left Panel */}
                        <div className="w-full md:w-1/3 bg-slate-50 dark:bg-slate-800/50 p-6 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Ringkasan</h3>
                            <div className="space-y-2 text-sm mb-6">
                                {cart.map((item, i) => (
                                    <div key={i} className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>{item.quantity}x {item.name}</span>
                                        <span className="font-medium">{formatRupiah(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                                <div className="flex justify-between font-bold text-lg text-slate-900 dark:text-white">
                                    <span>Total Tagihan</span>
                                    <span className="text-primary">{formatRupiah(total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Right Panel */}
                        <div className="flex-1 p-6 flex flex-col overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                    {isPaymentSuccess ? 'Transaksi Sukses' : 'Metode Pembayaran'}
                                </h3>
                                {!isPaymentSuccess && (
                                    <button onClick={closeCheckoutModal} className="text-slate-400 hover:text-slate-600">
                                        <X className="w-6 h-6" />
                                    </button>
                                )}
                            </div>

                            {!isPaymentSuccess ? (
                                <>
                                    <div className="mb-6">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Nama Pelanggan / Meja</label>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            placeholder="Contoh: Meja 5"
                                        />
                                    </div>

                                    {/* Payment Method Tabs */}
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <button
                                            onClick={() => setPaymentMethod('cash')}
                                            className={cn(
                                                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                                paymentMethod === 'cash'
                                                    ? "border-primary bg-primary/5 text-primary"
                                                    : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/50"
                                            )}
                                        >
                                            <Banknote className="w-6 h-6" />
                                            <span className="font-bold text-sm">Tunai</span>
                                        </button>
                                        <button
                                            onClick={() => setPaymentMethod('qris')}
                                            className={cn(
                                                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                                paymentMethod === 'qris'
                                                    ? "border-primary bg-primary/5 text-primary"
                                                    : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/50"
                                            )}
                                        >
                                            <CreditCard className="w-6 h-6" />
                                            <span className="font-bold text-sm">QRIS</span>
                                        </button>
                                    </div>

                                    {paymentMethod === 'cash' ? (
                                        <div className="space-y-4 mb-6">
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Uang Diterima</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                                                    <input
                                                        type="number"
                                                        value={cashReceived}
                                                        onChange={e => setCashReceived(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-3 text-lg font-bold rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                        placeholder="0"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "p-4 rounded-xl transition-colors",
                                                change >= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-slate-50 dark:bg-slate-800"
                                            )}>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Kembalian</p>
                                                <p className={cn(
                                                    "text-2xl font-bold",
                                                    change >= 0 ? "text-green-600 dark:text-green-400" : "text-slate-400"
                                                )}>
                                                    {formatRupiah(Math.max(0, change))}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-6">
                                            <CreditCard className="w-12 h-12 text-slate-300 mb-3" />
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Silahkan scan QRIS pada alat pembayaran...</p>
                                        </div>
                                    )}

                                    <div className="mt-auto">
                                        <button
                                            onClick={() => processOrder('pay')}
                                            disabled={!canPay}
                                            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-4 py-3 rounded-xl shadow-lg shadow-primary/25 transition-all text-center flex items-center justify-center gap-2"
                                        >
                                            <Wallet className="w-5 h-5" />
                                            <span>{paymentMethod === 'cash' ? 'Bayar & Selesai' : 'Selesai'}</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col h-full animate-in zoom-in-95 duration-200">
                                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
                                            <CheckCircle2 className="w-10 h-10" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-slate-900 dark:text-white">Pembayaran Sukses!</h4>
                                            {paymentMethod === 'cash' && (
                                                <p className="text-slate-500 font-medium">Kembalian: <span className="text-slate-900 dark:text-white font-bold">{formatRupiah(change)}</span></p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3 mt-6">
                                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <label className="text-xs font-semibold text-slate-500 block mb-1">Nomor WhatsApp Customer</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="tel"
                                                    placeholder="628123456789"
                                                    value={whatsappNumber}
                                                    onChange={(e) => setWhatsappNumber(e.target.value)}
                                                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={sendWhatsApp}
                                            className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-500/25 flex items-center justify-center gap-2"
                                        >
                                            <Share2 className="w-5 h-5" />
                                            Kirim Struk WhatsApp
                                        </button>
                                        <button
                                            onClick={() => window.print()}
                                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
                                        >
                                            <Printer className="w-5 h-5" />
                                            Cetak Struk
                                        </button>
                                        <button
                                            onClick={handleCloseSuccess}
                                            className="w-full text-slate-500 hover:text-slate-700 font-medium py-3"
                                        >
                                            Transaksi Baru
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
} {/* Start Shift Modal Removed - Now Global in DashboardLayout */ }
