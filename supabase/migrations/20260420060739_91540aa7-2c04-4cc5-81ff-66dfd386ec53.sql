-- ═══════════════════════════════════════════════════════════════════
-- 1) products 테이블 비정상 카테고리 즉시 정리
--    CT코드, 한글 카테고리명을 표준 영문 카테고리로 매핑
-- ═══════════════════════════════════════════════════════════════════

-- Cooktop / 쿡탑 → Cooktop (이미 표준 enum 보유)
UPDATE products SET category = 'Cooktop', updated_at = now()
WHERE category = '쿡탑';

-- 가전 번들 → Accessory
UPDATE products SET category = 'Accessory', updated_at = now()
WHERE category = '가전 번들';

-- CT00000305 → Washer (WDP6A pedestal)
UPDATE products SET category = 'Washer', updated_at = now()
WHERE category = 'CT00000305';

-- CT00000317 → Laptop (LG gram series)
UPDATE products SET category = 'Laptop', updated_at = now()
WHERE category = 'CT00000317';

-- CT10000016 → Accessory
UPDATE products SET category = 'Accessory', updated_at = now()
WHERE category = 'CT10000016';

-- CT10000020 → Audio (FS22GB, SQ-G2ST55)
UPDATE products SET category = 'Audio', updated_at = now()
WHERE category = 'CT10000020';

-- CT10000030 → Monitor
UPDATE products SET category = 'Monitor', updated_at = now()
WHERE category = 'CT10000030';

-- CT30017684 → Range/Oven (EG800BW built-in oven)
UPDATE products SET category = 'Range/Oven', updated_at = now()
WHERE category = 'CT30017684';

-- CT41000033 → Projector (BU60PST CineBeam)
UPDATE products SET category = 'Projector', updated_at = now()
WHERE category = 'CT41000033';

-- CT41000035 → Monitor (BN-series)
UPDATE products SET category = 'Monitor', updated_at = now()
WHERE category = 'CT41000035';

-- CT41000323 → Audio (Tone Free earbuds)
UPDATE products SET category = 'Audio', updated_at = now()
WHERE category = 'CT41000323';

-- CT52000821 → TV (OLED T-series wireless)
UPDATE products SET category = 'TV', updated_at = now()
WHERE category = 'CT52000821';

-- ═══════════════════════════════════════════════════════════════════
-- 2) bv_collection_progress의 raw CategoryId도 표준화
--    (UI 일관성을 위해 사람이 읽을 수 있는 카테고리로 변환)
-- ═══════════════════════════════════════════════════════════════════
UPDATE bv_collection_progress SET category = CASE category
  WHEN 'CT52000821' THEN 'TV'
  WHEN 'CT52000179' THEN 'TV'
  WHEN 'CT52000826' THEN 'Refrigerator'
  WHEN 'CT10000018' THEN 'Refrigerator'
  WHEN 'CT52002425' THEN 'Washer'
  WHEN 'CT52001903' THEN 'Dryer'
  WHEN 'CT52001906' THEN 'Dishwasher'
  WHEN 'CT52106203' THEN 'Dishwasher'
  WHEN 'CT52001900' THEN 'Air Conditioner'
  WHEN 'CT10000016' THEN 'Air Conditioner'
  WHEN 'CT00008334' THEN 'Monitor'
  WHEN 'CT10000010' THEN 'Monitor'
  WHEN 'CT10000030' THEN 'Monitor'
  WHEN 'CT41000035' THEN 'Monitor'
  WHEN 'CT00008363' THEN 'Audio'
  WHEN 'CT52000182' THEN 'Audio'
  WHEN 'CT41000323' THEN 'Audio'
  WHEN 'CT10000020' THEN 'Audio'
  WHEN 'CT52006585' THEN 'Vacuum'
  WHEN 'CT52006086' THEN 'Vacuum'
  WHEN 'CT52001901' THEN 'Range/Oven'
  WHEN 'CT52006634' THEN 'Range/Oven'
  WHEN 'CT30017684' THEN 'Range/Oven'
  WHEN 'CT52006085' THEN 'Air Purifier'
  WHEN 'CT52000129' THEN 'Laptop'
  WHEN 'CT10000011' THEN 'Laptop'
  WHEN 'CT00000317' THEN 'Laptop'
  WHEN 'CT52000823' THEN 'Microwave'
  WHEN 'CT52006087' THEN 'Projector'
  WHEN 'CT41000033' THEN 'Projector'
  WHEN 'CT41000491' THEN 'Styler'
  WHEN 'CT00000305' THEN 'Washer'
  WHEN 'C_APPLIANCE_WASHER_DRYER' THEN 'Washer'
  WHEN 'C_APPLIANCE_AIR_CARE' THEN 'Air Purifier'
  WHEN 'C_APPLIANCE_DISHWASHER' THEN 'Dishwasher'
  WHEN 'C_APPLIANCE_VACUUM_CLEANER' THEN 'Vacuum'
  WHEN 'C_TV_AUDIO_VIDEO_TV_SOUNDBAR' THEN 'Audio'
  WHEN 'C_COMPUTING_LAPTOP' THEN 'Laptop'
  WHEN 'C_COMPUTING_MONITOR' THEN 'Monitor'
  WHEN 'C_AIR_SOLUTION_RESIDENTIAL_AIR_CONDITIONER' THEN 'Air Conditioner'
  WHEN '쿡탑' THEN 'Cooktop'
  WHEN '가전 번들' THEN 'Accessory'
  WHEN 'BV_MISCELLANEOUS_CATEGORY' THEN 'General'
  ELSE category
END,
updated_at = now()
WHERE category IN (
  'CT52000821','CT52000179','CT52000826','CT10000018','CT52002425','CT52001903',
  'CT52001906','CT52106203','CT52001900','CT10000016','CT00008334','CT10000010',
  'CT10000030','CT41000035','CT00008363','CT52000182','CT41000323','CT10000020',
  'CT52006585','CT52006086','CT52001901','CT52006634','CT30017684','CT52006085',
  'CT52000129','CT10000011','CT00000317','CT52000823','CT52006087','CT41000033',
  'CT41000491','CT00000305','C_APPLIANCE_WASHER_DRYER','C_APPLIANCE_AIR_CARE',
  'C_APPLIANCE_DISHWASHER','C_APPLIANCE_VACUUM_CLEANER','C_TV_AUDIO_VIDEO_TV_SOUNDBAR',
  'C_COMPUTING_LAPTOP','C_COMPUTING_MONITOR','C_AIR_SOLUTION_RESIDENTIAL_AIR_CONDITIONER',
  '쿡탑','가전 번들','BV_MISCELLANEOUS_CATEGORY'
);

-- ═══════════════════════════════════════════════════════════════════
-- 3) pg_cron 매일 02:30 UTC 자동 재분류 — 미분류/CT코드/한글 카테고리 정리
-- ═══════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 기존 동일 작업이 있다면 제거
DO $$
BEGIN
  PERFORM cron.unschedule('daily-reclassify-products');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 매일 02:30 UTC: reclassify-general-products edge function 호출
SELECT cron.schedule(
  'daily-reclassify-products',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ygdgbapodmoxklcssjzr.supabase.co/functions/v1/reclassify-general-products',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('source', 'daily-cron')
  ) AS request_id;
  $$
);