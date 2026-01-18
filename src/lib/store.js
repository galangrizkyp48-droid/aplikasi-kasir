import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
    persist(
        (set) => ({
            // User State
            user: null, // { id, username, role, name, storeId }
            setUser: (user) => set({ user }),
            logout: () => set({ user: null, shiftId: null, cart: [], currentOrderId: null }),

            // Shift State
            shiftId: null,
            setShiftId: (id) => set({ shiftId: id }),

            // Cart State (for POS)
            cart: [],
            addToCart: (product) => set((state) => {
                const existing = state.cart.find((item) => item.id === product.id);
                if (existing) {
                    return {
                        cart: state.cart.map((item) =>
                            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                        ),
                    };
                }
                return { cart: [...state.cart, { ...product, quantity: 1 }] };
            }),
            removeFromCart: (productId) => set((state) => ({
                cart: state.cart.filter((item) => item.id !== productId),
            })),
            updateQuantity: (productId, delta) => set((state) => {
                const existing = state.cart.find((item) => item.id === productId);
                if (!existing) return state;

                const newQuantity = existing.quantity + delta;
                if (newQuantity <= 0) {
                    return {
                        cart: state.cart.filter((item) => item.id !== productId),
                    };
                }

                return {
                    cart: state.cart.map((item) =>
                        item.id === productId ? { ...item, quantity: newQuantity } : item
                    ),
                };
            }),
            clearCart: () => set({ cart: [] }),

            // Order State (for resuming/editing)
            currentOrderId: null,
            currentCustomerName: '', // New state for customer name persistence
            setCurrentOrderId: (id) => set({ currentOrderId: id }),
            setCustomerName: (name) => set({ currentCustomerName: name }),
            loadOrder: (orderId, items, customerName) => set({
                currentOrderId: orderId,
                currentCustomerName: customerName || '', // Store customer name
                cart: items.map(i => ({
                    id: i.id || i.productId, // Fix: Handle input having 'id' (from OrdersPage) or 'productId'
                    name: i.name, // Ensure name is passed
                    price: i.price,
                    quantity: i.quantity,
                }))
            }),

            // UI State
            isLoading: false,
            setLoading: (isLoading) => set({ isLoading }),

            // Global Checkout Modal State
            isCheckoutModalOpen: false,
            openCheckoutModal: () => set({ isCheckoutModalOpen: true }),
            closeCheckoutModal: () => set({ isCheckoutModalOpen: false }),
        }),
        {
            name: 'pos-storage', // unique name
            partialize: (state) => ({
                user: state.user,
                shiftId: state.shiftId,
                cart: state.cart,
                currentOrderId: state.currentOrderId,
                currentCustomerName: state.currentCustomerName
            }), // Only persist these fields
        }
    )
);
