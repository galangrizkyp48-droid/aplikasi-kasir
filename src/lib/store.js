import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
    persist(
        (set) => ({
            // User State
            user: null, // { id, username, role, name, storeId }
            setUser: (user) => set({ user }),
            logout: () => set({ user: null, shiftId: null, cart: [], currentOrderId: null }),
            isSuperAdmin: () => {
                const state = useStore.getState();
                return state.user?.username === 'galang'; // Super admin username
                return state.user?.username === 'galang'; // Super admin username
            },

            // Offline Auth
            savedUsers: [], // [{ username, password, name, role, storeId, ... }]
            saveUserCredential: (userData, password) => set((state) => {
                const existingIndex = state.savedUsers.findIndex(u => u.username === userData.username);
                const newUser = { ...userData, password, lastLogin: new Date().toISOString() };

                let newSavedUsers;
                if (existingIndex >= 0) {
                    newSavedUsers = [...state.savedUsers];
                    newSavedUsers[existingIndex] = newUser;
                } else {
                    newSavedUsers = [...state.savedUsers, newUser];
                }
                return { savedUsers: newSavedUsers };
            }),
            verifyOfflineLogin: (username, password) => {
                const state = useStore.getState();
                const user = state.savedUsers.find(u => u.username === username);
                if (user && user.password === password) {
                    return user;
                }
                return null;
            },

            // Theme State
            theme: 'light',
            toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

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

            // Offline Support
            isOffline: false,
            setOfflineStatus: (status) => set({ isOffline: status }),

            products: [], // Cached products
            setProducts: (products) => set({ products }),

            categories: [], // Cached categories
            setCategories: (categories) => set({ categories }),

            offlineQueue: [], // Array of { type: 'order'|'expense', data: any, id: string }
            addToQueue: (item) => set((state) => ({ offlineQueue: [...state.offlineQueue, item] })),
            removeFromQueue: (id) => set((state) => ({ offlineQueue: state.offlineQueue.filter(i => i.id !== id) })),
            clearQueue: () => set({ offlineQueue: [] }),
        }),
        {
            name: 'pos-storage', // unique name
            partialize: (state) => ({
                user: state.user,
                theme: state.theme,
                shiftId: state.shiftId,
                cart: state.cart,
                currentOrderId: state.currentOrderId,
                currentCustomerName: state.currentCustomerName,
                products: state.products,
                categories: state.categories,
                products: state.products,
                categories: state.categories,
                offlineQueue: state.offlineQueue,
                savedUsers: state.savedUsers // Persist offline credentials
            }), // Only persist these fields
        }
    )
);
