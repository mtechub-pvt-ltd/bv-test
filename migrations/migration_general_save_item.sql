CREATE TABLE IF NOT EXISTS public.general_save_item (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    item_id INT NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_item_module UNIQUE (user_id, item_id, module_name)
);
