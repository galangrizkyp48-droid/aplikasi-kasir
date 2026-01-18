import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatRupiah, cn } from '../../lib/utils';
import { Clock, ChefHat, CheckCircle2, PackageCheck, X, Wallet, CreditCard, Banknote, Edit2, Share2, Printer, ArrowLeftRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../lib/store';

export default function OrdersPage() {
    const { user, loadOrder, shiftId } = useStore();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [itemsToSplit, setItemsToSplit] = useState(new Set());
    const [isSplitting, setIsSplitting] = useState(false);
    const [splitCustomerName, setSplitCustomerName] = useState('');

    const [orderItems, setOrderItems] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [cashReceived, setCashReceived] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [showReceipt, setShowReceipt] = useState(false);

    // Merge States
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [targetMergeOrder, setTargetMergeOrder] = useState(null);
    const [isMerging, setIsMerging] = useState(false);

    const navigate = useNavigate();

    const fetchOrders = async () => {
        if (!user?.storeId || !shiftId) return;
        setIsLoading(true);
        console.log('Fetching orders for shift:', shiftId);

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('store_id', user.storeId)
            .eq('shift_id', shiftId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching orders:', error);
        } else {
            console.log('Orders fetched:', data?.length);
            setOrders(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (!user?.storeId || !shiftId) return;

        fetchOrders();

        const channel = supabase
            .channel('orders_channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${user.storeId}` },
                (payload) => {
                    console.log('Realtime update:', payload);
                    if (payload.event === 'INSERT') {
                        setOrders(prev => [payload.new, ...prev]);
                    } else if (payload.event === 'UPDATE') {
                        setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o));
                    } else if (payload.event === 'DELETE') {
                        setOrders(prev => prev.filter(o => o.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.storeId, shiftId]);

    const handleResumeOrder = async (order) => {
        const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);

        if (items) {
            const mappedItems = items.map(it => ({
                id: it.product_id,
                name: it.name,
                price: it.price,
                quantity: it.quantity
            }));
            loadOrder(order.id, mappedItems, order.customer_name);
            navigate('/pos');
        }
    };

    useEffect(() => {
        const loadItems = async () => {
            if (selectedOrder) {
                const { data: items } = await supabase
                    .from('order_items')
                    .select('*')
                    .eq('order_id', selectedOrder.id);

                if (items) setOrderItems(items);
                setPaymentMethod('cash');
                setCashReceived('');
                setCustomerName(selectedOrder.customer_name || 'Guest');
                setShowReceipt(false);
            } else {
                setOrderItems([]);
            }
        };
        loadItems();
    }, [selectedOrder]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'cooking': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'ready': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'completed': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return Clock;
            case 'cooking': return ChefHat;
            case 'ready': return CheckCircle2;
            case 'paid': return Wallet;
            case 'completed': return PackageCheck;
            default: return Clock;
        }
    };

    const updateStatus = async (id, newStatus) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            alert('Gagal update status: ' + error.message);
        } else {
            fetchOrders();
        }
    };

    const handleDeleteOrder = async (order) => {
        if (!window.confirm(`Hapus pesanan #${order.id} atas nama ${order.customer_name}?`)) return;

        try {
            // Delete Order Items first (Cascade usually handles this, but safe to be explicit if needed, though schema has CASCADE)
            // Schema has ON DELETE CASCADE for order_items, so just deleting order is enough.
            const { error } = await supabase
                .from('orders')
                .delete()
                .eq('id', order.id);

            if (error) throw error;

            setOrders(prev => prev.filter(o => o.id !== order.id));
            alert('Pesanan dihapus.');
        } catch (error) {
            console.error('Delete error:', error);
            alert('Gagal menghapus pesanan: ' + error.message);
        }
    };

    const handleMarkAsPaid = async (order) => {
        // Removed confirmation for faster POS workflow

        try {
            // 1. Fetch Order Items to deduct stock
            const { data: items, error: fetchError } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', order.id);

            if (fetchError) throw fetchError;

            // 2. Update Stock
            for (const item of items) {
                const { data: product } = await supabase
                    .from('products')
                    .select('stock')
                    .eq('id', item.product_id)
                    .single();

                if (product && product.stock !== -1) {
                    await supabase
                        .from('products')
                        .update({ stock: Math.max(0, product.stock - item.quantity) })
                        .eq('id', item.product_id);
                }
            }

            // 3. Record Transaction
            const { error: transError } = await supabase
                .from('transactions')
                .insert([{
                    order_id: order.id,
                    payment_method: 'cash', // Defaulting to cash for 'Quick Pay' in Orders Page
                    amount: order.total,
                    shift_id: order.shift_id,
                    store_id: user.storeId
                }]);

            if (transError) throw transError;

            // 4. Update Order Status
            await updateStatus(order.id, 'paid');

            // Optimistic Update
            setOrders(prev => prev.map(o => o.id == order.id ? { ...o, status: 'paid' } : o));
            setSelectedOrder(null); // Close any open details

            alert('Pembayaran berhasil dicatat!');

        } catch (error) {
            console.error('Payment Error:', error);
            alert('Gagal memproses pembayaran: ' + error.message);
        }
    };

    const sendWhatsApp = () => {
        if (!selectedOrder) return;

        const itemsList = orderItems.map(item => `- ${item.name} (${item.quantity}x) ${formatRupiah(item.price * item.quantity)}`).join('%0A');
        let message = `*Struk Pembayaran - POS UMKM*%0A%0A` +
            `*Struk Pesanan #${selectedOrder.id}*%0A` +
            `Pelanggan: ${customerName}%0A%0A` +
            `*Detail Pesanan:*%0A${itemsList}%0A%0A` +
            `--------------------------------%0A` +
            `Total: *${formatRupiah(selectedOrder.total)}*%0A` +
            `Status: LUNAS (${paymentMethod.toUpperCase()})%0A%0A` +
            `Status: LUNAS (${paymentMethod.toUpperCase()})%0A%0A`;

        if (user?.plan_type === 'free') {
            message += `_Powered by Aplikasi Kasir Galang_%0A`;
        }

        message += `Terima kasih telah berbelanja!`;

        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    const change = paymentMethod === 'cash' && cashReceived ? Number(cashReceived) - selectedOrder?.total : 0;
    const canPay = paymentMethod === 'qris' || (paymentMethod === 'cash' && Number(cashReceived) >= selectedOrder?.total);

    const toggleSplitItem = (itemId) => {
        const newSet = new Set(itemsToSplit);
        if (newSet.has(itemId)) {
            newSet.delete(itemId);
        } else {
            newSet.add(itemId);
        }
        setItemsToSplit(newSet);
    };

    const handleSplitOrder = async () => {
        if (!selectedOrder || itemsToSplit.size === 0) return;
        setIsSplitting(true);

        try {
            const itemsToMove = orderItems.filter(item => itemsToSplit.has(item.id));
            const itemsToKeep = orderItems.filter(item => !itemsToSplit.has(item.id));

            if (itemsToKeep.length === 0) {
                alert("Tidak bisa memindahkan semua item. Gunakan fitur edit atau hapus pesanan.");
                setIsSplitting(false);
                return;
            }

            const newTotal = itemsToMove.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const newTax = newTotal * 0.11;
            const newFinalTotal = newTotal + newTax;

            const oldTotal = itemsToKeep.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const oldTax = oldTotal * 0.11;
            const oldFinalTotal = oldTotal + oldTax;

            // Create New Order
            const { data: newOrder, error: createError } = await supabase
                .from('orders')
                .insert([{
                    store_id: user.storeId,
                    shift_id: selectedOrder.shift_id,
                    customer_name: splitCustomerName || `${selectedOrder.customer_name} (Split)`,
                    status: selectedOrder.status === 'paid' ? 'pending' : selectedOrder.status,
                    total: newFinalTotal
                }])
                .select()
                .single();

            if (createError) throw createError;

            // Move items
            const { error: moveError } = await supabase
                .from('order_items')
                .update({ order_id: newOrder.id })
                .in('id', Array.from(itemsToSplit));

            if (moveError) throw moveError;

            // Update Old Order
            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    total: oldFinalTotal
                })
                .eq('id', selectedOrder.id);

            if (updateError) throw updateError;

            alert('Pesanan berhasil dipisah!');
            setShowSplitModal(false);
            setItemsToSplit(new Set());
            setSelectedOrder(null);
            setSplitCustomerName('');
            fetchOrders();

        } catch (error) {
            console.error('Split error:', error);
            alert('Gagal memisah pesanan: ' + error.message);
        } finally {
            setIsSplitting(false);
        }
    };

    const handleMergeOrder = async () => {
        if (!selectedOrder || !targetMergeOrder) return;
        setIsMerging(true);

        try {
            const { error: moveError } = await supabase
                .from('order_items')
                .update({ order_id: targetMergeOrder.id })
                .eq('order_id', selectedOrder.id);

            if (moveError) throw moveError;

            // Recalculate target order total
            const { data: newTargetItems } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', targetMergeOrder.id);

            const newTotal = newTargetItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const newTax = newTotal * 0.11;
            const newFinalTotal = newTotal + newTax;

            // Update Target Order
            await supabase
                .from('orders')
                .update({
                    total: newFinalTotal
                })
                .eq('id', targetMergeOrder.id);

            // Delete Source Order
            const { error: deleteError } = await supabase
                .from('orders')
                .delete()
                .eq('id', selectedOrder.id);

            if (deleteError) throw deleteError;

            alert('Pesanan berhasil digabung!');
            setShowMergeModal(false);
            setTargetMergeOrder(null);
            setSelectedOrder(null);
            fetchOrders();

        } catch (error) {
            console.error('Merge error:', error);
            alert('Gagal menggabung pesanan: ' + error.message);
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Daftar Pesanan</h1>
                <p className="text-slate-500 dark:text-slate-400">Pantau status pesanan dapur dan kasir</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {orders?.map((order) => {
                    const StatusIcon = getStatusIcon(order.status);
                    return (
                        <div key={order.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-lg text-slate-900 dark:text-white">#{order.id}</span>
                                        <span className="text-sm text-slate-500">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{order.customer_name}</p>
                                </div>
                                <span className={cn("px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5", getStatusColor(order.status))}>
                                    <StatusIcon className="w-4 h-4" />
                                    {order.status.toUpperCase()}
                                </span>
                            </div>

                            <div className="p-4 flex-1">
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-slate-600 dark:text-slate-400">
                                        {order.item_count ? `${order.item_count} Item` : 'Detail Item'}
                                    </span>
                                    <span className="text-slate-900 dark:text-white">{formatRupiah(order.total)}</span>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2">
                                {['pending', 'cooking', 'ready'].includes(order.status) && (
                                    <>
                                        <button
                                            onClick={() => handleResumeOrder(order)}
                                            className="col-span-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteOrder(order)}
                                            className="col-span-1 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Hapus
                                        </button>
                                        <div className="col-span-2 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setItemsToSplit(new Set());
                                                    setSplitCustomerName('');
                                                    setShowSplitModal(true);
                                                }}
                                                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1"
                                                title="Pisah Pesanan"
                                            >
                                                <Share2 className="w-4 h-4 rotate-90" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setTargetMergeOrder(null);
                                                    setShowMergeModal(true);
                                                }}
                                                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1"
                                                title="Gabung Pesanan"
                                            >
                                                <ArrowLeftRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                )}

                                {order.status === 'pending' && (
                                    <button
                                        onClick={() => updateStatus(order.id, 'cooking')}
                                        className="col-span-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors"
                                    >
                                        Mulai Masak
                                    </button>
                                )}
                                {order.status === 'cooking' && (
                                    <button
                                        onClick={() => updateStatus(order.id, 'ready')}
                                        className="col-span-2 w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-colors"
                                    >
                                        Pesanan Siap
                                    </button>
                                )}
                                {order.status === 'ready' && (
                                    <button
                                        onClick={() => handleResumeOrder(order)}
                                        className="col-span-2 w-full py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Wallet className="w-4 h-4" />
                                        Bayar Sekarang / Lihat Bill
                                    </button>
                                )}
                                {(order.status === 'paid' || order.status === 'completed') && (
                                    <>
                                        {order.status === 'paid' && (
                                            <button
                                                onClick={() => updateStatus(order.id, 'completed')}
                                                className="col-span-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Selesai / Sudah Diambil
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setShowReceipt(true);
                                            }}
                                            className="col-span-2 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Printer className="w-4 h-4" />
                                            Lihat Struk
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Receipt Modal */}
            {selectedOrder && showReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-6 flex flex-col overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                    <PackageCheck className="w-5 h-5 text-primary" />
                                    Struk Pembayaran #{selectedOrder.id}
                                </h3>
                                <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 scrollbar-thin">
                                {orderItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                                            <p className="text-slate-500 text-xs">{item.quantity} x {formatRupiah(item.price)}</p>
                                        </div>
                                        <p className="font-medium text-slate-700 dark:text-slate-300">
                                            {formatRupiah(item.price * item.quantity)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2 text-sm">
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Subtotal</span>
                                    <span>{formatRupiah(selectedOrder.total / 1.11)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Pajak (11%)</span>
                                    <span>{formatRupiah(selectedOrder.total - (selectedOrder.total / 1.11))}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <span className="font-bold text-lg text-slate-900 dark:text-white">Total</span>
                                    <span className="font-bold text-xl text-primary">{formatRupiah(selectedOrder.total)}</span>
                                </div>
                            </div>

                            <div className="space-y-3 mt-6">
                                {user?.plan_type === 'free' && (
                                    <div className="mb-4 pt-2 border-t border-dashed border-slate-300 dark:border-slate-700 text-center">
                                        <p className="text-xs text-slate-400 italic">Powered by Aplikasi Kasir Galang</p>
                                    </div>
                                )}
                                <button
                                    onClick={sendWhatsApp}
                                    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <Share2 className="w-5 h-5" />
                                    Kirim Struk WhatsApp
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-5 h-5" />
                                    Cetak Struk
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Split Order Modal */}
            {selectedOrder && showSplitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Pisah Pesanan #{selectedOrder.id}</h3>
                            <button onClick={() => setShowSplitModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Nama Pesanan Baru (Opsional)
                                </label>
                                <input
                                    type="text"
                                    placeholder={`Contoh: ${selectedOrder?.customer_name} (Meja 2)`}
                                    value={splitCustomerName}
                                    onChange={(e) => setSplitCustomerName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>

                            <p className="text-sm text-slate-500 mb-4">Pilih item yang ingin dipindahkan ke pesanan baru:</p>
                            <div className="space-y-3">
                                {orderItems.map((item) => (
                                    <label key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={itemsToSplit.has(item.id)}
                                            onChange={() => toggleSplitItem(item.id)}
                                            className="mt-1 w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary"
                                        />
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <span className="font-medium text-slate-900 dark:text-white">{item.name}</span>
                                                <span className="text-slate-500">{formatRupiah(item.price * item.quantity)}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                Quantity: {item.quantity}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <div className="mb-4 flex justify-between items-center text-sm">
                                <span className="text-slate-600">Total Item Dipindah:</span>
                                <span className="font-bold text-primary">
                                    {formatRupiah(
                                        orderItems.filter(i => itemsToSplit.has(i.id))
                                            .reduce((sum, i) => sum + (i.price * i.quantity), 0)
                                    )}
                                </span>
                            </div>
                            <button
                                onClick={handleSplitOrder}
                                disabled={isSplitting || itemsToSplit.size === 0}
                                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/25 transition-all"
                            >
                                {isSplitting ? 'Memproses...' : 'Proses Pisah Pesanan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Merge Order Modal */}
            {selectedOrder && showMergeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Gabung Pesanan #{selectedOrder.id}</h3>
                            <button onClick={() => setShowMergeModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            <p className="text-sm text-slate-500 mb-4">Pilih pesanan tujuan penggabungan:</p>
                            <div className="space-y-3">
                                {orders
                                    .filter(o => o.id !== selectedOrder.id && ['pending', 'cooking', 'ready', 'paid'].includes(o.status))
                                    .map((order) => (
                                        <label key={order.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <input
                                                type="radio"
                                                name="targetOrder"
                                                checked={targetMergeOrder?.id === order.id}
                                                onChange={() => setTargetMergeOrder(order)}
                                                className="w-4 h-4 text-primary border-slate-300 focus:ring-primary"
                                            />
                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <span className="font-medium text-slate-900 dark:text-white">#{order.id} - {order.customer_name}</span>
                                                    <span className="text-slate-500">{formatRupiah(order.total)}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">
                                                    Status: {order.status}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                {orders.filter(o => o.id !== selectedOrder.id && ['pending', 'cooking', 'ready', 'paid'].includes(o.status)).length === 0 && (
                                    <p className="text-center text-slate-500 py-4">Tidak ada pesanan lain yang aktif.</p>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <button
                                onClick={handleMergeOrder}
                                disabled={isMerging || !targetMergeOrder}
                                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/25 transition-all"
                            >
                                {isMerging ? 'Memproses...' : 'Proses Gabung Pesanan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
