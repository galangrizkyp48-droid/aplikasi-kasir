import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase credentials missing. Please check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const seedDatabase = async (targetStoreId) => {
    if (!targetStoreId) return;

    // Seed initial categories for this store in Supabase
    try {
        const { data: existing } = await supabase
            .from('categories')
            .select('id')
            .eq('store_id', targetStoreId)
            .limit(1);

        if (!existing || existing.length === 0) {
            await supabase.from('categories').insert([
                { name: 'Minuman', store_id: targetStoreId },
                { name: 'Makanan', store_id: targetStoreId },
                { name: 'Snack', store_id: targetStoreId }
            ]);
        }
    } catch (error) {
        console.error('Seeding error:', error);
    }
};
