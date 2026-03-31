import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* Excel-based product catalog: model_number → { display, sub, cat } */
const CATALOG: Record<string, { display: string; sub: string; cat: string }> = {
  "OLED97G5WUA": { display: "97\" LG OLED evo AI G5 4K Smart TV (2025)", sub: "OLED evo (프리미엄)", cat: "TV" },
  "OLED83G5WUA": { display: "83\" LG OLED evo AI G5 4K Smart TV (2025)", sub: "OLED evo (프리미엄)", cat: "TV" },
  "OLED77G5WUA": { display: "77\" LG OLED evo AI G5 4K Smart TV (2025)", sub: "OLED evo (프리미엄)", cat: "TV" },
  "OLED65G5WUA": { display: "65\" LG OLED evo AI G5 4K Smart TV (2025)", sub: "OLED evo (프리미엄)", cat: "TV" },
  "OLED55G5WUA": { display: "55\" LG OLED evo AI G5 4K Smart TV (2025)", sub: "OLED evo (프리미엄)", cat: "TV" },
  "OLED97C5PUA": { display: "97\" LG OLED evo AI C5 4K Smart TV (2025)", sub: "OLED evo", cat: "TV" },
  "OLED83C5PUA": { display: "83\" LG OLED evo AI C5 4K Smart TV (2025)", sub: "OLED evo", cat: "TV" },
  "OLED77C5PUA": { display: "77\" LG OLED evo AI C5 4K Smart TV (2025)", sub: "OLED evo", cat: "TV" },
  "OLED65C5PUA": { display: "65\" LG OLED evo AI C5 4K Smart TV (2025)", sub: "OLED evo", cat: "TV" },
  "OLED55C5PUA": { display: "55\" LG OLED evo AI C5 4K Smart TV (2025)", sub: "OLED evo", cat: "TV" },
  "OLED48C5PUA": { display: "48\" LG OLED evo AI C5 4K Smart TV (2025)", sub: "OLED evo", cat: "TV" },
  "OLED42C5PUA": { display: "42\" LG OLED evo AI C5 4K Smart TV (2025)", sub: "OLED evo", cat: "TV" },
  "OLED83B5PUA": { display: "83\" LG OLED AI B5 4K Smart TV (2025)", sub: "OLED (스탠다드)", cat: "TV" },
  "OLED77B5PUA": { display: "77\" LG OLED AI B5 4K Smart TV (2025)", sub: "OLED (스탠다드)", cat: "TV" },
  "OLED65B5PUA": { display: "65\" LG OLED AI B5 4K Smart TV (2025)", sub: "OLED (스탠다드)", cat: "TV" },
  "OLED55B5PUA": { display: "55\" LG OLED AI B5 4K Smart TV (2025)", sub: "OLED (스탠다드)", cat: "TV" },
  "OLED48B5PUA": { display: "48\" LG OLED AI B5 4K Smart TV (2025)", sub: "OLED (스탠다드)", cat: "TV" },
  "OLED97M5PUA": { display: "97\" LG OLED evo AI M5 Wireless 4K Smart TV (2025)", sub: "OLED evo (무선)", cat: "TV" },
  "OLED83M5PUA": { display: "83\" LG OLED evo AI M5 Wireless 4K Smart TV (2025)", sub: "OLED evo (무선)", cat: "TV" },
  "OLED77M5PUA": { display: "77\" LG OLED evo AI M5 Wireless 4K Smart TV (2025)", sub: "OLED evo (무선)", cat: "TV" },
  "OLED65M5PUA": { display: "65\" LG OLED evo AI M5 Wireless 4K Smart TV (2025)", sub: "OLED evo (무선)", cat: "TV" },
  "OLED77T4PUA": { display: "77\" LG Transparent OLED 4K TV", sub: "Transparent OLED", cat: "TV" },
  "86QNED92AUA": { display: "86\" LG QNED evo AI QNED92A 4K Smart TV (2025)", sub: "QNED evo Mini LED", cat: "TV" },
  "75QNED92AUA": { display: "75\" LG QNED evo AI QNED92A 4K Smart TV (2025)", sub: "QNED evo Mini LED", cat: "TV" },
  "65QNED92AUA": { display: "65\" LG QNED evo AI QNED92A 4K Smart TV (2025)", sub: "QNED evo Mini LED", cat: "TV" },
  "100QNED9MAUA": { display: "100\" LG QNED evo AI QNED9MA Wireless 4K Smart TV (2025)", sub: "QNED evo Mini LED (무선)", cat: "TV" },
  "86QNED9MAUA": { display: "86\" LG QNED evo AI QNED9MA Wireless 4K Smart TV (2025)", sub: "QNED evo Mini LED (무선)", cat: "TV" },
  "75QNED9MAUA": { display: "75\" LG QNED evo AI QNED9MA Wireless 4K Smart TV (2025)", sub: "QNED evo Mini LED (무선)", cat: "TV" },
  "65QNED9MAUA": { display: "65\" LG QNED evo AI QNED9MA Wireless 4K Smart TV (2025)", sub: "QNED evo Mini LED (무선)", cat: "TV" },
  "86QNED85AUA": { display: "86\" LG QNED AI QNED85A 4K Smart TV (2025)", sub: "QNED", cat: "TV" },
  "75QNED85AUA": { display: "75\" LG QNED AI QNED85A 4K Smart TV (2025)", sub: "QNED", cat: "TV" },
  "65QNED85AUA": { display: "65\" LG QNED AI QNED85A 4K Smart TV (2025)", sub: "QNED", cat: "TV" },
  "86UT9400PUA": { display: "86\" LG UHD AI UT94 4K Smart TV (2025)", sub: "UHD 4K", cat: "TV" },
  "75UT9400PUA": { display: "75\" LG UHD AI UT94 4K Smart TV (2025)", sub: "UHD 4K", cat: "TV" },
  "65UT9400PUA": { display: "65\" LG UHD AI UT94 4K Smart TV (2025)", sub: "UHD 4K", cat: "TV" },
  "55UT9400PUA": { display: "55\" LG UHD AI UT94 4K Smart TV (2025)", sub: "UHD 4K", cat: "TV" },
  "75UT8000AUB": { display: "75\" LG UHD AI UT80 4K Smart TV (2025)", sub: "UHD 4K", cat: "TV" },
  "65UT8000AUB": { display: "65\" LG UHD AI UT80 4K Smart TV (2025)", sub: "UHD 4K", cat: "TV" },
  "55UT8000AUB": { display: "55\" LG UHD AI UT80 4K Smart TV (2025)", sub: "UHD 4K", cat: "TV" },
  "50UT8000AUB": { display: "50\" LG UHD AI UT80 4K Smart TV (2025)", sub: "UHD 4K", cat: "TV" },
  "43UT8000AUB": { display: "43\" LG UHD AI UT80 4K Smart TV (2025)", sub: "UHD 4K", cat: "TV" },
  "27LX6TYGA": { display: "27\" LG StanbyME AI Smart TV (4K UHD)", sub: "Lifestyle Screens", cat: "TV" },
  "27ART10AKPL": { display: "27\" LG StanbyME AI with Easel Stand", sub: "Lifestyle Screens", cat: "TV" },
  "32LQ630BPUA": { display: "32\" LG AeroCool Smart Monitor with webOS", sub: "Lifestyle Screens", cat: "TV" },
  "27SR75U-W": { display: "27\" LG MyView Smart Monitor (4K UHD, IPS)", sub: "MyView Smart Monitor", cat: "Monitor" },
  "32SR85U-W": { display: "32\" LG MyView Smart Monitor (4K UHD, IPS)", sub: "MyView Smart Monitor", cat: "Monitor" },
  "39LX6SGPUA": { display: "39\" LG Smart Monitor with webOS (Swing)", sub: "Smart Monitor (Swing)", cat: "Monitor" },
  "32EP950-B": { display: "32\" LG UltraFine™ OLED Pro 4K Monitor", sub: "UltraFine™ / 6K", cat: "Monitor" },
  "45GX990A-B": { display: "45\" LG UltraGear™ OLED Gaming Monitor (WQHD)", sub: "UltraGear™ OLED Gaming", cat: "Monitor" },
  "32GS95UE-B": { display: "32\" LG UltraGear™ OLED Gaming Monitor (4K)", sub: "UltraGear™ OLED Gaming", cat: "Monitor" },
  "39GS95QE-B": { display: "39\" LG UltraGear™ OLED Gaming Monitor (5K2K)", sub: "UltraGear™ OLED Gaming (5K2K)", cat: "Monitor" },
  "40WP95C-W": { display: "40\" LG UltraWide® Curved Monitor (5K2K)", sub: "UltraWide®", cat: "Monitor" },
  "17Z90SP": { display: "LG gram 17 (Intel Core Ultra)", sub: "LG gram", cat: "Laptop" },
  "16Z90SP": { display: "LG gram 16 (Intel Core Ultra)", sub: "LG gram", cat: "Laptop" },
  "14Z90SP": { display: "LG gram 14 (Intel Core Ultra)", sub: "LG gram", cat: "Laptop" },
  "17ZB90SP": { display: "LG gram Pro 17 (Intel Core Ultra 7)", sub: "LG gram Pro", cat: "Laptop" },
  "16ZB90SP": { display: "LG gram Pro 16 (Intel Core Ultra 7)", sub: "LG gram Pro", cat: "Laptop" },
  "16T90SP": { display: "LG gram Pro 16 2-in-1 (Intel Core Ultra 7)", sub: "LG gram Pro 2-in-1", cat: "Laptop" },
  "14T90SP": { display: "LG gram Pro 14 2-in-1 (Intel Core Ultra 7)", sub: "LG gram Pro 2-in-1", cat: "Laptop" },
  "SP11RA": { display: "LG Sound Suite Wireless Soundbar (프리미엄)", sub: "Sound Suite (프리미엄)", cat: "Audio" },
  "S95TR": { display: "LG Soundbar S95TR", sub: "Soundbar", cat: "Audio" },
  "S90QY": { display: "LG Soundbar S90QY", sub: "Home Theater Soundbar", cat: "Audio" },
  "S80QR": { display: "LG Soundbar S80QR", sub: "Home Theater Soundbar", cat: "Audio" },
  "SQC1": { display: "LG All-in-One Soundbar SQC1", sub: "All-in-One Soundbar", cat: "Audio" },
  "LRFWS2906D": { display: "LG 29 cu.ft. Smart French Door 3-Door Refrigerator", sub: "French Door 3-Door", cat: "Refrigerator" },
  "LRFXS2503S": { display: "LG 25 cu.ft. Smart French Door 3-Door Refrigerator", sub: "French Door 3-Door", cat: "Refrigerator" },
  "LRFXS2513S": { display: "LG 25 cu.ft. Smart French Door Refrigerator (InstaView)", sub: "French Door 3-Door", cat: "Refrigerator" },
  "LF29H8330S": { display: "LG SIGNATURE 30.8 cu.ft. French Door 3-Door Refrigerator", sub: "French Door 3-Door (LG SIGNATURE)", cat: "Refrigerator" },
  "LRMVS3006S": { display: "LG 30 cu.ft. Smart French Door 4-Door Refrigerator", sub: "French Door 4-Door", cat: "Refrigerator" },
  "LRMXS3006S": { display: "LG 30 cu.ft. Smart French Door 4-Door Refrigerator (Counter Depth Max)", sub: "French Door 4-Door", cat: "Refrigerator" },
  "LF29S8330S": { display: "LG 29 cu.ft. Smart French Door 4-Door Refrigerator", sub: "French Door 4-Door", cat: "Refrigerator" },
  "LF29S8365S": { display: "LG 29 cu.ft. Smart French Door 4-Door Refrigerator (InstaView)", sub: "French Door 4-Door (InstaView)", cat: "Refrigerator" },
  "LF25S8365S": { display: "LG 25 cu.ft. Counter Depth MAX French Door 4-Door Refrigerator (InstaView)", sub: "French Door 4-Door (InstaView)", cat: "Refrigerator" },
  "LF25S8360S": { display: "LG 25 cu.ft. Counter Depth MAX French Door 4-Door Refrigerator", sub: "French Door 4-Door (InstaView)", cat: "Refrigerator" },
  "WM6998HBA": { display: "LG SIGNATURE WashCombo™ All-in-One 5.0 cu.ft. Washer+Dryer", sub: "WashCombo™ All-in-One", cat: "Washer" },
  "WM6700HBA": { display: "LG WashCombo™ All-in-One 5.0 cu.ft. Mega Capacity Washer+Dryer", sub: "WashCombo™ All-in-One", cat: "Washer" },
  "WKEX200HBA": { display: "LG WashTower™ Single Unit (Front Load)", sub: "WashTower™", cat: "Washer" },
  "WKHC202HBA": { display: "LG WashTower™ with Center Control™", sub: "WashTower™", cat: "Washer" },
  "WM5500HVA": { display: "LG 4.5 cu.ft. Smart Front Load Washer (TurboWash™ 360)", sub: "Front Load Washer", cat: "Washer" },
  "WM4200HBA": { display: "LG 5.0 cu.ft. Mega Capacity Smart Front Load Washer", sub: "Front Load Washer", cat: "Washer" },
  "WM3600HWA": { display: "LG 4.5 cu.ft. Smart Front Load Washer", sub: "Front Load Washer", cat: "Washer" },
  "WT8405CW": { display: "LG 5.5 cu.ft. Smart Top Load Washer (TurboWash3D™)", sub: "Top Load Washer", cat: "Washer" },
  "WT7150CW": { display: "LG 5.0 cu.ft. Top Load Washer", sub: "Top Load Washer", cat: "Washer" },
  "DLEX5500V": { display: "LG 7.4 cu.ft. Smart Front Load Electric Dryer (TurboSteam™)", sub: "Electric Dryer", cat: "Dryer" },
  "DLE3600W": { display: "LG 7.4 cu.ft. Smart Front Load Electric Dryer", sub: "Electric Dryer", cat: "Dryer" },
  "DLHC1455V": { display: "LG 4.2 cu.ft. Smart Compact Front Load Dryer (Ventless, Heat Pump)", sub: "Electric Dryer", cat: "Dryer" },
  "DLE3470M": { display: "LG 7.3 cu.ft. Smart Electric Dryer", sub: "Electric Dryer", cat: "Dryer" },
  "DLGX5501V": { display: "LG 7.4 cu.ft. Smart Front Load Gas Dryer (TurboSteam™)", sub: "Gas Dryer", cat: "Dryer" },
  "DLG3601W": { display: "LG 7.4 cu.ft. Smart Front Load Gas Dryer", sub: "Gas Dryer", cat: "Dryer" },
  "DLG3471M": { display: "LG 7.3 cu.ft. Smart Gas Dryer", sub: "Gas Dryer", cat: "Dryer" },
  "LDTH7972S": { display: "LG Smart Top Control Dishwasher with 1-Hour Wash & Dry", sub: "Top Control", cat: "Dishwasher" },
  "LDFN4542S": { display: "LG Front Control Dishwasher with QuadWash™", sub: "Front Control", cat: "Dishwasher" },
  "LDTS5552S": { display: "LG Smart Top Control Dishwasher with TrueSteam®", sub: "Top Control", cat: "Dishwasher" },
  "S3WFBN": { display: "LG Styler® Steam Closet with ThinQ®", sub: "Steam Closet", cat: "Styler" },
  "LP1419IVSM": { display: "LG DUAL Inverter Smart Portable AC (14,000 BTU)", sub: "Portable AC", cat: "Air Conditioner" },
  "LW1821IVSM": { display: "LG DUAL Inverter Smart Window AC (18,000 BTU)", sub: "Window AC", cat: "Air Conditioner" },
  "LWQ127HRG2": { display: "LG In-Wall Smart AC with Heating", sub: "In-Wall AC", cat: "Air Conditioner" },
  "AS560DWR0": { display: "LG PuriCare™ AeroTower (Air Purifying Fan)", sub: "공기청정기", cat: "Air Purifier" },
  "AS401WWA1": { display: "LG PuriCare™ 360° Air Purifier", sub: "공기청정기", cat: "Air Purifier" },
  "UD501KOG5W": { display: "LG PuriCare™ 50 Pint Dehumidifier with Wi-Fi", sub: "제습기", cat: "Air Purifier" },
  "A939KBGS": { display: "LG CordZero All-in-One Auto Empty Cordless Stick Vacuum", sub: "Stick Vacuum (CordZero)", cat: "Vacuum" },
  "A931KBM": { display: "LG CordZero Cordless Stick Vacuum", sub: "Stick Vacuum (CordZero)", cat: "Vacuum" },
  "HU915QE": { display: "LG CineBeam Q 4K UHD Laser UST Projector", sub: "CineBeam 4K Laser", cat: "Projector" },
  "PF610P": { display: "LG CineBeam Portable Smart Projector", sub: "CineBeam Portable", cat: "Projector" },
  "XBOOM360XO3": { display: "LG XBOOM 360 Portable Bluetooth Speaker", sub: "Bluetooth Speaker (XBOOM)", cat: "Audio" },
  "TONE-FP9A": { display: "LG TONE Free FP9A True Wireless Earbuds", sub: "Wireless Earbuds (XBOOM)", cat: "Audio" },
  "LRGL5825F": { display: "LG 5.8 cu.ft. Smart Gas Single Oven Range (InstaView)", sub: "Range", cat: "Kitchen Appliance" },
  "LREL6325F": { display: "LG 6.3 cu.ft. Smart Electric Single Oven Range (InstaView)", sub: "Range", cat: "Kitchen Appliance" },
  "CBGJ3027S": { display: "LG 30\" Smart Induction Cooktop", sub: "Cooktop", cat: "Kitchen Appliance" },
  "MVEL2033F": { display: "LG 2.0 cu.ft. Smart Wi-Fi Over-the-Range Microwave", sub: "Microwave", cat: "Kitchen Appliance" },
  "WSEP4727F": { display: "LG 4.7 cu.ft. Smart Wall Oven (InstaView)", sub: "Wall Oven", cat: "Kitchen Appliance" },
  "WDEP9427F": { display: "LG STUDIO 9.4 cu.ft. Double Built-In Wall Oven", sub: "Wall Oven", cat: "Kitchen Appliance" },
};

/* Fuzzy match: try exact, then strip suffix (.AUSZ etc), then partial */
function findMapping(modelNumber: string): typeof CATALOG[string] | null {
  if (CATALOG[modelNumber]) return CATALOG[modelNumber];
  const clean = modelNumber.replace(/\.[A-Z]+$/, "");
  if (CATALOG[clean]) return CATALOG[clean];
  // Try partial match (model starts with catalog key)
  for (const [key, val] of Object.entries(CATALOG)) {
    if (modelNumber.startsWith(key) || key.startsWith(modelNumber)) return val;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { data: products, error } = await sb.from("products").select("id, model_number, display_name, sub_category");
    if (error) throw error;

    let updated = 0, skipped = 0;
    for (const p of products || []) {
      const mapping = findMapping(p.model_number);
      if (mapping) {
        const { error: upErr } = await sb.from("products").update({
          display_name: mapping.display,
          sub_category: mapping.sub,
        }).eq("id", p.id);
        if (!upErr) updated++;
      } else {
        skipped++;
      }
    }

    return new Response(
      JSON.stringify({ updated, skipped, total: products?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
