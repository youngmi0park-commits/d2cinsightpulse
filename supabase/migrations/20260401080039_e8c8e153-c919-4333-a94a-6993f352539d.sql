
INSERT INTO products (model_number, display_name, category, is_active) VALUES
-- Air Conditioner variants
('ar condicionado dual inverter 12000', 'LG Dual Inverter 12000 BTU Air Conditioner', 'Air Conditioner', true),
('ar condicionado dual inverter 9000', 'LG Dual Inverter 9000 BTU Air Conditioner', 'Air Conditioner', true),
('ar condicionado', 'LG Air Conditioner (General)', 'Air Conditioner', true),
('ar condicionado portatil', 'LG Portable Air Conditioner', 'Air Conditioner', true),
('ar condicionado 127v', 'LG Air Conditioner 127V', 'Air Conditioner', true),
('ar condicionado dual inverter 18000', 'LG Dual Inverter 18000 BTU Air Conditioner', 'Air Conditioner', true),
('ar condicionado dual inverter 9000 q', 'LG Dual Inverter 9000 BTU Quente/Frio AC', 'Air Conditioner', true),
('minisplit', 'LG Mini Split Air Conditioner', 'Air Conditioner', true),
-- Washer variants
('lavadoras', 'LG Lavadoras (Washers)', 'Washer', true),
('lava e seca vc4 12kg', 'LG Lava e Seca VC4 12kg', 'Washer', true),
('lava e seca vc4 14kg', 'LG Lava e Seca VC4 14kg', 'Washer', true),
('lavasecadora 12 kg', 'LG Lavasecadora 12 kg', 'Washer', true),
('lavasecadora 16 kg', 'LG Lavasecadora 16 kg', 'Washer', true),
('lavasecadora 22kg', 'LG Lavasecadora 22kg', 'Washer', true),
('waschmaschine', 'LG Waschmaschine (Washing Machine)', 'Washer', true),
('waschtrockner', 'LG Waschtrockner (Washer Dryer)', 'Washer', true),
('secadora de roupa', 'LG Secadora de Roupa', 'Dryer', true),
('trockner', 'LG Trockner (Dryer)', 'Dryer', true),
('lava louça', 'LG Lava Louça (Dishwasher)', 'Dishwasher', true),
('lava e seca vc2', 'LG Lava e Seca VC2', 'Washer', true),
-- Refrigerator variants
('geladeira', 'LG Geladeira (Refrigerator)', 'Refrigerator', true),
('refrigerador 29 pies', 'LG Refrigerador 29 Pies', 'Refrigerator', true),
('refrigerador 11 pies', 'LG Refrigerador 11 Pies', 'Refrigerator', true),
('refrigerador 25 pies', 'LG Refrigerador 25 Pies', 'Refrigerator', true),
('kühlschrank', 'LG Kühlschrank (Refrigerator)', 'Refrigerator', true),
('fridge freezer', 'LG Fridge Freezer', 'Refrigerator', true),
-- TV variants
('tv 50 polegadas', 'LG TV 50 Polegadas', 'TV', true),
('tv 55 polegadas', 'LG TV 55 Polegadas', 'TV', true),
('tv 65 polegadas', 'LG TV 65 Polegadas', 'TV', true),
('tv 75 polegadas', 'LG TV 75 Polegadas', 'TV', true),
('smart tv 32 polegadas', 'LG Smart TV 32 Polegadas', 'TV', true),
('tv oled', 'LG TV OLED', 'TV', true),
('lg oled g5 65', 'LG OLED G5 65"', 'TV', true),
('lg oled g5 77', 'LG OLED G5 77"', 'TV', true),
('lg oled c5 55', 'LG OLED C5 55"', 'TV', true),
('lg oled c5 65', 'LG OLED C5 65"', 'TV', true),
('lg oled c4 65', 'LG OLED C4 65"', 'TV', true),
('smart tv lg oled evo c4 55 4k 2024', 'LG OLED evo C4 55" 4K 2024', 'TV', true),
('65 inch tv', 'LG 65 Inch TV', 'TV', true),
('tv 65', 'LG TV 65"', 'TV', true),
('pantalla', 'LG Pantalla (Display)', 'TV', true),
('pantallas', 'LG Pantallas (Displays)', 'TV', true),
('pantalla 75 pulgadas', 'LG Pantalla 75 Pulgadas', 'TV', true),
-- Accessories / Remote
('controle remoto smart magic', 'LG Controle Remoto Smart Magic', 'Accessories', true),
('controle', 'LG Controle Remoto', 'Accessories', true),
('control remoto', 'LG Control Remoto', 'Accessories', true),
('controle remoto', 'LG Controle Remoto', 'Accessories', true),
-- Audio
('sound bar', 'LG Sound Bar', 'Audio', true),
-- Cooking
('estufa', 'LG Estufa (Stove/Range)', 'Cooking', true),
-- Mobile
('celular', 'LG Celular (Mobile Phone)', 'Mobile', true),
-- Other
('g4', 'LG G4', 'TV', true)
ON CONFLICT (model_number) DO NOTHING;
