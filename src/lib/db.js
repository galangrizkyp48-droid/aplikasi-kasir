import Dexie from 'dexie';

export const db = new Dexie('POS_DB');

db.version(1).stores({
    users: '++id, username, role, pin', // role: 'owner', 'cashier', 'kitchen'
    products: '++id, name, category, barcode, stock',
    categories: '++id, name',
    orders: '++id, status, createdAt, customerId', // status: 'pending', 'processing', 'completed', 'cancelled'
    orderItems: '++id, orderId, productId',
    customers: '++id, phone, name',
    transactions: '++id, orderId, paymentMethod, amount, timestamp',
    settings: 'key, value'
});

// Version 2 (Existing)
db.version(2).stores({
    transactions: '++id, orderId, paymentMethod, amount, timestamp, shiftId',
    shifts: '++id, startTime, endTime, cashierId, status'
});

// Version 3: Shopping Lists
db.version(3).stores({
    shoppingLists: '++id, title, date, status, totalEstimated'
});

// Version 4: Shopping Items Catalog
db.version(4).stores({
    shoppingItems: '++id, name, price, unit' // Persistent items for shopping
});

// Version 5: Link orders to shifts for dashboard filtering
// Version 5: Link orders to shifts for dashboard filtering
db.version(5).stores({
    orders: '++id, status, createdAt, customerId, shiftId'
});

// Version 6: Multi-Tenancy (Store Isolation)
db.version(6).stores({
    users: '++id, username, role, pin, storeId',
    products: '++id, name, category, barcode, stock, storeId',
    categories: '++id, name, storeId',
    orders: '++id, status, createdAt, customerId, shiftId, storeId',
    orderItems: '++id, orderId, productId', // Linked by orderId which has storeId
    customers: '++id, phone, name, storeId',
    transactions: '++id, orderId, paymentMethod, amount, timestamp, shiftId, storeId',
    shifts: '++id, startTime, endTime, cashierId, status, storeId',
    shoppingLists: '++id, title, date, status, totalEstimated, storeId',
    shoppingItems: '++id, name, price, unit, storeId',
    settings: '++id, key, value, storeId, [storeId+key]' // Compound index for fast lookup
});

export const seedDatabase = async (targetStoreId) => {
    if (!targetStoreId) return; // Only seed if storeId is provided (e.g. on registration)

    // Seed initial categories for this store
    const categoryCount = await db.categories.where('storeId').equals(targetStoreId).count();
    if (categoryCount === 0) {
        await db.categories.bulkAdd([
            { name: 'Minuman', storeId: targetStoreId },
            { name: 'Makanan', storeId: targetStoreId },
            { name: 'Snack', storeId: targetStoreId }
        ]);
    }
};
