import { supabase } from './supabase';

export const SUBSCRIPTION_PLANS = {
    FREE: {
        id: 'free',
        name: 'Basic (Gratis)',
        price: 0,
        features: [
            'Basic POS',
            'Laporan (3 Hari Terakhir)',
            'Maksimal 1 User (Owner)',
            'Watermark Struk'
        ]
    },
    PRO: {
        id: 'pro',
        name: 'Professional',
        price: 50000,
        duration_days: 30,
        features: [
            'Unlimited POS',
            'Laporan Lengkap (Unlimited)',
            'Unlimited Staff',
            'Tanpa Watermark',
            'Export Data Excel',
            'Prioritas Support'
        ]
    }
};

export const MOCK_PAYMENT_GATEWAY = {
    // Simulate DANA Payment
    initiatePayment: async (amount, user) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    transactionId: `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    message: 'Payment Initiated'
                });
            }, 1500);
        });
    },

    // Simulate Check Status (Success)
    checkStatus: async (transactionId) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ status: 'success' });
            }, 2000);
        });
    }
};

export const upgradeUserToPro = async (userId, storeId) => {
    try {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30); // Add 30 days

        // 1. Record Transaction
        const { error: trxError } = await supabase
            .from('subscription_transactions')
            .insert([{
                user_id: userId,
                store_id: storeId,
                amount: 50000,
                status: 'success',
                payment_method: 'dana_mock',
                ref_number: `AUTO-${Date.now()}`
            }]);

        if (trxError) throw trxError;

        // 2. Update User Profile
        const { error: userError } = await supabase
            .from('users')
            .update({
                plan_type: 'pro',
                subscription_end: endDate.toISOString(),
                max_staff: 99, // Unlimited logic
                status: 'active'
            })
            .eq('id', userId);

        if (userError) throw userError;

        return { success: true };
    } catch (error) {
        console.error('Upgrade Error:', error);
        return { success: false, error };
    }
};

export const checkSubscriptionStatus = (user) => {
    if (!user || user.plan_type !== 'pro') return 'free';

    const now = new Date();
    const end = new Date(user.subscription_end);

    if (now > end) return 'expired';
    return 'pro';
};
