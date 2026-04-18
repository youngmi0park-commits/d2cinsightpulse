UPDATE public.products SET category = CASE category
  WHEN 'TV' THEN 'TV'
  WHEN 'OLED TV' THEN 'TV'
  WHEN 'C_TV_AUDIO_VIDEO_TV_SOUNDBAR' THEN '오디오'
  WHEN 'C_TV_AUDIO_VIDEO_SPEAKER' THEN '오디오'
  WHEN 'Soundbar' THEN '오디오'
  WHEN 'Audio' THEN '오디오'
  WHEN 'Washer' THEN '세탁기'
  WHEN 'Refrigerator' THEN '냉장고'
  WHEN 'C_APPLIANCE_REFRIGERATOR' THEN '냉장고'
  WHEN 'Dishwasher' THEN '식기세척기'
  WHEN 'Dryer' THEN '건조기'
  WHEN 'Range/Oven' THEN '오븐/레인지'
  WHEN 'C_APPLIANCE_COOKING_APPLIANCE' THEN '오븐/레인지'
  WHEN 'Kitchen' THEN '오븐/레인지'
  WHEN 'Cooktop' THEN '쿡탑'
  WHEN 'Microwave' THEN '전자레인지'
  WHEN 'Monitor' THEN '모니터'
  WHEN 'C_COMPUTING_MONITOR' THEN '모니터'
  WHEN 'Laptop' THEN '노트북'
  WHEN 'C_COMPUTING_LAPTOP' THEN '노트북'
  WHEN 'Vacuum' THEN '청소기'
  WHEN 'C_APPLIANCE_VACUUM_CLEANER' THEN '청소기'
  WHEN 'Air Conditioner' THEN '에어컨'
  WHEN 'C_AIR_SOLUTION_RESIDENTIAL_AIR_CONDITIONER' THEN '에어컨'
  WHEN 'Air Purifier' THEN '공기청정기'
  WHEN 'Air Care' THEN '공기청정기'
  WHEN 'C_APPLIANCE_AIR_CARE' THEN '공기청정기'
  WHEN 'Styler' THEN '스타일러'
  WHEN 'Projector' THEN '프로젝터'
  WHEN 'Accessory' THEN '액세서리'
  WHEN 'C_APPLIANCE_APPLIANCE_ACCESSORY' THEN '액세서리'
  WHEN 'Appliance Bundle' THEN '가전 번들'
  WHEN 'BV_MISCELLANEOUS_CATEGORY' THEN 'General'
  ELSE category
END
WHERE category IN (
  'TV','OLED TV','C_TV_AUDIO_VIDEO_TV_SOUNDBAR','C_TV_AUDIO_VIDEO_SPEAKER','Soundbar','Audio',
  'Washer','Refrigerator','C_APPLIANCE_REFRIGERATOR','Dishwasher','Dryer',
  'Range/Oven','C_APPLIANCE_COOKING_APPLIANCE','Kitchen','Cooktop','Microwave',
  'Monitor','C_COMPUTING_MONITOR','Laptop','C_COMPUTING_LAPTOP',
  'Vacuum','C_APPLIANCE_VACUUM_CLEANER','Air Conditioner','C_AIR_SOLUTION_RESIDENTIAL_AIR_CONDITIONER',
  'Air Purifier','Air Care','C_APPLIANCE_AIR_CARE','Styler','Projector',
  'Accessory','C_APPLIANCE_APPLIANCE_ACCESSORY','Appliance Bundle','BV_MISCELLANEOUS_CATEGORY'
);