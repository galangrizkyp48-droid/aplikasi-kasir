import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { formatRupiah, cn } from '../../lib/utils';
import { Clock, ChefHat, CheckCircle2, PackageCheck, X, Wallet, CreditCard, Banknote, Edit2, Share2, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../lib/store';

export default function OrdersPage() {
    const orders = useLiveQuery(() =>
        db.orders.orderBy('createdAt').reverse().toArray()
    );

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [cashReceived, setCashReceived] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [showReceipt, setShowReceipt] = useState(false);

    // Hooks
    const { loadOrder } = useStore(); // Ensure this action exists in store
    const navigate = useNavigate();

    const handleResumeOrder = async (order) => {
        // Fetch items for this order
        const items = await db.orderItems.where('orderId').equals(order.id).toArray();
        // Load into POS Store
        // Load into POS Store
        loadOrder(order.id, items, order.customerName);
        // Navigate to POS
        navigate('/pos');
    };

    // Fetch items when order is selected for payment
    useEffect(() => {
        if (selectedOrder) {
            db.orderItems.where('orderId').equals(selectedOrder.id).toArray()
                .then(items => setOrderItems(items));
            setPaymentMethod('cash');
            setCashReceived('');
            setCustomerName(selectedOrder.customerName || 'Guest');
            setShowReceipt(false);
        } else {
            setOrderItems([]);
        }
    }, [selectedOrder]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'cooking': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'ready': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'completed': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return Clock;
            case 'cooking': return ChefHat;
            case 'ready': return CheckCircle2;
            case 'completed': return PackageCheck;
            default: return Clock;
        }
    };

    const updateStatus = async (id, newStatus) => {
        if (newStatus === 'completed') {
            const order = orders.find(o => o.id === id);
            setSelectedOrder(order);
        } else {
            await db.orders.update(id, { status: newStatus });
        }
    };



    const sendWhatsApp = () => {
        if (!selectedOrder) return;

        const itemsList = orderItems.map(item => `- ${item.name} (${item.quantity}x) ${formatRupiah(item.price * item.quantity)}`).join('%0A');
        const message = `*Struk Pesanan #${selectedOrder.id}*%0A` +
            `Pelanggan: ${customerName}%0A%0A` +
            `*Detail Pesanan:*%0A${itemsList}%0A%0A` +
            `--------------------------------%0A` +
            `Total: *${formatRupiah(selectedOrder.total)}*%0A` +
            `Status: LUNAS (${paymentMethod.toUpperCase()})%0A%0A` +
            `Terima kasih telah berbelanja!`;

        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    const change = paymentMethod === 'cash' && cashReceived ? Number(cashReceived) - selectedOrder?.total : 0;
    const canPay = paymentMethod === 'qris' || (paymentMethod === 'cash' && Number(cashReceived) >= selectedOrder?.total);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Daftar Pesanan</h1>
                <p className="text-slate-500 dark:text-slate-400">Pantau status pesanan dapur dan kasir</p>
            </div>



            {/* ... existing header ... */}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {orders?.map((order) => {
                    const StatusIcon = getStatusIcon(order.status);
                    return (
                        <div key={order.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                            {/* ... existing card header ... */}
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-lg text-slate-900 dark:text-white">#{order.id}</span>
                                        <span className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{order.customerName}</p>
                                </div>
                                <span className={cn("px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5", getStatusColor(order.status))}>
                                    <StatusIcon className="w-4 h-4" />
                                    {order.status.toUpperCase()}
                                </span>
                            </div>

                            <div className="p-4 flex-1">
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-slate-600 dark:text-slate-400">{order.itemCount} Item</span>
                                    <span className="text-slate-900 dark:text-white">{formatRupiah(order.total)}</span>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2">
                                {['pending', 'cooking', 'ready'].includes(order.status) && (
                                    <button
                                        onClick={() => handleResumeOrder(order)}
                                        className="col-span-2 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        Edit Pesanan
                                    </button>
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
                                        Bayar di Kasir
                                    </button>
                                )}
                                {order.status === 'completed' && (
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
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Keeping the Receipt Modal for 'Lihat Struk' but NOT for payment anymore */}
            {/* Payment / Receipt Modal */}
            {/* Receipt Modal (View Only) */}
            {selectedOrder && showReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        {/* Receipt/Summary View */}
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
                                    <span>{formatRupiah(selectedOrder.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Pajak (11%)</span>
                                    <span>{formatRupiah(selectedOrder.tax)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <span className="font-bold text-lg text-slate-900 dark:text-white">Total</span>
                                    <span className="font-bold text-xl text-primary">{formatRupiah(selectedOrder.total)}</span>
                                </div>
                            </div>

                            <div className="space-y-3 mt-6">
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
        </div>

    );
}
