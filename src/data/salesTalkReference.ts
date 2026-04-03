/**
 * LG Product Sales Talk Reference
 * Used for grounding marketing copy generation with official product features and terminology.
 */

export const SALES_TALK_REFERENCE: Record<string, {
  concept: string;
  keyFeatures: { name: string; description: string }[];
}> = {
  "WashTower": {
    concept: "A Tower of Laundry Innovation — speed, ease, intelligence, and style.",
    keyFeatures: [
      { name: "AI DD® 2.0 & AI Wash", description: "Sensors detect load size, fabric type, and soil levels to optimize wash cycles and fabric care." },
      { name: "AI Sensor Dry™ & AI Dry™", description: "IR Sensor tracks dryness levels without direct contact, preventing over-drying and saving energy." },
      { name: "Inverter DirectDrive™ Dryer Motor", description: "World's first dryer direct drive motor for low noise (Silent Dry -3dB) and 6-motion drying to reduce shrinkage." },
      { name: "TurboWash™ 360°", description: "5 jet sprays soak clothing faster, powering through any load in under 30 minutes." },
      { name: "AI DUAL Inverter HeatPump™", description: "High energy efficiency (A-10%) and gentler drying at lower temperatures." },
      { name: "All-in-One Center Control™", description: "Intuitive 4.3\" LCD touch panel at the perfect height for both washer and dryer." },
      { name: "Smart Pairing™", description: "Washer shares cycle settings with dryer and tells it to pre-heat." },
      { name: "ezDispense™", description: "Auto dispenses detergent for up to 31 loads." },
      { name: "Auto Cleaning Condenser", description: "Recycles water to spray-clean hard-to-reach condenser corners." },
    ],
  },
  "HeatPump WasherDryer": {
    concept: "Sustainable Laundry — efficient and convenient all-in-one performance.",
    keyFeatures: [
      { name: "Wash to Dry in 150 min", description: "Complete cycle without transferring clothes." },
      { name: "Energy Efficiency Class A-10%", description: "~50% improved energy standard vs existing models." },
      { name: "Microplastic Care Cycle", description: "Reduces microplastic emissions by up to 60% through delicate Swing and Tumble motions." },
      { name: "Eco-friendly Refrigerant R290", description: "Natural gas-based refrigerant with ~99.8% lower GWP than R134a." },
    ],
  },
  "SolarDOM": {
    concept: "Modern minimalism meets refined luxury — premium microwave & oven.",
    keyFeatures: [
      { name: "10 Cooking Modes", description: "Oven, Microwave, Grill, Air Fry, Steam, Grill Combi, Convection, Defrost, Proof, Dehydrate." },
      { name: "Charcoal Lighting Grill", description: "Exclusive tech delivering crispy outside, tender inside results (Korean BBQ-style)." },
      { name: "Healthy Fry", description: "Air fry reducing residual fat by up to 72%." },
      { name: "ThinQ Connectivity", description: "Built-in Wi-Fi for remote control, preheating, and Smart Energy Monitoring." },
    ],
  },
  "Refrigerator": {
    concept: "Fits Your Lifestyle. Maxes Freshness.",
    keyFeatures: [
      { name: "LinearCooling™", description: "Maintains temperature within ±0.5℃, locking in freshness for up to 7 days." },
      { name: "FRESHBalancer™", description: "Optimized humidity control with fruit and vegetable modes." },
      { name: "AI Fresh", description: "Analyzes usage patterns over 3 weeks to optimize cooling." },
      { name: "AI Inverter Compressor™", description: "Learns door opening habits to supply optimum cooling and save energy." },
      { name: "Zero Clearance", description: "Flat door design for wall-flush installation, seamless look." },
      { name: "InstaView™", description: "Knock twice to see inside without opening the door." },
    ],
  },
  "TV_OLED_evo": {
    concept: "Wallpaper TV aesthetics with Hyper Radiant Color Tech and practical AI.",
    keyFeatures: [
      { name: "Wallpaper Design", description: "Unbelievably slim 9mm-class profile that blends seamlessly into walls." },
      { name: "Zero Connect (True Wireless)", description: "TUV-certified visually lossless wireless transfer of 4K 165Hz video and audio." },
      { name: "Hyper Radiant Color Tech", description: "Perfect Black, Perfect Color, Brightness Boost Ultra (up to 3.9x brighter)." },
      { name: "Reflection Free Premium", description: "Eliminates distracting reflections while maintaining Always Perfect Black." },
    ],
  },
  "TV_Micro_RGB_evo": {
    concept: "Triple 100% Color Coverage with next-gen AI processing.",
    keyFeatures: [
      { name: "Triple 100% Color Coverage", description: "Intertek-certified 100% coverage of BT.2020, DCI-P3, and Adobe RGB." },
      { name: "α11 AI Processor Gen3", description: "Dual AI Engine with 5.6x stronger NPU for pixel-level intelligence." },
    ],
  },
  "TV_NANO_4K": {
    concept: "Accessible 4K with enhanced detail.",
    keyFeatures: [
      { name: "Nano Detail Enhancer", description: "Advanced algorithm removing blur for clearer 4K detail and deeper contrast." },
    ],
  },
  "TV_Art_Gallery": {
    concept: "Transform your space into a gallery.",
    keyFeatures: [
      { name: "Attachable Frame", description: "Magnet-attachable frames included for interior flexibility." },
      { name: "LG Gallery+", description: "5,000+ art pieces and Generative AI images." },
    ],
  },
  "ThinQ_AI_UP_Care": {
    concept: "Evolution through continuous updates and proactive care.",
    keyFeatures: [
      { name: "ThinQ UP", description: "Continuous software updates and optional hardware upgrades after purchase." },
      { name: "ThinQ Care", description: "Proactive alerts to prevent misuse and detect issues early." },
      { name: "AI Saving Mode", description: "Optimizes household energy use based on usage habits." },
      { name: "Night View (ThinQ UP)", description: "Tailored nighttime brightness for refrigerator lighting." },
    ],
  },
};

/** Get all feature names for a product category for use in copy generation */
export function getProductFeatures(category: string): string[] {
  const entry = SALES_TALK_REFERENCE[category];
  if (!entry) return [];
  return entry.keyFeatures.map(f => `${f.name}: ${f.description}`);
}

/** Get concept tagline for a product category */
export function getProductConcept(category: string): string {
  return SALES_TALK_REFERENCE[category]?.concept || "";
}
