INSERT INTO products (model_number, display_name, category) VALUES
('S95AR', 'LG Soundbar S95AR 9.1.5ch Dolby Atmos', 'Audio'),
('S90TR', 'LG Soundbar S90TR 7.1.4ch Home Theater', 'Audio'),
('S90TY', 'LG Soundbar S90TY 5.1.3ch Dolby Atmos', 'Audio'),
('S80TR', 'LG Soundbar S80TR 3.1.3ch Home Theater', 'Audio'),
('S70TR', 'LG Soundbar S70TR 3.1.1ch Home Theater', 'Audio'),
('S70TY', 'LG Soundbar S70TY 3.1ch Dolby Atmos', 'Audio'),
('SG10TY', 'LG Soundbar SG10TY 3.1ch OLED TV Match', 'Audio'),
('SC9S', 'LG Soundbar SC9S 3.1.3ch OLED Synergy', 'Audio'),
('S77S', 'LG Soundbar S77S 3.1.3ch WOW Orchestra', 'Audio'),
('XBOOM-STAGE-301', 'LG xboom Stage 301 Party Speaker', 'Audio'),
('XBOOM-GRAB', 'LG xboom Grab Portable Speaker', 'Audio'),
('XBOOM-GRAB-CORE', 'LG xboom Grab Core Portable Speaker', 'Audio'),
('XBOOM-BOUNCE', 'LG xboom Bounce Portable Speaker', 'Audio'),
('XBOOM-BUDS', 'LG xboom Buds Wireless Earbuds', 'Audio')
ON CONFLICT DO NOTHING;