-- LG India refrigerator series (GL- prefix) → Refrigerator
UPDATE products
SET category = 'Refrigerator', updated_at = now()
WHERE category = 'General'
  AND model_number ~* '^GL-[A-Z]?[BDFNPMTRS]';

-- US/global refrigerator prefixes
UPDATE products
SET category = 'Refrigerator', updated_at = now()
WHERE category = 'General'
  AND (model_number ~* '^(LRF|LRG|LRM|LRY|LF[0-9]|GR-|GC-|GM-)' 
       OR display_name ~* '(InstaView|French.?Door|Refriger)');

-- Washer
UPDATE products
SET category = 'Washer', updated_at = now()
WHERE category = 'General'
  AND (model_number ~* '^(WM[0-9]|WT[0-9]|F[0-9]+[A-Z]|FV[0-9])'
       OR display_name ~* '(WashTower|Washer|Washing)');

-- Dryer
UPDATE products
SET category = 'Dryer', updated_at = now()
WHERE category = 'General'
  AND (model_number ~* '^(DL[A-Z]X|DLGX|DLEX|RD[0-9])' OR display_name ~* 'Dryer');

-- AC
UPDATE products
SET category = 'Air Conditioner', updated_at = now()
WHERE category = 'General'
  AND (model_number ~* '^S[0-9]+Q' OR display_name ~* '(Artcool|Dual.?Cool|Air.?Condition)');