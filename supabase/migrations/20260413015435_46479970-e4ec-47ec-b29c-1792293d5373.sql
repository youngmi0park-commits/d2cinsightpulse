
UPDATE products SET category = 'TV'
WHERE category = 'General' AND is_active = true
  AND (
    model_number ~ '^[0-9]{2}(LK|LR|LQ|LJ|LP|LM|LB|LF|UN|UK|UQ|UR|UH|UP|EC|EG|SM|SK|SJ|SN|TQ|LCD|LED|CS|CR|CX|BX|GX|WX)'
    OR (lower(display_name) ~* '(tv|television|lcd.?tv|led.?tv|smart.?tv|class.?led|class.?4k|class.?8k)')
  );

UPDATE products SET category = 'Monitor'
WHERE category = 'General' AND is_active = true
  AND model_number ~ '^[0-9]{2}(GP|GN|GR|GS|GL|GQ|GM|QP|QN|MR|MK|MD|MP|MB|ML|MN|WR|WP|WN|WQ|WK|WL|BN|BK|BL|BP|SQ|SR|UC|UD|UB|ER)';

UPDATE products SET category = 'Refrigerator'
WHERE category = 'General' AND is_active = true
  AND (
    upper(model_number) ~ '^(LRFX|LRGL|LRMV|LRFG|LRFL|LRFDC|LRFDS|LRFVC|LRMDC|LRMDS|LRMWS|LRSVS|LRSXS|LRSDS|LRSOS|LRSWS|LRTLS|LPXS|LFXS|LFCS|LFX|LHSXS|LHTNS|LLMXS|LLSDS|LMX|GR|GC|GL-)'
    OR lower(display_name) ~* '(refriger|french.?door|side.?by|instaview|counter.?depth)'
  );

UPDATE products SET category = 'Washer'
WHERE category = 'General' AND is_active = true
  AND (
    upper(model_number) ~ '^(WM|WT|WD|WW|WF|FV|FH)'
    OR lower(display_name) ~* '(washer|wash.?tower|washtower)'
  );

UPDATE products SET category = 'Dryer'
WHERE category = 'General' AND is_active = true
  AND (
    upper(model_number) ~ '^(DL[A-Z]|DLEX|DLGX|DLHC|FDV|FDC)'
    OR lower(display_name) ~* '(dryer)'
  );

UPDATE products SET category = 'Dishwasher'
WHERE category = 'General' AND is_active = true
  AND (
    upper(model_number) ~ '^(LDP|LDFN|LDF|LDNF|LDNT|LDGL|DD[0-9])'
    OR lower(display_name) ~* '(dishwash|quadwash)'
  );

UPDATE products SET category = 'Kitchen'
WHERE category = 'General' AND is_active = true
  AND (
    upper(model_number) ~ '^(LSE|LDE|LRE|LREL|LREN|LCE|LCRT|LCSP|LDEL|LSEL|LSIL|LSIS|LSG|LSGS|LWS|LWC|MVEL|LMWC|LMHM|LMC|LTG|LTIS)'
    OR lower(display_name) ~* '(range|oven|stove|cooktop|microwave)'
  );

UPDATE products SET category = 'Air Care'
WHERE category = 'General' AND is_active = true
  AND (
    upper(model_number) ~ '^(AP|AS[0-9])'
    OR lower(display_name) ~* '(air.?purif|puricare)'
  );

UPDATE products SET category = 'Air Conditioner'
WHERE category = 'General' AND is_active = true
  AND (
    upper(model_number) ~ '^(LAU|LSU|LP[0-9]{3,4}|LW[0-9]{4})'
    OR lower(display_name) ~* '(air.?condition|portable.?ac|window.?ac|btu)'
  );

UPDATE products SET category = 'Soundbar'
WHERE category = 'General' AND is_active = true
  AND (
    upper(model_number) ~ '^(SP|SN[0-9]|SC[0-9])'
    OR lower(display_name) ~* '(soundbar)'
  );

UPDATE products SET category = 'Audio'
WHERE category = 'General' AND is_active = true
  AND lower(display_name) ~* '(speaker|audio|home.?theater|sound.?system|blu.?ray)';

UPDATE products SET category = 'Projector'
WHERE category = 'General' AND is_active = true
  AND (
    upper(model_number) ~ '^(HU|HF|PF|PH|AU[0-9]|CJ)'
    OR lower(display_name) ~* '(projector|cinebeam)'
  );

UPDATE products SET is_active = false
WHERE category = 'General' AND is_active = true
  AND (
    lower(display_name) ~* '(water.?filter|lt[0-9]{3}[a-z]|adq[0-9]|lt[0-9]{3}p)'
    OR upper(model_number) ~ '^(ADQ|AEY|MAN|LT[0-9]{3}|5215)'
  );
