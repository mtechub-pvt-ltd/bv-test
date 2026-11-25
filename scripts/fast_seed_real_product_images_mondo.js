import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

// Curated high-resolution studio product photos for all 21 categories (Unsplash CDN)
const CATEGORY_PRODUCTS = {
  1: [ // Vehicles & Transportation
    { title: "Porsche 911 Carrera GTS Coupe", price: 145000, img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80" },
    { title: "Tesla Model S Plaid All-Wheel Drive", price: 89000, img: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80" },
    { title: "Mercedes-Benz G63 AMG Luxury SUV", price: 179000, img: "https://images.unsplash.com/photo-1520050206274-a1ae44613e6d?auto=format&fit=crop&w=800&q=80" },
    { title: "BMW M4 Competition Coupe Sport", price: 82000, img: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80" },
    { title: "Ducati Panigale V4 Superbike", price: 26000, img: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80" }
  ],
  2: [ // Electronics & Technology
    { title: "Apple iPhone 15 Pro Max 512GB Titanium", price: 1299, img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80" },
    { title: "Apple MacBook Pro 16-inch M3 Max", price: 3499, img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80" },
    { title: "Sony WH-1000XM5 Wireless Noise-Cancelling Headphones", price: 399, img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80" },
    { title: "Apple Watch Ultra 2 Titanium GPS + Cellular", price: 799, img: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80" },
    { title: "Bose QuietComfort 45 Over-Ear Headphones", price: 329, img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80" }
  ],
  3: [ // Fashion & Clothing
    { title: "Nike Air Max 270 Flyknit Athletic Shoes", price: 160, img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80" },
    { title: "Vintage Handcrafted Leather Biker Jacket", price: 420, img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80" },
    { title: "Classic Italian Oxford Leather Dress Shoes", price: 290, img: "https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=800&q=80" },
    { title: "Designer Suede Tote Handbag", price: 350, img: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80" },
    { title: "Ray-Ban Classic Polarized Sunglasses", price: 185, img: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80" }
  ],
  4: [ // Jewelry & Watches
    { title: "Rolex Submariner Date 41mm Oystersteel Watch", price: 13500, img: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80" },
    { title: "18K Solid Yellow Gold Cuban Link Chain", price: 3800, img: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80" },
    { title: "Certified 2.5ct Diamond Solitaire Engagement Ring", price: 7900, img: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80" },
    { title: "Minimalist Swiss Chronograph Leather Watch", price: 850, img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80" },
    { title: "Handcrafted Sterling Silver Gemstone Pendant", price: 280, img: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80" }
  ],
  5: [ // Real Estate & Property
    { title: "Modern Luxury Villa with Infinity Pool", price: 1250000, img: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80" },
    { title: "Contemporary Waterfront Penthouse Apartment", price: 890000, img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80" },
    { title: "Architectural Minimalist Loft Residence", price: 650000, img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80" },
    { title: "Mediterranean Beachfront Family Estate", price: 1750000, img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80" },
    { title: "Scandinavian Designer Countryside Chalet", price: 480000, img: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80" }
  ],
  6: [ // Tools & Hardware
    { title: "DeWalt 20V MAX Cordless Drill & Impact Driver Kit", price: 229, img: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80" },
    { title: "Professional 150-Piece Mechanics Tool Box Set", price: 340, img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80" },
    { title: "Heavy Duty Workshop Bench Vise", price: 180, img: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=800&q=80" },
    { title: "Laser Precision Digital Measuring Level", price: 95, img: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=800&q=80" },
    { title: "Commercial Electric Demolition Jackhammer", price: 420, img: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=800&q=80" }
  ],
  7: [ // Garden & Outdoor
    { title: "Weber Genesis Gas Barbecue Grill Station", price: 999, img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80" },
    { title: "Husqvarna Smart Robotic Lawn Mower", price: 1450, img: "https://images.unsplash.com/photo-1558904541-efa8c4a08931?auto=format&fit=crop&w=800&q=80" },
    { title: "Handcrafted Teak Wood Outdoor Patio Dining Set", price: 1200, img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80" },
    { title: "Ceramic Glazed Artisan Garden Planter Pots (Set of 3)", price: 175, img: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=800&q=80" },
    { title: "High-Pressure Commercial Garden Water Washer", price: 290, img: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80" }
  ],
  8: [ // Appliances
    { title: "Breville Barista Touch Espresso Machine", price: 999, img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80" },
    { title: "KitchenAid Artisan 5-Quart Stand Mixer", price: 449, img: "https://images.unsplash.com/photo-1594385208974-2e75f8d7bb48?auto=format&fit=crop&w=800&q=80" },
    { title: "Dyson V15 Detect Cordless Vacuum Cleaner", price: 749, img: "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=800&q=80" },
    { title: "Smeg 50's Retro Style 4-Slice Toaster", price: 220, img: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80" },
    { title: "Vitamix A3500 Ascent Smart Blender", price: 650, img: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80" }
  ],
  9: [ // Baby, Kids & Toys
    { title: "LEGO Icons Concorde Aircraft Collector Model Set", price: 199, img: "https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?auto=format&fit=crop&w=800&q=80" },
    { title: "Cybex Priam Luxury All-Terrain Stroller", price: 899, img: "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80" },
    { title: "Classic Hand-Carved Wooden Rocking Horse", price: 240, img: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=800&q=80" },
    { title: "DJI Tello High-Definition Kids Drone", price: 120, img: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80" },
    { title: "Steiff Collector Classic Plush Teddy Bear", price: 150, img: "https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=800&q=80" }
  ],
  10: [ // Sports & Fitness
    { title: "Specialized Tarmac SL7 Carbon Road Bicycle", price: 4200, img: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80" },
    { title: "Bowflex SelectTech Adjustable Dumbbells Pair", price: 429, img: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80" },
    { title: "Olympic 45lb Cast Iron Barbell Weight Set", price: 550, img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80" },
    { title: "Concept2 Model D Indoor Rowing Machine", price: 990, img: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=800&q=80" },
    { title: "Manduka PRO High-Density Yoga Mat & Blocks", price: 140, img: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80" }
  ],
  11: [ // Gaming & Entertainment
    { title: "Sony PlayStation 5 Digital Edition Console", price: 449, img: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80" },
    { title: "DualSense Edge Wireless Controller for PS5", price: 199, img: "https://images.unsplash.com/photo-1612287232230-67d712068065?auto=format&fit=crop&w=800&q=80" },
    { title: "Xbox Series X 1TB Gaming Console", price: 499, img: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=800&q=80" },
    { title: "SteelSeries Arctis Nova Pro Wireless Headset", price: 349, img: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80" },
    { title: "Razer BlackWidow V4 Pro Mechanical Gaming Keyboard", price: 229, img: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80" }
  ],
  12: [ // Books, Music & Media
    { title: "Audio-Technica AT-LP120X Direct-Drive Turntable", price: 349, img: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80" },
    { title: "Fender American Professional II Stratocaster Guitar", price: 1699, img: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=800&q=80" },
    { title: "Rare Vintage Pink Floyd Vinyl Record First Pressing", price: 280, img: "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=800&q=80" },
    { title: "The Lord of the Rings Deluxe Illustrated Hardcover Set", price: 175, img: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80" },
    { title: "Yamaha P-125 Digital Piano 88 Weighted Keys", price: 699, img: "https://images.unsplash.com/photo-1520523839898-50712140a3f8?auto=format&fit=crop&w=800&q=80" }
  ],
  13: [ // Cameras & Photography
    { title: "Sony Alpha 7 IV Full-Frame Mirrorless Camera", price: 2498, img: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80" },
    { title: "Canon RF 50mm f/1.2 L USM Prime Lens", price: 2099, img: "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=800&q=80" },
    { title: "DJI RS 3 Pro 3-Axis Camera Gimbal Stabilizer", price: 869, img: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80" },
    { title: "Peak Design Carbon Fiber Travel Tripod", price: 599, img: "https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?auto=format&fit=crop&w=800&q=80" },
    { title: "Leica M11 Rangefinder Digital Camera Body", price: 8995, img: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=800&q=80" }
  ],
  14: [ // Art & Collectibles
    { title: "Original Abstract Oil Painting on Canvas (48x36)", price: 1450, img: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80" },
    { title: "Contemporary Bronze Geometric Desk Sculpture", price: 680, img: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=800&q=80" },
    { title: "Handmade Ceramic Minimalist Studio Vase", price: 220, img: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80" },
    { title: "Authentic Roman Empire Silver Denarius Coin", price: 850, img: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=800&q=80" },
    { title: "Framed Fine Art Photography Print Limited Edition", price: 390, img: "https://images.unsplash.com/photo-1549887534-1541e9326642?auto=format&fit=crop&w=800&q=80" }
  ],
  15: [ // Beauty & Personal Care
    { title: "Chanel No. 5 Eau de Parfum Vaporisateur 100ml", price: 165, img: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80" },
    { title: "Dyson Supersonic Hair Dryer Copper Edition", price: 429, img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80" },
    { title: "Tom Ford Oud Wood Eau de Parfum 50ml", price: 295, img: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=800&q=80" },
    { title: "Estée Lauder Advanced Night Repair Serum Set", price: 140, img: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80" },
    { title: "Professional 24-Piece Rose Gold Makeup Brush Kit", price: 95, img: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80" }
  ],
  16: [ // Home, Furniture & Construction
    { title: "Mid-Century Modern Velvet 3-Seater Sofa", price: 1490, img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80" },
    { title: "Solid American Walnut 6-Person Dining Table", price: 1850, img: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80" },
    { title: "Eames Style Lounge Chair & Ottoman Genuine Leather", price: 1250, img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80" },
    { title: "Arched Minimalist Brass Floor Lamp with Marble Base", price: 320, img: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80" },
    { title: "Hand-Knotted Moroccan Wool Area Rug (8x10)", price: 890, img: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80" }
  ],
  17: [ // Food & Beverages
    { title: "Artisan Single-Origin Specialty Whole Bean Coffee (1kg)", price: 45, img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80" },
    { title: "Château Margaux Premier Grand Cru Vintage Red Wine", price: 850, img: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80" },
    { title: "Luxury Swiss Dark Chocolate Truffle Gift Box (48pc)", price: 65, img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=800&q=80" },
    { title: "Cold-Pressed Extra Virgin Tuscan Olive Oil (500ml)", price: 38, img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80" },
    { title: "Glenfiddich 21 Year Old Single Malt Scotch Whisky", price: 260, img: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=800&q=80" }
  ],
  18: [ // Business & Office
    { title: "Herman Miller Aeron Ergonomic Office Chair", price: 1195, img: "https://images.unsplash.com/photo-1580481077195-c3a821a506cb?auto=format&fit=crop&w=800&q=80" },
    { title: "Smart Motorized Dual-Motor Electric Standing Desk", price: 680, img: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80" },
    { title: "Dell UltraSharp 38-inch Curved WQHD+ USB-C Monitor", price: 1050, img: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80" },
    { title: "Handcrafted Top-Grain Leather Desk Pad & Organizer", price: 140, img: "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=800&q=80" },
    { title: "Logitech Brio 4K Ultra HD Business Webcam", price: 199, img: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80" }
  ],
  19: [ // Industrial & Commercial Equipment
    { title: "Caterpillar 301.8 Mini Hydraulic Excavator", price: 34500, img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80" },
    { title: "Generac Commercial Standby Diesel Generator 20kW", price: 6800, img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80" },
    { title: "Toyota Electric Counterbalanced Warehouse Forklift", price: 18500, img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80" },
    { title: "Rotary Screw Industrial Air Compressor 15HP", price: 4900, img: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80" },
    { title: "Commercial Hot Water Pressure Washer 3500 PSI", price: 2800, img: "https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=800&q=80" }
  ],
  20: [ // Gifts & Specialty Items
    { title: "Handcrafted Italian Full-Grain Leather Bi-Fold Wallet", price: 110, img: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80" },
    { title: "Parker Sonnet Fountain Pen with 18k Solid Gold Nib", price: 290, img: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=800&q=80" },
    { title: "Crystal Whiskey Decanter & Tumbler Glass Set", price: 165, img: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80" },
    { title: "Pure Mulberry Silk Scarf Gift Collection", price: 145, img: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=800&q=80" },
    { title: "Handmade Walnut Watch Display Storage Box (6 Slot)", price: 195, img: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80" }
  ],
  21: [ // Services & Local Offers
    { title: "Commercial Brand Photography & Studio Session Package", price: 850, img: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80" },
    { title: "Architectural 3D Virtual Tour & CAD Modeling Service", price: 1200, img: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80" },
    { title: "Luxury Residential Interior Design Full Consultation", price: 1500, img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80" },
    { title: "Comprehensive Corporate Brand Identity & Logo Package", price: 950, img: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80" },
    { title: "Professional Video Production & Drone Filming Day Rate", price: 1800, img: "https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=800&q=80" }
  ]
};

async function fastSeedMondo() {
  console.log("⚡ Starting fast concurrent seed for 525 Mondo Market items...");

  // Fetch all 525 items grouped by sub_category
  const itemsRes = await pool.query(`
    SELECT i.id, i.item_category, i.sub_category, sc.name as region_name,
           ROW_NUMBER() OVER (PARTITION BY i.item_category, i.sub_category ORDER BY i.id) - 1 as row_idx
    FROM item i
    JOIN item_sub_category sc ON i.sub_category = sc.id
    ORDER BY i.item_category, i.sub_category, i.id
  `);

  const rows = itemsRes.rows;
  console.log(`Fetched ${rows.length} rows to update.`);

  const CONCURRENCY = 15;
  let cursor = 0;

  async function worker() {
    while (cursor < rows.length) {
      const row = rows[cursor++];
      const catId = row.item_category;
      const prodList = CATEGORY_PRODUCTS[catId] || CATEGORY_PRODUCTS[1];
      const prod = prodList[row.row_idx % prodList.length];
      const title = `${prod.title} (${row.region_name} Edition)`;
      const desc = `Authentic verified premium product listing in ${row.region_name}. Complete with original manufacturer packaging, full warranty, and insured delivery.`;

      // Update item
      await pool.query(
        "UPDATE item SET title = $1, description = $2, price = $3, condition = 'new', status = 'approved', paid_status = true, updated_at = NOW() WHERE id = $4",
        [title, desc, prod.price, row.id]
      );

      // Update or insert item_images
      const imgRes = await pool.query("SELECT id FROM item_images WHERE item_id = $1 LIMIT 1", [row.id]);
      if (imgRes.rows.length > 0) {
        await pool.query("UPDATE item_images SET image = $1, updated_at = NOW() WHERE id = $2", [prod.img, imgRes.rows[0].id]);
      } else {
        await pool.query("INSERT INTO item_images (item_id, image, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())", [row.id, prod.img]);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  try {
    await clearAllCache();
  } catch (e) {}

  console.log("✔ Completed 525 Mondo Market items with 100% REAL product photos!");
  process.exit(0);
}

fastSeedMondo();
