-- Script to Seed Initial Categories for 'admin' user

DO $$
DECLARE
    target_store_id TEXT;
BEGIN
    -- 1. Find the store_id for the username 'admin'
    SELECT store_id INTO target_store_id FROM users WHERE username = 'admin' LIMIT 1;

    IF target_store_id IS NOT NULL THEN
        -- 2. Insert 'Minuman' if not exists
        INSERT INTO categories (name, store_id)
        SELECT 'Minuman', target_store_id
        WHERE NOT EXISTS (SELECT 1 FROM categories WHERE store_id = target_store_id AND name = 'Minuman');

        -- 3. Insert 'Makanan' if not exists
        INSERT INTO categories (name, store_id)
        SELECT 'Makanan', target_store_id
        WHERE NOT EXISTS (SELECT 1 FROM categories WHERE store_id = target_store_id AND name = 'Makanan');
        
        -- 4. Insert 'Snack' if not exists
        INSERT INTO categories (name, store_id)
        SELECT 'Snack', target_store_id
        WHERE NOT EXISTS (SELECT 1 FROM categories WHERE store_id = target_store_id AND name = 'Snack');
        
        RAISE NOTICE 'Categories seeded for store %', target_store_id;
    ELSE
        RAISE NOTICE 'User admin not found';
    END IF;
END $$;
