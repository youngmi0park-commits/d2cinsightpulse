-- Fix S95AR category from Soundbar to Audio
UPDATE products SET category = 'Audio', display_name = 'LG Soundbar S95AR 9.1.5ch Dolby Atmos' WHERE id = '246d6c66-9043-4bad-80c7-95ee6688d797';

-- Remove the duplicate S95AR that was inserted by the migration (Audio category)
DELETE FROM products WHERE model_number = 'S95AR' AND category = 'Audio' AND id != '246d6c66-9043-4bad-80c7-95ee6688d797';