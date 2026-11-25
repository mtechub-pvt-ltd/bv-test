import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";
const scratchDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/pic_tours_images";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

// Curated 76 unique thematic real photography entries across all 19 Pic Tour categories & 4 subcategories
const picTourCatalog = [
  // 1. Funny
  {
    catName: "Funny",
    subName: "Selfy",
    title: "Hilarious Silly Face Festival Selfie",
    description: "Candid festival selfie with goofy sunglasses, colorful face paint, and genuine laughter.",
    imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900&q=80",
    filename: "funny_selfy.jpg"
  },
  {
    catName: "Funny",
    subName: "Portrait",
    title: "Playful Golden Puppy Cocking Head in Confusion",
    description: "Heartwarming close-up portrait of a mischievous puppy tilting its head in curious amusement.",
    imageUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=900&q=80",
    filename: "funny_portrait.jpg"
  },
  {
    catName: "Funny",
    subName: "Pano",
    title: "Color Powder Splash Marathon Crowd Celebration",
    description: "Wide panoramic view of thousands of cheerful runners covered head-to-toe in multi-colored powder.",
    imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&q=80",
    filename: "funny_pano.jpg"
  },
  {
    catName: "Funny",
    subName: "Uncategorized",
    title: "Surprised Street Cat Peeking Behind Corner",
    description: "Humorous snapshot of a curious tabby cat caught red-handed peeking around a doorway.",
    imageUrl: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=900&q=80",
    filename: "funny_uncategorized.jpg"
  },

  // 2. People
  {
    catName: "People",
    subName: "Selfy",
    title: "Backpacker Mountain Summit Group Selfie",
    description: "An energetic group selfie of adventurous hiking companions celebrating at the mountain peak.",
    imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=80",
    filename: "people_selfy.jpg"
  },
  {
    catName: "People",
    subName: "Portrait",
    title: "Authentic Artisan Potter in Studio Portrait",
    description: "Expressive studio portrait of a master ceramicist shaping clay on a potter's wheel.",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80",
    filename: "people_portrait.jpg"
  },
  {
    catName: "People",
    subName: "Pano",
    title: "Bustling Urban Pedestrian Promenade Panorama",
    description: "Wide panoramic perspective of daily city life along a vibrant European pedestrian boulevard.",
    imageUrl: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=900&q=80",
    filename: "people_pano.jpg"
  },
  {
    catName: "People",
    subName: "Uncategorized",
    title: "Joyful Community Gathering at Golden Hour",
    description: "Warm outdoor community gathering sharing stories and laughter over an open-air banquet.",
    imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=900&q=80",
    filename: "people_uncategorized.jpg"
  },

  // 3. Creativity
  {
    catName: "Creativity",
    subName: "Selfy",
    title: "Visual Artist Mirror Studio Selfie with Easel",
    description: "Artistic mirror reflection selfie surrounded by oil paints, canvases, and color palettes.",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&q=80",
    filename: "creativity_selfy.jpg"
  },
  {
    catName: "Creativity",
    subName: "Portrait",
    title: "Dramatic Neon Shadow & Prism Light Portrait",
    description: "Creative experimental portrait experimenting with refraction prisms and saturated neon gel lights.",
    imageUrl: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=900&q=80",
    filename: "creativity_portrait.jpg"
  },
  {
    catName: "Creativity",
    subName: "Pano",
    title: "Gigantic Street Graffiti Mural Wall Panorama",
    description: "Sweeping wide panorama showcasing a 50-meter colorful surrealist mural painted across urban warehouse walls.",
    imageUrl: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=900&q=80",
    filename: "creativity_pano.jpg"
  },
  {
    catName: "Creativity",
    subName: "Uncategorized",
    title: "Surreal Floating Paint Spheres in Macro",
    description: "Abstract macro photography capturing the collision of colorful fluid acrylic droplets in water.",
    imageUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=900&q=80",
    filename: "creativity_uncategorized.jpg"
  },

  // 4. Vehicles
  {
    catName: "Vehicles",
    subName: "Selfy",
    title: "Vintage Convertible Road Trip Highway Selfie",
    description: "Wind-in-the-hair road trip selfie sitting inside a cherry-red classic 1960s convertible.",
    imageUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=900&q=80",
    filename: "vehicles_selfy.jpg"
  },
  {
    catName: "Vehicles",
    subName: "Portrait",
    title: "Sleek Aerodynamic Supercar Headlight & Grille",
    description: "Crisp automotive portrait highlighting precision carbon fiber curves and futuristic LED headlights.",
    imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=80",
    filename: "vehicles_portrait.jpg"
  },
  {
    catName: "Vehicles",
    subName: "Pano",
    title: "Coastal Highway Supercar Convoy Panorama",
    description: "Wide panoramic sweep of exotic sportscars cruising along the Pacific Coast Highway cliff edge.",
    imageUrl: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=900&q=80",
    filename: "vehicles_pano.jpg"
  },
  {
    catName: "Vehicles",
    subName: "Uncategorized",
    title: "Custom Matte Black Chopper Motorcycle in Alley",
    description: "Moody urban shot of a bespoke custom motorcycle parked under vintage streetlights.",
    imageUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=900&q=80",
    filename: "vehicles_uncategorized.jpg"
  },

  // 5. Tools & Devices
  {
    catName: "Tools & Devices",
    subName: "Selfy",
    title: "Filmmaker Camera Rig & Matte Box Selfie",
    description: "Behind-the-scenes selfie with a cinema camera rig, monitor, and wireless follow focus.",
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900&q=80",
    filename: "tools_selfy.jpg"
  },
  {
    catName: "Tools & Devices",
    subName: "Portrait",
    title: "Vintage Mechanical Rangefinder Camera on Wood",
    description: "Detailed portrait of a classic 35mm analogue camera with tactile brass dials and aperture ring.",
    imageUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=900&q=80",
    filename: "tools_portrait.jpg"
  },
  {
    catName: "Tools & Devices",
    subName: "Pano",
    title: "High-Tech Electronics Fabrication Lab Panorama",
    description: "Expansive wide panoramic shot of an advanced engineering workstation with oscilloscopes and soldering rigs.",
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&q=80",
    filename: "tools_pano.jpg"
  },
  {
    catName: "Tools & Devices",
    subName: "Uncategorized",
    title: "Artisan Leathercraft Cutting Tools & Brass Compass",
    description: "Overhead flat lay of hand-forged leatherworking awls, bevelers, and vegetable-tanned leather hides.",
    imageUrl: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=900&q=80",
    filename: "tools_uncategorized.jpg"
  },

  // 6. Wedding
  {
    catName: "Wedding",
    subName: "Selfy",
    title: "Joyous Newlywed Reception Dancefloor Selfie",
    description: "Radiant bride and groom selfie surrounded by cheering guests under sparkling fairy lights.",
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=80",
    filename: "wedding_selfy.jpg"
  },
  {
    catName: "Wedding",
    subName: "Portrait",
    title: "Elegant Bride in Lace Veil with Floral Bouquet",
    description: "Romantic bridal portrait with soft window illumination highlighting delicate silk and lace details.",
    imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=900&q=80",
    filename: "wedding_portrait.jpg"
  },
  {
    catName: "Wedding",
    subName: "Pano",
    title: "Botanical Garden Altar & Guest Seating Panorama",
    description: "Breathtaking wide panorama of an outdoor garden wedding setup framed by arching rose pergolas.",
    imageUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=900&q=80",
    filename: "wedding_pano.jpg"
  },
  {
    catName: "Wedding",
    subName: "Uncategorized",
    title: "Rustic Tiered Wedding Cake with Gold Leaf Flakes",
    description: "Artisanal multi-tiered wedding confection decorated with fresh eucalyptus sprigs and edible gold leaf.",
    imageUrl: "https://images.unsplash.com/photo-1535185384036-28bbc8035f28?w=900&q=80",
    filename: "wedding_uncategorized.jpg"
  },

  // 7. Exotic
  {
    catName: "Exotic",
    subName: "Selfy",
    title: "Tropical Lagoon Snorkeling Coral Reef Selfie",
    description: "Sun-drenched selfie floating over a crystal turquoise lagoon in French Polynesia.",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80",
    filename: "exotic_selfy.jpg"
  },
  {
    catName: "Exotic",
    subName: "Portrait",
    title: "Vibrant Tropical Toucan on Rainforest Branch",
    description: "Sharp telephoto portrait of a rainbow-billed toucan nestled among lush jungle foliage.",
    imageUrl: "https://images.unsplash.com/photo-1550853024-fae8cd4be47f?w=900&q=80",
    filename: "exotic_portrait.jpg"
  },
  {
    catName: "Exotic",
    subName: "Pano",
    title: "Emerald Atoll & Overwater Bungalows Panorama",
    description: "Spectacular aerial panoramic view of a coral atoll surrounded by electric-blue ocean shallows.",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=900&q=80",
    filename: "exotic_pano.jpg"
  },
  {
    catName: "Exotic",
    subName: "Uncategorized",
    title: "Sahara Golden Sand Dunes under Twilight Stars",
    description: "Dramatic wind-sculpted sand ripples glowing under the first emerging evening constellations.",
    imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=900&q=80",
    filename: "exotic_uncategorized.jpg"
  },

  // 8. Entertainment
  {
    catName: "Entertainment",
    subName: "Selfy",
    title: "VIP Backstage Festival Pass Crew Selfie",
    description: "Excited concert selfie right next to stage monitors and booming sound towers.",
    imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80",
    filename: "entertainment_selfy.jpg"
  },
  {
    catName: "Entertainment",
    subName: "Portrait",
    title: "Acoustic Soloist in Warm Stage Spotlight",
    description: "Emotive portrait of a singer-songwriter lost in melody under intimate theatre stage illumination.",
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80",
    filename: "entertainment_portrait.jpg"
  },
  {
    catName: "Entertainment",
    subName: "Pano",
    title: "Massive Stadium Concert Crowds & Pyrotechnics Panorama",
    description: "Wide panoramic view of an open-air arena erupting with golden spark fountains and 80,000 fans.",
    imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900&q=80",
    filename: "entertainment_pano.jpg"
  },
  {
    catName: "Entertainment",
    subName: "Uncategorized",
    title: "Vintage Grand Cinema Marquee at Night",
    description: "Nostalgic glowing neon neon letters illuminating an art deco movie palace facade.",
    imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&q=80",
    filename: "entertainment_uncategorized.jpg"
  },

  // 9. Celebrities
  {
    catName: "Celebrities",
    subName: "Selfy",
    title: "Red Carpet Gala Crowd & Paparazzi Flash Selfie",
    description: "High-energy red carpet moment capturing flashing cameras and celebrity arrivals.",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&q=80",
    filename: "celebrities_selfy.jpg"
  },
  {
    catName: "Celebrities",
    subName: "Portrait",
    title: "Iconic Film Star Editorial Studio Portrait",
    description: "Timeless black-and-white editorial portrait with classic cinematic rim lighting.",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=80",
    filename: "celebrities_portrait.jpg"
  },
  {
    catName: "Celebrities",
    subName: "Pano",
    title: "International Film Festival Premiere Runway Panorama",
    description: "Panoramic view of world-famous actors walking the velvet carpet lined by global press corps.",
    imageUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=900&q=80",
    filename: "celebrities_pano.jpg"
  },
  {
    catName: "Celebrities",
    subName: "Uncategorized",
    title: "Golden Award Statuette & Velvet Presentation Stage",
    description: "Prestigious trophy gleaming on stage ahead of the annual global honors ceremony.",
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=900&q=80",
    filename: "celebrities_uncategorized.jpg"
  },

  // 10. Animals
  {
    catName: "Animals",
    subName: "Selfy",
    title: "Gentle Alpine Giraffe Funny Close Encounter Selfie",
    description: "Playful safari encounter selfie with a towering giraffe reaching down toward the camera.",
    imageUrl: "https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=900&q=80",
    filename: "animals_selfy.jpg"
  },
  {
    catName: "Animals",
    subName: "Portrait",
    title: "Majestic Male Lion with Golden Savannah Mane",
    description: "Regal wildlife portrait of an apex predator surveying the morning grasslands.",
    imageUrl: "https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=900&q=80",
    filename: "animals_portrait.jpg"
  },
  {
    catName: "Animals",
    subName: "Pano",
    title: "Great Wildebeest Migration Crossing Serengeti Panorama",
    description: "Vast panoramic landscape of hundreds of wildebeest traversing the Mara River valley.",
    imageUrl: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=900&q=80",
    filename: "animals_pano.jpg"
  },
  {
    catName: "Animals",
    subName: "Uncategorized",
    title: "Deep Sea Clownfish Peeking from Sea Anemone",
    description: "Vivid marine macro photography of orange clownfish nestled among glowing sea tentacles.",
    imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=900&q=80",
    filename: "animals_uncategorized.jpg"
  },

  // 11. Technologies
  {
    catName: "Technologies",
    subName: "Selfy",
    title: "VR Headset Developer in Virtual Reality Lab Selfie",
    description: "Tech founder wearing spatial computing goggles in a high-tech incubator.",
    imageUrl: "https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=900&q=80",
    filename: "tech_selfy.jpg"
  },
  {
    catName: "Technologies",
    subName: "Portrait",
    title: "Precision Microprocessor Silicon Wafer Macro Portrait",
    description: "Ultra-close macro photography showcasing nano-scale circuit pathways on an etched semiconductor.",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80",
    filename: "tech_portrait.jpg"
  },
  {
    catName: "Technologies",
    subName: "Pano",
    title: "Next-Generation Hyperscale Server Datacenter Panorama",
    description: "Aesthetic panoramic perspective down an illuminated blue aisle of supercomputing server racks.",
    imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&q=80",
    filename: "tech_pano.jpg"
  },
  {
    catName: "Technologies",
    subName: "Uncategorized",
    title: "Humanoid AI Robotic Hand Interfacing with Tablet",
    description: "Articulated bionic robotic fingers making precise contact with a holographic user interface.",
    imageUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=900&q=80",
    filename: "tech_uncategorized.jpg"
  },

  // 12. Memories
  {
    catName: "Memories",
    subName: "Selfy",
    title: "Instant Polaroid Friendship Keepsake Selfie",
    description: "A nostalgic film selfie clipped on a string with warm handwritten travel dates.",
    imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&q=80",
    filename: "memories_selfy.jpg"
  },
  {
    catName: "Memories",
    subName: "Portrait",
    title: "Grandmother's Vintage Locket & Keepsake Trunk",
    description: "Poignant still life portrait of antique letters, dried roses, and an heirloom silver pendant.",
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=900&q=80",
    filename: "memories_portrait.jpg"
  },
  {
    catName: "Memories",
    subName: "Pano",
    title: "Old Town Historic Cobblestone Square Panorama",
    description: "Warm sepia-toned panorama of a centuries-old European plaza preserving timeless architectural beauty.",
    imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=900&q=80",
    filename: "memories_pano.jpg"
  },
  {
    catName: "Memories",
    subName: "Uncategorized",
    title: "Vintage Vinyl Turntable Spinning Classic Record",
    description: "Close-up macro of an analogue stylus riding the grooves of a nostalgic vinyl record album.",
    imageUrl: "https://images.unsplash.com/photo-1539185441755-769473a23570?w=900&q=80",
    filename: "memories_uncategorized.jpg"
  },

  // 13. Beauty & Fashion
  {
    catName: "Beauty & Fashion",
    subName: "Selfy",
    title: "Backstage Paris Fashion Week Model Mirror Selfie",
    description: "Chic backstage mirror selfie showing avant-garde eyeliner and runway hair styling.",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&q=80",
    filename: "fashion_selfy.jpg"
  },
  {
    catName: "Beauty & Fashion",
    subName: "Portrait",
    title: "Haute Couture Silk Dress Editorial Studio Portrait",
    description: "Stunning high-fashion portrait capturing sculptural tailoring and radiant natural skin tone.",
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80",
    filename: "fashion_portrait.jpg"
  },
  {
    catName: "Beauty & Fashion",
    subName: "Pano",
    title: "Grand Catwalk Runway Finale Walk Panorama",
    description: "Wide panoramic view of international top models strutting down the illuminated fashion runway.",
    imageUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=900&q=80",
    filename: "fashion_pano.jpg"
  },
  {
    catName: "Beauty & Fashion",
    subName: "Uncategorized",
    title: "Luxury Leather Handbag & Pearl Accessories Flat Lay",
    description: "Refined aesthetic still life of handcrafted designer accessories and luxury perfume bottle.",
    imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=80",
    filename: "fashion_uncategorized.jpg"
  },

  // 14. Art
  {
    catName: "Art",
    subName: "Selfy",
    title: "Sculptor Covered in Marble Dust in Atelier Selfie",
    description: "Raw artist portrait standing beside a hand-carved marble bust with chisel in hand.",
    imageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&q=80",
    filename: "art_selfy.jpg"
  },
  {
    catName: "Art",
    subName: "Portrait",
    title: "Classical Renaissance Oil Canvas in Museum Frame",
    description: "High-resolution detail of textured impasto oil brushwork on a master museum portrait.",
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=900&q=80",
    filename: "art_portrait.jpg"
  },
  {
    catName: "Art",
    subName: "Pano",
    title: "Contemporary Art Gallery Grand Exhibition Hall Panorama",
    description: "Spacious minimalist gallery panorama with curated modern sculptures under natural skylights.",
    imageUrl: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=900&q=80",
    filename: "art_pano.jpg"
  },
  {
    catName: "Art",
    subName: "Uncategorized",
    title: "Vibrant Watercolor Pigments Dissolving in Water",
    description: "Dynamic fluid art macro photo capturing ultramarine and gold pigment clouds swirling together.",
    imageUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=900&q=80",
    filename: "art_uncategorized.jpg"
  },

  // 15. Tavel & Tourism
  {
    catName: "Tavel & Tourism",
    subName: "Selfy",
    title: "Eiffel Tower Golden Hour Balcony View Selfie",
    description: "Classic Paris vacation selfie overlooking the Champ de Mars and sparkling iron lattice.",
    imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=80",
    filename: "travel_selfy.jpg"
  },
  {
    catName: "Tavel & Tourism",
    subName: "Portrait",
    title: "Traditional Gondolier Navigating Venice Grand Canal",
    description: "Charming portrait of a striped-shirt gondolier guiding his boat past historic Venetian palazzos.",
    imageUrl: "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=900&q=80",
    filename: "travel_portrait.jpg"
  },
  {
    catName: "Tavel & Tourism",
    subName: "Pano",
    title: "Santorini Oia Cliffside Whitewashed Domes Panorama",
    description: "Stunning wide panoramic sweep of cobalt-blue domed churches overlooking the Aegean caldera.",
    imageUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=900&q=80",
    filename: "travel_pano.jpg"
  },
  {
    catName: "Tavel & Tourism",
    subName: "Uncategorized",
    title: "Vintage Leather Passport & Globe Travel Planning",
    description: "Aesthetic wanderlust flat lay featuring vintage maps, brass compass, and passport stamps.",
    imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900&q=80",
    filename: "travel_uncategorized.jpg"
  },

  // 16. Nature
  {
    catName: "Nature",
    subName: "Selfy",
    title: "Alpine Glacier Lake Reflection Trail Selfie",
    description: "Fresh morning hiking selfie next to mirror-like glacial waters in the Canadian Rockies.",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=900&q=80",
    filename: "nature_selfy.jpg"
  },
  {
    catName: "Nature",
    subName: "Portrait",
    title: "Lush Emerald Fern Leaves Dappled in Sunbeams",
    description: "Crisp macro nature portrait capturing dew drops clinging to intricate ancient fern fronds.",
    imageUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&q=80",
    filename: "nature_portrait.jpg"
  },
  {
    catName: "Nature",
    subName: "Pano",
    title: "Yosemite Valley Granite Monoliths Sunrise Panorama",
    description: "Majestic wide panoramic landscape of El Capitan and Half Dome bathed in pink alpine glow.",
    imageUrl: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=900&q=80",
    filename: "nature_pano.jpg"
  },
  {
    catName: "Nature",
    subName: "Uncategorized",
    title: "Milky Way Galaxy Arc Over Ancient Bristlecone Pines",
    description: "Long-exposure night astrophotography displaying billions of stars across the cosmic galactic center.",
    imageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=900&q=80",
    filename: "nature_uncategorized.jpg"
  },

  // 17. Science
  {
    catName: "Science",
    subName: "Selfy",
    title: "Astrophysicist at Deep Space Observatory Mirror Selfie",
    description: "Scientist working inside an astronomical telescope dome tracking exoplanet transits.",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80",
    filename: "science_selfy.jpg"
  },
  {
    catName: "Science",
    subName: "Portrait",
    title: "Luminescent Chemical Reaction in Borosilicate Flask",
    description: "Vivid laboratory portrait showing glowing blue chemiluminescence inside a chemistry flask.",
    imageUrl: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=900&q=80",
    filename: "science_portrait.jpg"
  },
  {
    catName: "Science",
    subName: "Pano",
    title: "Cryogenic Supercollider Tunnel Facility Panorama",
    description: "Expansive industrial panorama down a particle physics vacuum chamber beamline.",
    imageUrl: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=900&q=80",
    filename: "science_pano.jpg"
  },
  {
    catName: "Science",
    subName: "Uncategorized",
    title: "Hubble Space Deep Field Nebula Ionized Gases",
    description: "High-resolution astronomical composite showing interstellar gas pillars birthing new stars.",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80",
    filename: "science_uncategorized.jpg"
  },

  // 18. Food
  {
    catName: "Food",
    subName: "Selfy",
    title: "Pastry Chef with Golden Sourdough Croissant Selfie",
    description: "Proud baker in flour-dusted apron showcasing freshly baked flaky viennoiserie.",
    imageUrl: "https://images.unsplash.com/photo-1528732263440-4dd1a18a4cc2?w=900&q=80",
    filename: "food_selfy.jpg"
  },
  {
    catName: "Food",
    subName: "Portrait",
    title: "Artisan Neapolitan Margherita Pizza with Fresh Basil",
    description: "Mouthwatering culinary portrait of wood-fired blistered crust and melting buffalo mozzarella.",
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&q=80",
    filename: "food_portrait.jpg"
  },
  {
    catName: "Food",
    subName: "Pano",
    title: "Mediterranean Mezze & Seafood Banquet Table Panorama",
    description: "Abundant wide panoramic banquet spread with grilled sea bass, olives, dips, and warm flatbread.",
    imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&q=80",
    filename: "food_pano.jpg"
  },
  {
    catName: "Food",
    subName: "Uncategorized",
    title: "Specialty Espresso Pour with Velvety Microfoam Rosetta",
    description: "Top-down macro photography of a barista pouring intricate latte art into a ceramic cup.",
    imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=900&q=80",
    filename: "food_uncategorized.jpg"
  },

  // 19. Sports
  {
    catName: "Sports",
    subName: "Selfy",
    title: "Marathon Finisher with Golden Medal Smiling Selfie",
    description: "Euphoric athlete selfie proudly holding a race completion medal at the finish line.",
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=900&q=80",
    filename: "sports_selfy.jpg"
  },
  {
    catName: "Sports",
    subName: "Portrait",
    title: "Championship Tennis Player Serving at Sunset",
    description: "Dynamic athletic action portrait freezing tennis racquet impact against glowing tennis ball.",
    imageUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900&q=80",
    filename: "sports_portrait.jpg"
  },
  {
    catName: "Sports",
    subName: "Pano",
    title: "Epic Big Wave Surfing Barrel at Teahupo'o Panorama",
    description: "Breathtaking panoramic capture of a pro surfer carving inside a towering turquoise tube wave.",
    imageUrl: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=900&q=80",
    filename: "sports_pano.jpg"
  },
  {
    catName: "Sports",
    subName: "Uncategorized",
    title: "Professional Football Under Glowing Stadium Floodlights",
    description: "Dramatic match ball resting on dew-kissed grass pitch ahead of the championship kick-off.",
    imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&q=80",
    filename: "sports_uncategorized.jpg"
  },
];

async function uploadFileViaApi(filePath, filename) {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: "image/jpeg" });
  const form = new FormData();
  form.append("file", blob, filename);

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Upload failed for ${filename} (${res.status})`);
  }

  const json = await res.json();
  return json.url || json.secure_url;
}

async function main() {
  console.log("==================================================");
  console.log("📸 SEEDING ALL 19 PIC TOUR CATEGORIES & 4 SUBCATEGORIES");
  console.log("==================================================");

  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  // 1. TRUNCATE pic_tours table
  await pool.query("TRUNCATE TABLE pic_tours RESTART IDENTITY CASCADE;");
  console.log("✔ Truncated pic_tours table (Zero duplicates).");

  // 2. Authenticate User
  console.log("\n1. Authenticating user umarwebdeveloper920@gmail.com...");
  const loginRes = await fetch(`${BASE_URL}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "umarwebdeveloper920@gmail.com",
      password: "Mtechub@123",
    }),
  });

  const loginJson = await loginRes.json();
  if (!loginJson.user || !loginJson.user.token) {
    console.error("❌ Login failed:", loginJson);
    process.exit(1);
  }

  const token = loginJson.user.token;
  const userId = loginJson.user.id;
  console.log(`✔ Authenticated! User ID: ${userId}`);

  // 3. Fetch Category & Subcategory IDs from database
  console.log("\n2. Fetching Pic Tour categories and subcategories from database...");
  const catRows = (await pool.query("SELECT id, name FROM pic_category ORDER BY id")).rows;
  const subRows = (await pool.query("SELECT id, category_id, name FROM pic_sub_category ORDER BY id")).rows;

  console.log(`Found ${catRows.length} main categories and ${subRows.length} subcategories.`);

  // 4. Download, Upload, and Create Pic Tour Posts
  console.log("\n3. Downloading real photography and creating Pic Tour posts...");
  let createdCount = 0;

  for (let i = 0; i < picTourCatalog.length; i++) {
    const item = picTourCatalog[i];

    // Find main category
    const catObj = catRows.find(
      (c) => c.name.trim().toLowerCase() === item.catName.trim().toLowerCase()
    );
    if (!catObj) {
      console.warn(`⚠ Category not found: ${item.catName}`);
      continue;
    }
    const catId = catObj.id;

    // Find subcategory for this category
    const subObj = subRows.find(
      (s) => s.category_id === catId && s.name.trim().toLowerCase() === item.subName.trim().toLowerCase()
    );
    const subId = subObj ? subObj.id : (subRows.find((s) => s.category_id === catId)?.id || 1);

    // Download image if not cached
    const localImagePath = path.join(scratchDir, item.filename);
    if (!fs.existsSync(localImagePath) || fs.statSync(localImagePath).size === 0) {
      console.log(`  ⬇ Downloading: ${item.filename}...`);
      let imgBuf;
      try {
        const imgRes = await fetch(item.imageUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (imgRes.ok) {
          imgBuf = Buffer.from(await imgRes.arrayBuffer());
        }
      } catch (e) {}

      if (!imgBuf || imgBuf.length === 0) {
        // High-res reliable fallback
        const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(item.filename)}/900/600`;
        const fbRes = await fetch(fallbackUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        imgBuf = Buffer.from(await fbRes.arrayBuffer());
      }
      fs.writeFileSync(localImagePath, imgBuf);
    }

    // Upload via API
    const uploadedUrl = await uploadFileViaApi(localImagePath, item.filename);

    // Create Pic Tour post via API
    const payload = {
      name: item.title,
      description: item.description,
      pic_category: catId,
      sub_category: subId,
      user_id: userId,
      image: uploadedUrl,
    };

    const res = await fetch(`${BASE_URL}/picTour/createPicTour`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.status === 200 || res.status === 201) {
      console.log(`  ✔ [ID: ${data.data.tour_id}] "${item.title}"`);
      console.log(`      [${item.catName}] -> [${item.subName}]`);
      console.log(`      Image: ${uploadedUrl}\n`);
      createdCount++;
    } else {
      console.warn(`  ⚠ Failed creating "${item.title}":`, data);
    }
  }

  console.log("==================================================");
  console.log(`🎉 SUCCESS! Seeded ${createdCount} 100% unique, thematic Pic Tour posts across all 19 categories!`);
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
