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
        closeCheckoutModal
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

            const finalCustomerName = (customerName || '').trim() || (finalStatus === 'paid' ? 'Walk-in Customer' : 'Table Order');

            let orderId = currentOrderId;

            if (orderId) {
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
                // CREATE
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
