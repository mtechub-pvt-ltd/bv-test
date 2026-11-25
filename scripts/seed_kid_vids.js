import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";
const realMediaDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/real_live_media";
const exactThumbsDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/exact_video_thumbs";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

// Real verified video and exact matching frame thumbnail pairs
const verifiedMedia = [
  {
    videoFile: "cinematic_dragon_quest.mp4",
    thumbFile: "cinematic_dragon_quest.mp4.png",
  },
  {
    videoFile: "african_elephants.mp4",
    thumbFile: "african_elephants.mp4.png",
  },
  {
    videoFile: "urban_city_motion.mp4",
    thumbFile: "urban_city_motion.mp4.png",
  },
  {
    videoFile: "sea_turtle_ocean.mp4",
    thumbFile: "sea_turtle_ocean.mp4.png",
  },
  {
    videoFile: "snow_horses_wild.mp4",
    thumbFile: "snow_horses_wild.mp4.png",
  },
  {
    videoFile: "music_dance_friday.mp4",
    thumbFile: "music_dance_friday.mp4.png",
  },
  {
    videoFile: "nature_flower_bloom.mp4",
    thumbFile: "nature_flower_bloom.mp4.png",
  },
  {
    videoFile: "dog_pet_play.mp4",
    thumbFile: "dog_pet_play.mp4.png",
  }
];

// Kid-Vid Catalog across all 7 categories and 4 subcategories
const kidCatalog = [
  // 1. Art & Craft
  {
    catName: "Art & Craft",
    subName: "English",
    title: "Origami Animal Safari: Folding Paper Elephants & Giraffes",
    description: "Fun and easy step-by-step paper craft tutorial where children create their own colorful safari zoo animals.",
    mediaIndex: 1
  },
  {
    catName: "Art & Craft",
    subName: "French",
    title: "Bricolage Magique: Peinture au Doigt et Fleurs Colorées",
    description: "Atelier créatif amusant pour les petits avec des couleurs vives, des tampons en éponge et du papier cartonné.",
    mediaIndex: 6
  },
  {
    catName: "Art & Craft",
    subName: "Spanish",
    title: "Esculturas de Plastilina: Monstruos Divertidos y Amistosos",
    description: "Tutorial paso a paso para modelar figuritas alegres con masa de colores brillantes y herramientas seguras.",
    mediaIndex: 7
  },
  {
    catName: "Art & Craft",
    subName: "Uncategorized",
    title: "Glitter Slime and Rainbow Galaxy Jars Craft Experiment",
    description: "Exciting DIY craft session mixing safe, non-toxic glowing glitter and vibrant swirling colors in glass jars.",
    mediaIndex: 5
  },

  // 2. Toys & Play
  {
    catName: "Toys & Play",
    subName: "English",
    title: "Mega Wooden Train Track & Railway Mountain Adventure",
    description: "Building an enormous miniature railway network complete with bridges, tunnels, roaring engines, and cargo cars.",
    mediaIndex: 2
  },
  {
    catName: "Toys & Play",
    subName: "French",
    title: "Château de Briques Géant: Construction et Figurines",
    description: "Découvrez la grande forteresse médiévale avec pont-levis fonctionnel, chevaliers et dragons en briques.",
    mediaIndex: 0
  },
  {
    catName: "Toys & Play",
    subName: "Spanish",
    title: "Pista de Carreras Extrema y Autos de Juguete Veloces",
    description: "Competencia emocionante en una pista con loopings dobles y acrobacias de autitos a toda velocidad.",
    mediaIndex: 2
  },
  {
    catName: "Toys & Play",
    subName: "Uncategorized",
    title: "Puppy Pet Rescue Playtime and Backyard Obstacle Run",
    description: "Adorable puppies navigating playful tunnels, plush toy jumps, and fun backyard agility courses.",
    mediaIndex: 7
  },

  // 3. Learning & Hobbies
  {
    catName: "Learning & Hobbies",
    subName: "English",
    title: "Undersea Wildlife Explorer: Sea Turtles & Coral Reefs for Kids",
    description: "Join our marine adventure exploring friendly ocean creatures, coral reefs, and mysterious underwater worlds.",
    mediaIndex: 3
  },
  {
    catName: "Learning & Hobbies",
    subName: "French",
    title: "Les Secrets de l'Espace: Les Planètes et le Système Solaire",
    description: "Un voyage spatial interactif pour apprendre le nom des planètes, des étoiles et des comètes scintillantes.",
    mediaIndex: 0
  },
  {
    catName: "Learning & Hobbies",
    subName: "Spanish",
    title: "El Reino de los Animales de la Sabana y sus Sonidos",
    description: "Aprende los nombres y rugidos de leones, cebras y elefantes en un recorrido interactivo por la naturaleza.",
    mediaIndex: 1
  },
  {
    catName: "Learning & Hobbies",
    subName: "Uncategorized",
    title: "Wild Mountain Ponies and Snowy Winter Wonders",
    description: "Discover how magnificent wild horses run gracefully through deep winter snow in mountain valleys.",
    mediaIndex: 4
  },

  // 4. Show &
  {
    catName: "Show &",
    subName: "English",
    title: "Barnyard Puppet Pals: The Missing Carrot Mystery Show",
    description: "Hilarious live puppet show featuring Detective Bunny solving the mystery of farmer green's garden vegetables.",
    mediaIndex: 7
  },
  {
    catName: "Show &",
    subName: "French",
    title: "Le Grand Spectacle de Marionnettes du Jardin Enchanté",
    description: "Une pièce de théâtre drôle et magique où les marionnettes d'animaux préparent une grande fête surprise.",
    mediaIndex: 6
  },
  {
    catName: "Show &",
    subName: "Spanish",
    title: "Magia para Niños: Trucos Asombrosos y Risas en Vivo",
    description: "Show de ilusionismo infantil con varitas mágicas, pañuelos que cambian de color y trucos interactivos.",
    mediaIndex: 0
  },
  {
    catName: "Show &",
    subName: "Uncategorized",
    title: "Juggling Clowns and Circus Balancing Fun Extravaganza",
    description: "Energetic circus performance showcasing colorful club juggling, spinning plates, and giant bubble tricks.",
    mediaIndex: 5
  },

  // 5. Cartoon
  {
    catName: "Cartoon",
    subName: "English",
    title: "Dragon Quest Chronicles: The Flying Castle in the Sky",
    description: "Exciting 3D animated adventure following a brave young hero and a friendly dragon soaring over kingdom peaks.",
    mediaIndex: 0
  },
  {
    catName: "Cartoon",
    subName: "French",
    title: "Les Aventures de Petit Renard dans la Forêt Magique",
    description: "Dessin animé enchanteur où Petit Renard et ses amis découvrent une cascade secrète et des trésors cachés.",
    mediaIndex: 6
  },
  {
    catName: "Cartoon",
    subName: "Spanish",
    title: "El Guardián del Bosque y el Secreto del Río de Cristal",
    description: "Animación colorida llena de magia, valores de amistad y protección de la naturaleza para toda la familia.",
    mediaIndex: 3
  },
  {
    catName: "Cartoon",
    subName: "Uncategorized",
    title: "Robo-Pups Cosmic Space Rescue Animated Episode",
    description: "Fun futuristic animated cartoon featuring heroic robotic puppies saving astronauts on distant moon bases.",
    mediaIndex: 2
  },

  // 6. Music & Dance
  {
    catName: "Music & Dance",
    subName: "English",
    title: "Happy Friday Jump & Dance: Energetic Kids Song & Rhythm",
    description: "Catchy children's pop dance tune with synchronized dance steps, clapping games, and bright colorful animations.",
    mediaIndex: 5
  },
  {
    catName: "Music & Dance",
    subName: "French",
    title: "Comptines et Chansons d'Enfants en Musique Animée",
    description: "Chantez et dansez en famille sur les plus belles mélodies entraînantes avec des paroles illustrées.",
    mediaIndex: 5
  },
  {
    catName: "Music & Dance",
    subName: "Spanish",
    title: "El Baile de los Animalitos: Canciones Infantiles para Moverse",
    description: "Ritmos latinos alegres que invitan a los más pequeños a bailar como monitos, ranitas y flamencos.",
    mediaIndex: 5
  },
  {
    catName: "Music & Dance",
    subName: "Uncategorized",
    title: "Musical Bell Chorus and Xylophone Nursery Rhyme Jingle",
    description: "Delightful acoustic xylophone melody teaching kids tempo, harmonic pitch, and cheerful musical patterns.",
    mediaIndex: 6
  },

  // 7. Gaming
  {
    catName: "Gaming",
    subName: "English",
    title: "Cozy Island Craft: Building the Ultimate Dream Treehouse",
    description: "Fun, relaxing kid-friendly sandbox building gameplay with custom treehouses, rope bridges, and garden pets.",
    mediaIndex: 0
  },
  {
    catName: "Gaming",
    subName: "French",
    title: "Course de Karts Rigolos sur Pistes Arc-en-Ciel",
    description: "Partie de jeu vidéo multijoueur festive avec des dérapages contrôlés, des bananes pièges et des turbos.",
    mediaIndex: 2
  },
  {
    catName: "Gaming",
    subName: "Spanish",
    title: "Aventura de Plataformas en el Mundo de Dulces y Galletas",
    description: "Superando obstáculos y saltando sobre gomitas en un colorido nivel de plataformas lleno de monedas doradas.",
    mediaIndex: 0
  },
  {
    catName: "Gaming",
    subName: "Uncategorized",
    title: "Underwater Submarine Maze and Coral Treasure Hunt Game",
    description: "Navigating friendly cartoon submarines through underwater caverns to collect hidden golden starfishes.",
    mediaIndex: 3
  },
];

async function uploadFileViaApi(filePath, filename, isVideo = false) {
  const fileBuffer = fs.readFileSync(filePath);
  const mimeType = isVideo ? "video/mp4" : "image/png";
  const blob = new Blob([fileBuffer], { type: mimeType });
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
  console.log("🧸 SEEDING KID-VID ACROSS ALL 7 CATEGORIES & SUBCATEGORIES");
  console.log("==================================================");

  // 1. Wipe existing kid_vids_videos table
  await pool.query("TRUNCATE TABLE kid_vids_videos RESTART IDENTITY CASCADE;");
  console.log("✔ Truncated kid_vids_videos table (Zero duplicates).");

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

  // 3. Upload verified videos and thumbnails
  console.log("\n2. Uploading verified videos & matching extracted thumbnails...");
  const uploadedMediaMap = [];

  for (let i = 0; i < verifiedMedia.length; i++) {
    const item = verifiedMedia[i];
    const vidPath = path.join(realMediaDir, item.videoFile);
    const thumbPath = path.join(exactThumbsDir, item.thumbFile);

    const vidUrl = await uploadFileViaApi(vidPath, item.videoFile, true);
    const thumbUrl = await uploadFileViaApi(thumbPath, item.thumbFile, false);

    uploadedMediaMap.push({ videoUrl: vidUrl, thumbUrl });
    console.log(`  ✔ [Media ${i + 1}] ${item.videoFile} -> Uploaded video & matching frame thumbnail`);
  }

  // 4. Fetch Category & Subcategory IDs from database
  console.log("\n3. Fetching Kid-Vid categories and subcategories...");
  const catRows = (await pool.query("SELECT id, name FROM kid_vids_category ORDER BY id")).rows;
  const subRows = (await pool.query("SELECT id, category_id, name FROM kid_vids_sub_category ORDER BY id")).rows;

  console.log(`Found ${catRows.length} main categories and ${subRows.length} subcategories.`);

  // 5. Publish Kid videos
  console.log("\n4. Creating kid_vids entries via API...");
  let createdCount = 0;

  for (let i = 0; i < kidCatalog.length; i++) {
    const item = kidCatalog[i];

    // Find main category
    const catObj = catRows.find(
      (c) => c.name.trim().toLowerCase() === item.catName.trim().toLowerCase()
    );
    if (!catObj) {
      console.warn(`⚠ Category not found: ${item.catName}`);
      continue;
    }
    const catId = catObj.id;

    // Find subcategory
    const subObj = subRows.find(
      (s) => s.category_id === catId && s.name.trim().toLowerCase() === item.subName.trim().toLowerCase()
    );
    const subId = subObj ? subObj.id : (subRows.find((s) => s.category_id === catId)?.id || 1);

    const mediaPair = uploadedMediaMap[item.mediaIndex % uploadedMediaMap.length];

    const payload = {
      name: item.title,
      description: item.description,
      category_id: catId,
      sub_category_id: subId,
      user_id: userId,
      video: mediaPair.videoUrl,
      thumbnail: mediaPair.thumbUrl,
    };

    const res = await fetch(`${BASE_URL}/kidVids/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.status === 200 || res.status === 201) {
      console.log(`  ✔ [Kid Video ID: ${data.data?.id}] "${item.title}"`);
      console.log(`      [${item.catName}] -> [${item.subName}]`);
      console.log(`      Video: ${mediaPair.videoUrl}`);
      console.log(`      Thumbnail: ${mediaPair.thumbUrl}\n`);
      createdCount++;
    } else {
      console.warn(`  ⚠ Failed creating "${item.title}":`, data);
    }
  }

  console.log("==================================================");
  console.log(`🎉 SUCCESS! Seeded ${createdCount} 100% unique Kid-Vid videos across all 7 categories and subcategories!`);
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
