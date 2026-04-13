-- 1. Fix Washers misclassified as Monitor (WM* and WT* display names)
UPDATE products SET category = 'Washer'
WHERE category = 'Monitor' AND (display_name ~ '^WM\d' OR display_name ~ '^WT\d');

-- 2. Fix TVs misclassified as Monitor
UPDATE products SET category = 'TV'
WHERE category = 'Monitor' AND (
  display_name ILIKE '%Smart TV%' 
  OR (display_name ILIKE '%OLED evo%' AND display_name NOT ILIKE '%monitor%')
  OR (display_name ILIKE '%OLED Flex%' AND display_name NOT ILIKE '%monitor%')
  OR model_number LIKE 'OLED%C%PUA'
);

-- 3. Auto-populate sub_category for Monitor products
UPDATE products SET sub_category = 'UltraGear'
WHERE category = 'Monitor' AND sub_category IS NULL 
  AND (display_name ILIKE '%UltraGear%' OR model_number ~ '^\d+G[XSPQN]\d');

UPDATE products SET sub_category = 'UltraFine'
WHERE category = 'Monitor' AND sub_category IS NULL 
  AND display_name ILIKE '%UltraFine%';

UPDATE products SET sub_category = 'UltraWide'
WHERE category = 'Monitor' AND sub_category IS NULL 
  AND (display_name ILIKE '%UltraWide%' OR display_name ILIKE '%21:9%' OR display_name ILIKE '%ultrawide%');

UPDATE products SET sub_category = 'Smart Monitor'
WHERE category = 'Monitor' AND sub_category IS NULL 
  AND (display_name ILIKE '%Smart Monitor%' OR display_name ILIKE '%Smart Swing%' OR display_name ILIKE '%MyView%');

UPDATE products SET sub_category = 'gram +view'
WHERE category = 'Monitor' AND sub_category IS NULL 
  AND (display_name ILIKE '%gram%' OR display_name ILIKE '%+view%' OR display_name ILIKE '%portable monitor%');

UPDATE products SET sub_category = 'DualUp'
WHERE category = 'Monitor' AND sub_category IS NULL 
  AND display_name ILIKE '%DualUp%';

UPDATE products SET sub_category = 'OLED Monitor'
WHERE category = 'Monitor' AND sub_category IS NULL 
  AND (display_name ILIKE '%OLED%' OR display_name ILIKE '%WOLED%');

UPDATE products SET sub_category = 'General Monitor'
WHERE category = 'Monitor' AND sub_category IS NULL;