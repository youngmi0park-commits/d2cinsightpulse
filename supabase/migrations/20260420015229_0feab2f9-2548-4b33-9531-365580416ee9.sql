-- Comprehensive backfill for General-categorized products
-- Uses model_number + display_name regex to map to proper category

-- Refrigerator (GL-, GR-, GN-D/F/H, GBB, GBV, GSL, GSE, LRF, LR*, LF*, etc.)
UPDATE products SET category = 'Refrigerator', updated_at = now()
WHERE category = 'General' AND is_active = true
  AND (model_number ~* '^(GL-|GR-|GC-|GM-|GN-[A-Z]|GBB|GBV|GSL|GSE|GSJ|GSV|GSX|GSF|GBP|GBF|GBM|LRF|LRG|LRY|LRM|LRD|LRS|LF\d|LFX|LFC|LMX|LSX|LRBC|LRYK|LRYX|LBNC|LRMV|LSXS|SRFVC|SRFD|SXTN|MFCN)'
       OR display_name ~* '(InstaView|French.?Door|Refriger|Bottom.?Freezer|Side.?by.?Side|Top.?Mount|Door.?in.?Door|냉장고)');

-- Air Conditioner (RS-Q, AS-Q, TS-Q, AW-Q, US-Q, US-H, UW-Q, UH-Q, S*Q, LSU, LMU, LP, LV, LW, BS-, AP-, etc.)
UPDATE products SET category = 'Air Conditioner', updated_at = now()
WHERE category = 'General' AND is_active = true
  AND (model_number ~* '^(RS-[QHA]|AS-[QHA]|TS-[QH]|AW-[QH]|US-[QH]|UW-[QH]|UH-[QH]|VR-[QH]|BS-[QH]|S\d+[QT]|LSU|LMU|LP\d|LV\d|LW\d|LU[A-Z]|LUWM|AP[QH]|MS\d{2}[A-Z])'
       OR display_name ~* '(Artcool|Dual.?Cool|Air.?Condition|Inverter.?AC|Split.?AC|Window.?AC|Portable.?AC|에어컨)');

-- TV (numeric prefix patterns: 32LQ, 27LX, 32LR, 55NANO, 75NANO, OLED, NANO, QNED, UR, UQ, UT, UH, UP, BU53, etc.)
UPDATE products SET category = 'TV', updated_at = now()
WHERE category = 'General' AND is_active = true
  AND (model_number ~* '^(\d+(NANO|QNED|OLED|UR|UQ|UT|UH|UP|UM|UJ|UK|LM|LB|LF|LJ|LH|LE|LV|LR\d|LK|LX|LQ|SM|SK|SN|UB|UA))|^(BU\d|HU\d|PF|PH|UD\d|R5-PRO|BOUNCE|STAGE\d)'
       OR display_name ~* '(NanoCell|OLED TV|QNED|StanbyME|^.{0,30}TV|텔레비전)');

-- Audio (SP, SN, SK, SC, SH, SJ, S\d{2}, CM, DS, ST, BT, NP, OLW, QP, XBOOM, BOUNCE)
UPDATE products SET category = 'Audio', updated_at = now()
WHERE category = 'General' AND is_active = true
  AND (model_number ~* '^(SP[A-Z0-9]|SN\d|SC\d|SK\d|SL\d|SJ\d|SH\d|SE\d|SD\d|S\d{2}[A-Z]|CM\d|DS\d|DS[A-Z]\d|XBOOM|QP\d|OLW|NP\d|HBS|LHB|LAC|LAS|BT[0-9]|S5W|S3W|R5-)'
       OR display_name ~* '(Soundbar|XBOOM|사운드바|스피커|Speaker|Boombox|Hi-?Fi)');

-- Washer (WM, WT, FV, F\d, WKEX, WKGX, TWC, WW, T-)
UPDATE products SET category = 'Washer', updated_at = now()
WHERE category = 'General' AND is_active = true
  AND (model_number ~* '^(WM\d|WT\d|FV\d|F\d+[A-Z]|WKE[X]?|WKG[X]?|TWC|WW\d|WV\d|T-W|TX\d|WTV)'
       OR display_name ~* '(WashTower|Washer|Washing|Front.?Load|Top.?Load|세탁)');

-- Dryer (DLEX, DLGX, RH, RD, RV)
UPDATE products SET category = 'Dryer', updated_at = now()
WHERE category = 'General' AND is_active = true
  AND (model_number ~* '^(DL[EG]X|DLE\d|DLG\d|RH\d|RD\d|RV\d|RC\d)'
       OR display_name ~* '(Dryer|건조)');

-- Dishwasher
UPDATE products SET category = 'Dishwasher', updated_at = now()
WHERE category = 'General' AND is_active = true
  AND (model_number ~* '^(LDP|LDFN|LDF\d|LDT\d|LDPS|LDPM|LDNP|DF[A-Z0-9]{3})'
       OR display_name ~* '(Dishwash|QuadWash|식기)');

-- Vacuum
UPDATE products SET category = 'Vacuum', updated_at = now()
WHERE category = 'General' AND is_active = true
  AND (model_number ~* '^(A9[A-Z0-9]|VC\d|VK\d)'
       OR display_name ~* '(CordZero|Vacuum|청소기)');

-- Air Purifier
UPDATE products SET category = 'Air Purifier', updated_at = now()
WHERE category = 'General' AND is_active = true
  AND (model_number ~* '^(AS\d|AM5|AP[A-Z]\d|PuriCare)'
       OR display_name ~* '(PuriCare|Air.?Purif|공기청정)');

-- Monitor (numeric+letter patterns: 27/29/32/34 + GP/GR/GN/UP/UN/WP/WN/MP/MK/BK/BN/QK/QN/QP/BA/U5/Z/UC, UltraGear, UltraFine, UltraWide)
UPDATE products SET category = 'Monitor', updated_at = now()
WHERE category = 'General' AND is_active = true
  AND (model_number ~* '^(\d+(GP|GR|GS|GN|UP|UN|UM|UK|WP|WN|WK|WQ|MP|MK|BK|BP|BN|MQ|UC|SR|QK|QN|QP|BA|U[5-9]|Z|UD)\d?|MN\d{2})'
       OR display_name ~* '(Monitor|UltraGear|UltraFine|UltraWide|DualUp|gram \+view)');

-- Microwave (MVE, MJ, MH, MS, MC, LMC, LMV, LMH)
UPDATE products SET category = 'Microwave', updated_at = now()
WHERE category = 'General' AND is_active = true
  AND (model_number ~* '^(MVE[LM]|MH\d|MS\d{2,}|MC\d|MJ\d|MJEN|LMC|LMV|LMH|MK\d{3}|MSER|MSEC|MSEW|MSED|MSEK)'
       OR display_name ~* '(Microwave|전자레인지|MicroWave|Solardom)');

-- Range/Oven/Cooktop (LSE, LDE, LRE, LSI, LWS, WSED, WSES, LDG, LSDL, CB)
UPDATE products SET category = 'Range/Oven', updated_at = now()
WHERE category = 'General' AND is_active = true
  AND (model_number ~* '^(LSE|LDE|LRE|LRG|LSI|LWS|WSE[DS]|LDG|LSDL|LSDT|LSGL|LREL|LSEL|CB[A-Z]{2,}|LSCE|LCG)'
       OR display_name ~* '(Range|Oven|Cooktop|Wall.?Oven)');

-- Projector (PF, HU, HF, PH, BU, CineBeam)
UPDATE products SET category = 'Projector', updated_at = now()
WHERE category = 'General' AND is_active = true
  AND (model_number ~* '^(PF\d|HU\d|HF\d|PH\d)'
       OR display_name ~* '(CineBeam|Projector|Beam.?Projector)');

-- Styler
UPDATE products SET category = 'Styler', updated_at = now()
WHERE category = 'General' AND is_active = true
  AND (model_number ~* '^(S3[A-Z]|S5[A-Z])' OR display_name ~* 'Styler');

-- Accessory (AKB remote, AGF/EAU/ADQ/MDS filters, EBR/EBX/ABW boards, etc.)
UPDATE products SET category = 'Accessory', updated_at = now()
WHERE category = 'General' AND is_active = true
  AND (model_number ~* '^(AKB|AGF|AN-|MAZ|AAA|ADQ|SP-|MCK|AEB|EAU|MDS|MDJ|ABW|KSTK|EBR|EBX|ADV|EBT|EAD)'
       OR display_name ~* '(Remote|Filter|Accessory|Belt|Hose|Bracket|Cable|Stand)');