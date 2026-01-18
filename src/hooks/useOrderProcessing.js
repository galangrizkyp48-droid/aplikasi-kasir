import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

export const useOrderProcessing = () => {
    const {
        user,
        shiftId,
        cart,
        currentOrderId,
        setCurrentOrderId,
        clearCart,
        closeCheckoutModal,
        addToQueue
    } = useStore();

    const processOrder = async ({
        status,
        total,
        customerName,
        paymentMethod = 'cash',
        setLastOrderId = () => { },
        setIsPaymentSuccess = () => { },
        navigate
    }) => {
        try {
            let finalStatus = status;
            if (status === 'pay') finalStatus = 'paid';
            else if (status === 'hold') finalStatus = 'cooking';

            const finalCustomerName = (customerName || '').trim() || (finalStatus === 'paid' ? 'Walk-in Customer' : 'Table Order');

            // --- OFFLINE HANDLING ---
            if (!navigator.onLine) {
                const tempId = currentOrderId || `offline_${Date.now()}`;

                const offlineOrder = {
                    id: tempId,
                    created_at: new Date().toISOString(),
                    status: status === 'save' ? 'pending' : finalStatus,
                    total,
                    customer_name: finalCustomerName,
                    shift_id: shiftId || 'offline_shift',
                    store_id: user?.storeId,
                    items: cart.map(item => ({
                        product_id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity
                    })),
                    payment: (finalStatus === 'paid' || finalStatus === 'completed') ? {
                        payment_method: paymentMethod,
                        amount: total
                    } : null
                };

                addToQueue({
                    id: tempId,
                    type: 'ORDER',
                    data: offlineOrder
                });

                // Offline Success Handling
                if (finalStatus === 'paid' || finalStatus === 'completed') {
                    setLastOrderId(tempId);
                    setIsPaymentSuccess(true);
                } else {
                    clearCart();
                    setCurrentOrderId(null);
                    closeCheckoutModal();
                    useStore.getState().setCustomerName('');
                    alert('Mode Offline: Pesanan disimpan di perangkat!');
                    if (navigate) navigate('/orders');
                }
                return;
            }

            // --- ONLINE HANDLING (Original Logic) ---
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

            let orderId = currentOrderId;

            if (orderId && !orderId.startsWith('offline_')) {
                // UPDATE
                const updateData = {
                    total,
                    customer_name: finalCustomerName,
                    shift_id: currentShiftId
                };
                if (status !== 'save') updateData.status = finalStatus;

                const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);
                if (error) throw error;

                // Replace items
                await supabase.from('order_items').delete().eq('order_id', orderId);
            } else {
                // CREATE or Update Offline ID to Real ID (if we were sync, but here we assume clean slate or only online IDs if connected)
                // Actually if orderId starts with offline_, we should treat it as new insert in DB, but we need to handle that mapping. 
                // Simpler: Just always insert new if it was offline ID, or handle it. 
                // For now, let's treat it as new insert if not found.

                const initialStatus = status === 'save' ? 'pending' : finalStatus;
                const { data: newOrder, error } = await supabase
                    .from('orders')
                    .insert([{
                        status: initialStatus,
                        total,
                        customer_name: finalCustomerName,
                        shift_id: currentShiftId,
                        store_id: user.storeId
                    }])
                    .select().single();
                if (error) throw error;
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

            const { error: itemsError } = await supabase.from('order_items').insert(items);
            if (itemsError) throw itemsError;

            // Handle Payment / Stock
            if (finalStatus === 'paid' || finalStatus === 'completed') {
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

                await supabase.from('transactions').insert([{
                    order_id: orderId,
                    payment_method: paymentMethod,
                    amount: total,
                    shift_id: currentShiftId,
                    store_id: user.storeId
                }]);

                setLastOrderId(orderId);
                setIsPaymentSuccess(true);
            } else {
                // For Hold/Save
                clearCart();
                setCurrentOrderId(null);
                closeCheckoutModal();
                useStore.getState().setCustomerName(''); // Clear global name
                alert('Pesanan Disimpan!');
                if (navigate) navigate('/orders');
            }

        } catch (error) {
            console.error(error);
            alert('Gagal memproses pesanan: ' + error.message);
        }
    };

    return { processOrder };
};
