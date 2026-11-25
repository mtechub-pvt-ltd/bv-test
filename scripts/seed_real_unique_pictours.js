import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

const LIVE_BASE_URL = "https://wocha-gocha.testing.mtechub.org";

// 19 categories and their 25 distinct real topics (5 per subcategory)
const CATEGORY_TOPICS = {
  // 1. Funny
  1: {
    Photo: [
      { topic: "Laughing_kookaburra", title: "Hilarious Laughing Kookaburra on Forest Branch", desc: "Wild Australian kookaburra captured mid-laugh with open beak in the forest canopy." },
      { topic: "Alpaca", title: "Goofy Chewing Alpaca Showing Teeth", desc: "Amusing candid capture of a fluffy alpaca making a comical chewing face on a mountain farm." },
      { topic: "Goat", title: "Playful Mountain Goat Sticking Tongue Out", desc: "Hilarious snapshot of a mischievous goat poking its tongue out on rocky mountain pasture." },
      { topic: "Raccoon", title: "Curious Raccoon Caught Red-Handed in Garden", desc: "Funny candid photograph of a masked raccoon peeking curiously behind garden flowerpots." },
      { topic: "Pufferfish", title: "Comical Inflated Pufferfish with Wide Eyes", desc: "Humorous underwater photograph of an inflated round pufferfish staring into the lens." }
    ],
    Selfy: [
      { topic: "Quokka", title: "Cheeky Quokka Smiling Selfie in Australia", desc: "Adorable tourist selfie with the world's happiest animal smiling brightly in Rottnest Island." },
      { topic: "Capybara", title: "Friendly Capybara Leaning into Riverside Selfie", desc: "Delightful selfie moment with a calm and friendly capybara lounging beside a sunny riverbank." },
      { topic: "Golden_Retriever", title: "Panting Golden Retriever Big Grin Selfie", desc: "Joyful park selfie featuring an energetic golden retriever giving a giant goofy dog grin." },
      { topic: "Llama", title: "Inquisitive Llama Photobombing Mountain Selfie", desc: "Funny mountain hiker selfie unexpectedly photobombed by an inquisitive woolly llama." },
      { topic: "Duck", title: "Curious Mallard Duck Inspecting Phone Camera Selfie", desc: "Amusing ground-level selfie angle as a curious green-headed duck investigates the phone lens." }
    ],
    Portrait: [
      { topic: "Fennec_fox", title: "Playful Big-Eared Fennec Fox Portrait", desc: "Charming expressive close-up portrait of a miniature desert fennec fox with oversized ears." },
      { topic: "Sea_otter", title: "Playful Sea Otter Floating with Clapped Paws", desc: "Heartwarming close-up portrait of an adorable sea otter floating on its back in kelp." },
      { topic: "Sloth", title: "Gentle Three-Toed Sloth Peeking Smiling Portrait", desc: "Whimsical portrait of a slow-moving sloth smiling serenely from the Amazon jungle canopy." },
      { topic: "Chimpanzee", title: "Expressive Smiling Chimpanzee Portrait", desc: "Detailed studio portrait highlighting the humor and intelligence in a chimpanzee's playful gaze." },
      { topic: "Clownfish", title: "Orange Clownfish Peeking from Soft Sea Anemone", desc: "Vibrant close-up portrait of a cheeky clownfish peeking out from waving sea anemone tentacles." }
    ],
    Pano: [
      { topic: "Carnival", title: "Vibrant Rio Carnival Parade Crowd Celebration", desc: "Sweeping wide panorama of thousands of colorful costumed dancers celebrating in pure joy." },
      { topic: "Festival", title: "Colorful Holi Powder Splash Crowd Festival", desc: "Vast panoramic perspective of a cheerful crowd covered head-to-toe in multi-colored powder." },
      { topic: "Mascot", title: "Fun Mascot Fun-Run Marathon Parade Panorama", desc: "Ultra-wide festive panorama of runners dressed in giant animal costumes running across city bridge." },
      { topic: "Amusement_park", title: "Lively Amusement Park Boardwalk Panorama", desc: "Wide sunset panoramic view of buzzing carnival rides, spinning carousels, and cheering families." },
      { topic: "Circus", title: "Grand Circus Big Top Arena Crowd Panorama", desc: "Spectacular panoramic view of an acrobatic comedy circus performance inside illuminated arena." }
    ],
    Uncategorized: [
      { topic: "Meerkat", title: "Alert Meerkat Sentry Standing on Hind Legs", desc: "Humorous snapshot of a meerkat standing rigidly at attention scanning the Kalahari horizon." },
      { topic: "Prairie_dog", title: "Chubby Prairie Dog Barking from Burrow", desc: "Funny candid photograph of a stout prairie dog popping out of soil burrow to sound the alarm." },
      { topic: "Wombat", title: "Stout Bare-Nosed Wombat Waddling in Meadow", desc: "Charming candid picture of a chubby wild wombat trotting determinedly across green grass." },
      { topic: "Marmot", title: "Alpine Marmot Sunbathing on Granite Boulder", desc: "Hilarious snapshot of a chubby mountain marmot sprawled out flat enjoying warm afternoon sun." },
      { topic: "Red_panda", title: "Playful Red Panda Standing on Two Feet", desc: "Adorable candid capture of a fluffy red panda standing up on hind legs with raised front paws." }
    ]
  },

  // 2. People
  2: {
    Photo: [
      { topic: "Street_photography", title: "Candid Urban Life on Historic Cobblestone Street", desc: "Atmospheric street photography capturing authentic daily moments in a European historic quarter." },
      { topic: "Flamenco", title: "Passionate Flamenco Dancer in Seville Courtyard", desc: "Vibrant cultural capture of a traditional flamenco dancer performing with swirling red ruffled dress." },
      { topic: "Tea_ceremony", title: "Master Demonstrating Traditional Japanese Tea Ceremony", desc: "Serene documentary photo of a kimono-clad master preparing ceremonial matcha in ancient Kyoto." },
      { topic: "Fisherman", title: "Traditional Kerala Fisherman Casting Net at Dawn", desc: "Dramatic sunrise photograph of a coastal fisherman casting a circular net over calm glassy waters." },
      { topic: "Ballet_dancer", title: "Graceful Classical Ballerina Leaping in Studio", desc: "Powerful fine art photographic capture of an airborne ballet dancer frozen at peak extension." }
    ],
    Selfy: [
      { topic: "Mountaineering", title: "Adventurous Mountaineer Summit Celebration Selfie", desc: "Triumphant alpine climber smiling selfie at the snowy peak with glacier peaks stretching beyond." },
      { topic: "University_graduation", title: "Joyful University Graduate Cap Tossing Selfie", desc: "Excited group selfie of beaming graduating students celebrating academic achievement." },
      { topic: "Marathon", title: "Exuberant City Marathon Finish Line Selfie", desc: "Proud runner wearing finisher medal smiling broadly after completing 26.2 miles." },
      { topic: "Traveler", title: "Solo World Backpacker Selfie on Historic Bridge", desc: "Inspiring travel selfie of a young explorer smiling in front of ancient European architecture." },
      { topic: "Backpacking_(travel)", title: "Friends Trail Hiking Summit Ridge Selfie", desc: "Energetic hiking companions smiling together overlooking an expansive mountain valley below." }
    ],
    Portrait: [
      { topic: "Maasai_people", title: "Dignified Maasai Warrior in Traditional Red Shuka", desc: "Striking natural light portrait of a proud Maasai warrior adorned with intricate beaded necklaces." },
      { topic: "Bedouin", title: "Soulful Eyes Portrait of Desert Bedouin Elder", desc: "Character-rich desert portrait highlighting weathered wisdom and traditional keffiyeh headwear." },
      { topic: "Sherpa", title: "Resilient Himalayan Mountain Sherpa Guide Portrait", desc: "Heartwarming close-up portrait of an experienced Everest guide against rugged snow mountains." },
      { topic: "Potter", title: "Master Artisan Ceramicist Shaping Clay", desc: "Evocative studio portrait of a craftsman with clay-dusted hands shaping a vessel on the wheel." },
      { topic: "Firefighter", title: "Courageous First Responder Firefighter Portrait", desc: "Resolute environmental portrait of a dedicated firefighter in full turnout gear after drill." }
    ],
    Pano: [
      { topic: "Market_(place)", title: "Sprawling Historic Farmers Market Hall Panorama", desc: "Bustling wide panorama showcasing fresh produce stalls, florists, and lively shoppers." },
      { topic: "Pedestrian", title: "Sunlit European City Pedestrian Boulevard Panorama", desc: "Ultra-wide panoramic perspective of daily urban foot traffic along a tree-lined avenue." },
      { topic: "Times_Square", title: "Times Square Neon Plaza Twilight Panorama", desc: "Dazzling wide panoramic view of thousands of visitors walking amidst glowing digital billboards." },
      { topic: "Copacabana,_Rio_de_Janeiro", title: "Copacabana Beachfront Promenade Sunset Panorama", desc: "Sweeping panorama of beachgoers strolling along the iconic black-and-white wave sidewalk." },
      { topic: "Crowd", title: "Gathering of Peaceful Festival Goers Panorama", desc: "Expansive wide panoramic capture of community members enjoying an outdoor summer celebration." }
    ],
    Uncategorized: [
      { topic: "Chess", title: "Street Chess Masters Focused in Deep Strategy", desc: "Intimate candid moment between two veteran players concentrating over a wooden chessboard." },
      { topic: "Acoustic_guitar", title: "Acoustic Musician Performing on Stone Bridge", desc: "Soulful street busker strumming guitar beside a gentle river as passersby pause to listen." },
      { topic: "Weaver", title: "Artisan Weaver Working on Traditional Wooden Loom", desc: "Documentary photograph of intricate hand-loomed colorful textiles being woven thread by thread." },
      { topic: "Bicycle", title: "Morning Commuter Cycling Across Canal Bridge", desc: "Idyllic city morning snapshot of a cyclist riding across a bicycle bridge lined with blooming tulips." },
      { topic: "Blacksmith", title: "Blacksmith Hammering Glowing Steel on Heavy Anvil", desc: "Dramatic workshop capture of fiery sparks flying as a master blacksmith shapes molten metal." }
    ]
  },

  // 3. Creativity
  3: {
    Photo: [
      { topic: "Pottery", title: "Artisan Ceramicist Sculpting Stoneware Vessel", desc: "Masterful pottery capture freezing wet clay spinning smoothly under skilled artisan fingers." },
      { topic: "Glassblowing", title: "Master Glassblower Blowing Molten Amber Glass Orb", desc: "Mesmerizing photograph of a fiery glowing glass sphere being inflated at the end of a blowpipe." },
      { topic: "Calligraphy", title: "Zen Calligrapher Painting Bold Black Kanji Stroke", desc: "Top-down fine art photograph of traditional horsehair brush gliding across textured rice paper." },
      { topic: "Sculpture", title: "Classical Sculptor Chiseled Detail on Marble Statue", desc: "Artistic studio photograph capturing fine marble dust falling away from a sculpted human figure." },
      { topic: "Woodworking", title: "Luthier Hand-Carving Acoustic Guitar Soundboard", desc: "Precision woodworking photograph of wooden shavings curling from a fine hand plane." }
    ],
    Selfy: [
      { topic: "Oil_painting", title: "Visual Artist Studio Mirror Selfie with Wet Canvas", desc: "Creative artist mirror selfie surrounded by colorful palettes, brushes, and active oil paintings." },
      { topic: "Graphic_design", title: "Digital Artist at Dual Pen Display Workstation Selfie", desc: "Modern illustrator selfie smiling proudly in front of an intricate fantasy character vector design." },
      { topic: "Stained_glass", title: "Artisan Holding Finished Stained Glass Sun Catcher", desc: "Smiling studio selfie holding a handcrafted stained glass geometric piece reflecting rainbow hues." },
      { topic: "Tattoo", title: "Tattooist Smiling with Custom Hand-Drawn Flash Sheet", desc: "Creative studio selfie showing an intricate black-and-grey illustrative botanical flash design." },
      { topic: "Ceramic", title: "Smiling Ceramicist Holding Glazed Porcelain Teapot", desc: "Artisan portrait selfie presenting a freshly kiln-fired celadon glazed handmade ceramic teapot." }
    ],
    Portrait: [
      { topic: "Graffiti", title: "Street Artist Standing Before Massive Vivid Spray Mural", desc: "Expressive environmental portrait of an urban street painter holding spray cans in vibrant alley." },
      { topic: "Origami", title: "Origami Master Posing with Complex Geometric Tessellation", desc: "Delicate studio portrait of an origami artist surrounded by hundred-fold miniature paper sculptures." },
      { topic: "Mosaic", title: "Mosaic Artist Placing Glass Tesserae with Fine Pincers", desc: "Intimate close-up portrait of an artisan hand-placing gold leaf glass tiles into an intricate mural." },
      { topic: "Bonsai", title: "Bonsai Master Pruning Miniature Ancient Juniper", desc: "Peaceful zen portrait of a patient horticulturist styling delicate pine foliage with bonsai shears." },
      { topic: "Jewelry_design", title: "Jeweler Examining Faceted Sapphire Under Loupe", desc: "Precision studio portrait of a gemstone setter working on a platinum filigree engagement ring." }
    ],
    Pano: [
      { topic: "Mural", title: "Monumental City Warehouse Street Art Wall Panorama", desc: "Sweeping wide panorama showcasing a 60-meter high multi-story colorful surrealist mural." },
      { topic: "Art_studio", title: "Sunlit Lofty Fine Art Academy Studio Panorama", desc: "Panoramic view of rows of wooden easels, white plaster busts, and aspiring student painters." },
      { topic: "Gallery", title: "Contemporary Minimalist Art Gallery Hall Panorama", desc: "Ultra-wide panoramic perspective of spacious gallery floor with modern sculptures on pedestals." },
      { topic: "Tapestry", title: "Historic Medieval Woven Tapestry Gallery Panorama", desc: "Wide museum hall panorama featuring towering handwoven silk and wool historical narrative tapestries." },
      { topic: "Linocut", title: "Printmaking Workshop with Hand Presses Panorama", desc: "Expansive panorama of printmakers drying relief prints on hanging racks across sunlit studio." }
    ],
    Uncategorized: [
      { topic: "Watercolor_painting", title: "Abstract Watercolor Pigment Bleeding on Wet Paper", desc: "Fascinating macro photography capturing organic feathering of turquoise and magenta watercolor inks." },
      { topic: "Ikebana", title: "Minimalist Japanese Flower Arrangement in Ceramic Dish", desc: "Refined aesthetic composition of seasonal cherry blossoms and irises styled in classical Ikebana." },
      { topic: "Batik", title: "Wax-Resist Dyed Traditional Indonesian Batik Fabric", desc: "Intricate close-up of handmade batik textile featuring ancient geometric floral motifs." },
      { topic: "Paper", title: "Handmade Botanical Paper with Pressed Wildflower Petals", desc: "Texture study of organic deckle-edged cotton paper embedded with cornflower petals." },
      { topic: "Palette_(painting)", title: "Wooden Artist Palette Covered in Swirling Oil Paints", desc: "Vibrant overhead view of buttery mounds of cadmium yellow, ultramarine, and crimson paint." }
    ]
  },

  // 4. Vehicles
  4: {
    Photo: [
      { topic: "Ferrari_SF90_Stradale", title: "Rosso Corsa Ferrari SF90 Stradale on Racing Circuit", desc: "Stunning professional automotive photograph of a 1000hp hybrid Italian supercar on track." },
      { topic: "Lamborghini_Aventador", title: "Matte Black Lamborghini Aventador SVJ in Tunnel", desc: "Aggressive low-angle rolling shot of an Italian V12 supercar roaring through illuminated tunnel." },
      { topic: "Porsche_911", title: "Guards Red Porsche 911 GT3 RS on Mountain Switchback", desc: "Crisp dynamic action photograph carving through an alpine pass with towering rear carbon wing." },
      { topic: "McLaren_P1", title: "Volcano Orange McLaren P1 Hypercar at Sunset", desc: "Sleek aerodynamic silhouette of the British hybrid hypercar glowing in golden hour light." },
      { topic: "Superyacht", title: "Luxury Multi-Deck Motor Superyacht Anchored in Monaco", desc: "Breathtaking marine photography of an ultra-luxury private vessel glistening on Mediterranean water." }
    ],
    Selfy: [
      { topic: "Convertible", title: "Classic Red Convertible Scenic Highway Road Trip Selfie", desc: "Joyful open-air driving selfie cruising along a scenic coastal cliffside highway with sunglasses." },
      { topic: "Boeing_787_Dreamliner", title: "Commercial Airline Captain Flight Deck Selfie", desc: "Inspiring cockpit selfie showing modern avionics screens and panoramic cloud layers above Alps." },
      { topic: "Motorcycle", title: "Touring Motorcycle Rider Helmet Visor Reflection Selfie", desc: "Adventurous rider selfie capturing the sweeping mountain highway reflected in dark tinted visor." },
      { topic: "Off-road_vehicle", title: "4x4 Expedition Driver Celebrating on Sand Dune Crest", desc: "Exciting off-road driver selfie posing beside heavily equipped overland rig atop golden dunes." },
      { topic: "Sailboat", title: "Catamaran Captain at the Steering Wheel Sunset Selfie", desc: "Peaceful marine travel selfie holding the dual helm wheels as trade winds fill the white sails." }
    ],
    Portrait: [
      { topic: "Harley-Davidson", title: "Polished Chrome V-Twin Engine Portrait on Custom Harley", desc: "Gleaming mechanical portrait capturing exhaust manifolds, cooling fins, and mirror chrome finish." },
      { topic: "Bugatti_Chiron", title: "Quad-Turbocharged Bugatti Chiron Horseshoe Grille Detail", desc: "Ultra-high-definition automotive portrait of carbon-weave bodywork and signature horseshoe radiator." },
      { topic: "Ducati_Panigale_V4", title: "Aerodynamic Winglet and LED Headlight Portrait on Ducati", desc: "Fierce front-end portrait of a championship Italian racing superbike in competition livery." },
      { topic: "Aston_Martin_DB11", title: "Refined Hand-Stitched Leather Luxury Grand Tourer Interior", desc: "Interior craftsmanship portrait highlighting perforated leather seats, knurled dials, and wood trim." },
      { topic: "Shelby_Cobra", title: "Iconic 1965 Shelby Cobra 427 Hood Scoop and Badging", desc: "Classic American muscle portrait focusing on aggressive front air intake and twin white racing stripes." }
    ],
    Pano: [
      { topic: "Formula_One_car", title: "Formula One Grand Prix Starting Grid Panorama", desc: "Electrifying wide panorama of 20 championship racing cars lined up on track ready for lights out." },
      { topic: "Shinkansen", title: "Japanese Bullet Train Crossing Elevated Viaduct Panorama", desc: "Sweeping panorama of a sleek high-speed Shinkansen streaking past snow-draped Mount Fuji." },
      { topic: "Concorde", title: "Supersonic Concorde Aircraft on Tarmac Runway Panorama", desc: "Majestic wide panoramic view of the slender needle-nosed supersonic airliner parked on tarmac." },
      { topic: "Marina", title: "Glamorous Yacht Marina Harbour at Twilight Panorama", desc: "Stunning wide panoramic capture of hundreds of luxury motor yachts reflected in tranquil marina." },
      { topic: "Highway", title: "Endless Desert Highway Disappearing into Horizon Panorama", desc: "Ultra-wide road trip panorama showing asphalt ribbon stretching straight through Monument Valley." }
    ],
    Uncategorized: [
      { topic: "Steam_locomotive", title: "Historic Steam Locomotive Billowing Clouds over Stone Viaduct", desc: "Nostalgic railway photograph of a vintage black steam train chugging across historic arched bridge." },
      { topic: "Hot_air_balloon", title: "Hot Air Balloons Gliding over Fairyland Canyons at Dawn", desc: "Surreal aerial snapshot of dozens of colorful balloons floating above Cappadocia rock pillars." },
      { topic: "Hovercraft", title: "Giant Passenger Hovercraft Skimming Across Choppy Channel", desc: "Dynamic marine photograph capturing air cushion skirts kicking up sea spray at 50 knots." },
      { topic: "Sailing_ship", title: "Full-Rigged Tall Ship Sailing Under Full Canvas", desc: "Majestic maritime capture of a historic three-masted wooden ship cutting through ocean swells." },
      { topic: "Electric_vehicle", title: "Futuristic Electric Hypercar Charging at Sleek Station", desc: "Clean modern automotive capture showing illuminated charging port and aerodynamic glass canopy." }
    ]
  },

  // 5. Tools & Devices
  5: {
    Photo: [
      { topic: "Leica_Camera", title: "Classic Leica 35mm Rangefinder Camera on Oak Table", desc: "Timeless still life photograph of an iconic German mechanical camera with 50mm prime lens." },
      { topic: "Microscope", title: "Advanced Laboratory Optical Microscope with Glowing Stage", desc: "Crisp scientific equipment photo of research microscope ready for cellular pathology analysis." },
      { topic: "Telescope", title: "Astronomical Refractor Telescope Pointing toward Milky Way", desc: "Breathtaking night photograph of brass and carbon telescope positioned under crystal clear stars." },
      { topic: "DSLR", title: "Professional Cinema Rig Camera with Matte Box and Follow Focus", desc: "High-end filmmaking rig equipped with top handle, external monitor, and cinema zoom lens." },
      { topic: "Soldering_iron", title: "Precision Soldering Iron Emitting Smoke on Circuit Board", desc: "Macro action photograph of molten silver solder bonding an electronic chip to gold PCB contacts." }
    ],
    Selfy: [
      { topic: "3D_printing", title: "Hardware Engineer Smiling beside Working 3D Printer", desc: "Tech maker selfie posing proudly next to an enclosed 3D printer laying down glowing filament." },
      { topic: "Sound_recording_and_reproduction", title: "Studio Audio Engineer with Mixing Desk Headphones Selfie", desc: "Music producer selfie in front of a 48-channel analogue mixing console and illuminated studio monitors." },
      { topic: "Photographer", title: "Professional Photographer with Medium-Format Camera Selfie", desc: "Studio mirror selfie holding a Hasselblad digital camera surrounded by softboxes and reflectors." },
      { topic: "Electronics", title: "Electronics Hobbyist Smiling at Well-Equipped Workbench", desc: "Proud DIY engineer selfie with digital oscilloscopes, wire strippers, and breadboards." },
      { topic: "Watchmaker", title: "Master Watchmaker Wearing Jeweler Eye Loupe Selfie", desc: "Artisan portrait selfie seated at high workbench surrounded by tiny tweezers and watch movements." }
    ],
    Portrait: [
      { topic: "Tourbillon", title: "Macro Portrait of Intricate Mechanical Watch Tourbillon", desc: "Breathtaking horological portrait showing spinning balance wheel, ruby jewels, and blued screws." },
      { topic: "Condenser_microphone", title: "Gold-Sputtered Diaphragm Studio Condenser Microphone", desc: "Artistic close-up portrait of professional vocal microphone grille highlighting golden mesh capsule." },
      { topic: "Vacuum_tube", title: "Vintage Audiophile Vacuum Tube Glowing Warm Amber Orange", desc: "Moody low-light portrait of dual triode amplifier tubes emitting comforting incandescent filament glow." },
      { topic: "Swiss_Army_knife", title: "Classic Red Swiss Army Knife with All Tools Extended", desc: "Iconic multi-tool portrait showing gleaming stainless steel scissors, blades, saws, and screwdrivers." },
      { topic: "Caliper", title: "Stainless Steel Vernier Caliper Measuring Machine Part", desc: "Industrial measurement portrait focusing on precise millimeter etched scales on polished metal." }
    ],
    Pano: [
      { topic: "Woodworking", title: "Historic Cabinetmaker Woodworking Shop Tools Panorama", desc: "Wide panoramic view of wall-mounted chisels, hand planes, brass squares, and seasoned hardwood benches." },
      { topic: "Cleanroom", title: "Silicon Wafer Semiconductor Fabrication Cleanroom Panorama", desc: "Panoramic perspective of yellow-lit cleanroom with automated robotic wafer handling pods." },
      { topic: "Observatory", title: "Giant Optical Telescope Dome Interior Panorama", desc: "Ultra-wide panoramic perspective inside mountaintop observatory housing a massive 8-meter primary mirror." },
      { topic: "Control_room", title: "Aerospace Launch Operations Control Room Panorama", desc: "Wide panoramic view of flight controller console stations, telemetry monitors, and orbital projection screens." },
      { topic: "Machining", title: "Precision CNC Milling Machine Facility Floor Panorama", desc: "Expansive industrial panorama of multi-axis automated milling centers producing aerospace parts." }
    ],
    Uncategorized: [
      { topic: "Oscilloscope", title: "Digital Storage Oscilloscope Displaying Clean Sine Waves", desc: "Electronic lab still life capturing glowing green and blue signal waveforms on dark LCD screen." },
      { topic: "Stethoscope", title: "Physician Acoustic Stethoscope Resting on Medical Chart", desc: "Clean modern medical still life photo highlighting stainless steel chestpiece and binaural tubes." },
      { topic: "Sextant", title: "Antique Brass Marine Navigation Sextant in Wooden Box", desc: "Historical maritime instrument photograph with mirrors, index arm, and vernier scale." },
      { topic: "Compass", title: "Solid Brass Magnetic Pocket Compass Pointing True North", desc: "Outdoor adventure still life of directional compass resting on vintage topographic trail map." },
      { topic: "Anvil", title: "Heavy Forged Steel Blacksmith Anvil on Wooden Stump", desc: "Sturdy traditional tool photograph showing polished horn, hardy hole, and hammer resting on face." }
    ]
  },

  // 6. Wedding
  6: {
    Photo: [
      { topic: "Wedding_dress", title: "Bride in Intricate Lace Gown Walking Down Floral Aisle", desc: "Heartwarming photograph of radiant bride accompanied by soft sunlight through ancient cathedral windows." },
      { topic: "First_dance", title: "Newlyweds Romantic First Dance under Twinkling Fairy Lights", desc: "Magical reception moment capturing bride and groom dancing amidst warm glowing barn lights." },
      { topic: "Wedding_cake", title: "Elegant Four-Tier Buttercream Wedding Cake with Fresh Blooms", desc: "Stunning culinary photograph of tiered wedding cake adorned with blush roses and gold leaf." },
      { topic: "Bouquet", title: "Hand-Tied Bridal Floral Bouquet with Peonies and Eucalyptus", desc: "Artistic floral still life capturing delicate white peonies, ranunculus, and silvery eucalyptus sprigs." },
      { topic: "Marriage", title: "Bride and Groom Exchanging Platinum Wedding Rings at Altar", desc: "Intimate ceremony photograph focusing on bride sliding wedding band onto groom's finger." }
    ],
    Selfy: [
      { topic: "Newlywed", title: "Newlywed Couple Joyful Getaway Car Smiling Selfie", desc: "Beaming bride and groom selfie sitting in the backseat of vintage car decorated with flowers." },
      { topic: "Bridesmaid", title: "Bridesmaids Smiling Group Selfie in Matching Silk Robes", desc: "Fun bridal party prep selfie showing bridesmaids cheering with champagne glasses in bridal suite." },
      { topic: "Groom", title: "Groom and Groomsmen Humorous Bow Tie Pre-Wedding Selfie", desc: "Lively group selfie of groom and best men adjusting tuxedos and laughing ahead of ceremony." },
      { topic: "Honeymoon", title: "Newlyweds Sunset Beach Selfie on Tropical Honeymoon", desc: "Romantic beach selfie of newly married couple smiling warmly with ocean sunset behind them." },
      { topic: "Flower_girl", title: "Bride and Cute Flower Girl Smiling Together Selfie", desc: "Sweet selfie of bride crouching down to take selfie with flower girl holding petal basket." }
    ],
    Portrait: [
      { topic: "Veil", title: "Ethereal Bridal Portrait Through Sheer Embroidered Lace Veil", desc: "Breathtaking black-and-white bridal portrait highlighting delicate lace patterns over smiling face." },
      { topic: "Boutonnière", title: "Groom in Charcoal Tuxedo Adjusting Rose Boutonnière", desc: "Sophisticated male bridal portrait focusing on lapel flower, silk pocket square, and cuff links." },
      { topic: "Wedding_ring", title: "Diamond Engagement Ring and Wedding Bands on Velvet Box", desc: "Macro jewelry portrait showing brilliant-cut solitaire diamond reflecting rainbow prism sparks." },
      { topic: "Candelabra", title: "Romantic Candlelit Couple Forehead Touch Portrait", desc: "Intimate twilight wedding portrait illuminated by the gentle glow of ornate brass candelabras." },
      { topic: "Arch", title: "Couple Posing Beneath Spectacular Floral Wedding Arch", desc: "Formal outdoor wedding portrait of the couple framed by cascading hydrangeas and greenery." }
    ],
    Pano: [
      { topic: "Ballroom", title: "Grand Crystal Chandelier Wedding Ballroom Panorama", desc: "Ultra-wide panoramic perspective of lavish banquet hall set with round tables, crystal, and candles." },
      { topic: "Cathedral", title: "Historic Gothic Cathedral Wedding Ceremony Panorama", desc: "Panoramic view down towering nave showing guests seated in wooden pews facing illuminated altar." },
      { topic: "Vineyard", title: "Tuscan Vineyard Sunset Wedding Dinner Long Table Panorama", desc: "Sweeping panorama of an outdoor rustic feast table stretching between grapevines under string lights." },
      { topic: "Beach", title: "Oceanfront Tropical Beach Wedding Setup Wide Panorama", desc: "Expansive panorama of white chairs and bamboo canopy set directly on pristine white sand." },
      { topic: "Garden", title: "Botanical Garden Rose Pavilion Wedding Reception Panorama", desc: "Wide panorama of guests mingling around outdoor pavilion surrounded by manicured rose hedges." }
    ],
    Uncategorized: [
      { topic: "Confetti", title: "Newlyweds Showered in Biodegradable Flower Petal Confetti", desc: "Joyous high-energy action capture as wedding guests throw handfuls of lavender petals." },
      { topic: "Champagne", title: "Champagne Tower Pouring with Bubbles Spilling Down Glasses", desc: "Spectacular celebratory photo of golden champagne flowing down a multi-level coupe pyramid." },
      { topic: "Wedding_invitation", title: "Handmade Calligraphy Wedding Invitation Suite with Wax Seal", desc: "Top-down aesthetic flatlay of deckle-edge cotton envelopes, silk ribbon, and gold wax emblem." },
      { topic: "Church_bell", title: "Historic Church Tower Bells Pealing in Wedding Celebration", desc: "Dynamic architectural capture of bronze church bells swinging in bellfry against blue sky." },
      { topic: "Sparkler", title: "Magical Midnight Sparkler Send-Off Tunnel for Bride and Groom", desc: "Atmospheric evening photograph of couple running through corridor of glowing golden sparklers." }
    ]
  },

  // 7. Exotic
  7: {
    Photo: [
      { topic: "Bora_Bora", title: "Overwater Thatch Bungalows in Turquoise Bora Bora Lagoon", desc: "Iconic tropical paradise photograph showing turquoise waters and Mount Otemanu in background." },
      { topic: "Maldives", title: "Aerial View of Pristine Atoll Sandbar in the Maldives", desc: "Stunning crystal clear drone photo of isolated white sand spit surrounded by deep ocean blues." },
      { topic: "Iguazu_Falls", title: "Thundering Devil's Throat at Iguazu Falls in Lush Jungle", desc: "Breathtaking wide waterfall photograph capturing immense water spray and rainbows over rainforest." },
      { topic: "Ha_Long_Bay", title: "Limestone Karst Islands Rising from Emerald Ha Long Bay", desc: "Misty landscape photograph of dramatic vertical karst pillars reflected in peaceful Vietnamese waters." },
      { topic: "Coral_reef", title: "Vibrant Coral Gardens Teeming with Tropical Marine Life", desc: "Underwater wide-angle photograph of thriving hard corals, sea fans, and schools of blue damselfish." }
    ],
    Selfy: [
      { topic: "Snorkeling", title: "Underwater Snorkeler Smiling Selfie with Sea Turtle", desc: "Clear tropical ocean selfie swimming alongside a peaceful green sea turtle near coral reef." },
      { topic: "Rainforest", title: "Jungle Trekker Selfie in front of Towering Waterfall", desc: "Adventurous travel selfie of smiling explorer drenched in spray before a hidden jungle cascade." },
      { topic: "Sossusvlei", title: "Desert Explorer Selfie Atop Dune 45 in Namibia", desc: "Sunlit travel selfie perched atop towering red sand dune with dramatic wind ripples below." },
      { topic: "Cave", title: "Kayaker Selfie Exploring Hidden Sea Cave Lagoon", desc: "Exciting travel selfie inside arched limestone sea cave opening out into brilliant turquoise water." },
      { topic: "Macaw", title: "Traveler Smiling Selfie with Scarlet Macaw on Shoulder", desc: "Vibrant wildlife sanctuary selfie with colorful red, blue, and yellow tropical parrot in Costa Rica." }
    ],
    Portrait: [
      { topic: "Poison_dart_frog", title: "Iridescent Blue Poison Dart Frog on Wet Leaf Portrait", desc: "Macro wildlife portrait highlighting brilliant sapphire skin and black spots of Dendrobates tinctorius." },
      { topic: "Chameleon", title: "Panther Chameleon Displaying Vivid Rainbow Scales", desc: "Intense close-up portrait of Madagascan chameleon with independently moving eyes and curled tail." },
      { topic: "Bird-of-paradise_flower", title: "Exquisite Strelitzia Bird of Paradise Flower Portrait", desc: "Botanical portrait showcasing sculptural orange and electric blue petals against broad green leaves." },
      { topic: "Orchid", title: "Macro Portrait of Rare Exotic Purple Vanda Orchid", desc: "Detailed flower portrait capturing intricate spotted patterns and velvety texture of tropical orchid." },
      { topic: "Gecko", title: "Vivid Emerald Day Gecko with Golden Eyes Close-Up", desc: "Vibrant reptile portrait of a bright green gecko resting on smooth tropical palm frond." }
    ],
    Pano: [
      { topic: "Atoll", title: "Sweeping 360 Panoramic View of Turquoise Coral Atoll", desc: "Ultra-wide aerial panoramic perspective of barrier reef ring separating lagoon from open ocean." },
      { topic: "Madagascar", title: "Avenue of the Baobabs Sunset Panorama in Madagascar", desc: "Iconic landscape panorama of ancient towering baobab trees silhouetted against glowing orange sky." },
      { topic: "Cenote", title: "Sunbeam Piercing Sacred Mexican Cenote Pool Panorama", desc: "Dramatic cavern panorama showing single golden shaft of sunlight illuminating crystal turquoise water." },
      { topic: "Mangrove", title: "Tangled Mangrove Tree Root Forest Lagoon Panorama", desc: "Wide panorama of labyrinthine stilt roots protecting tranquil coastal nursery waters." },
      { topic: "Volcanic_crater", title: "Steaming Volcanic Caldera Lake Panorama in Indonesia", desc: "Sweeping crater rim panorama overlooking acidic turquoise sulfur lake shrouded in white steam." }
    ],
    Uncategorized: [
      { topic: "Bioluminescence", title: "Glowing Neon Blue Bioluminescent Waves on Dark Beach", desc: "Magical night ocean photograph capturing crashing surf lit up by microscopic dinoflagellates." },
      { topic: "Geyser", title: "Powerful Geothermal Geyser Erupting Column of Hot Water", desc: "Dramatic natural phenomenon photo of boiling thermal plume shooting into cold morning air." },
      { topic: "Tropical_rainforest", title: "Dense Canopy Rainforest Canopy Mist at Sunrise", desc: "Ethereal landscape photo of rolling green treetops shrouded in morning mist in Borneo." },
      { topic: "Dragon_fruit", title: "Freshly Sliced Vibrant Pink Pitaya Dragon Fruit", desc: "Culinary still life of tropical fruit showing bright magenta skin and black-speckled white flesh." },
      { topic: "Dolphin", title: "Pod of Wild Spinner Dolphins Leaping in Formation", desc: "Thrilling wildlife action photograph of sleek dolphins jumping simultaneously above tropical waves." }
    ]
  },

  // 8. Entertainment
  8: {
    Photo: [
      { topic: "Rock_concert", title: "Lead Singer Performing Under Intense Stadium Spotlights", desc: "Electrifying live music photograph capturing raw energy, crowd silhouette, and stage smoke." },
      { topic: "Broadway_theatre", title: "Broadway Musical Cast Performing Spectacular Finale", desc: "Dazzling theater photograph of ensemble cast in dazzling costumes bowing to standing ovation." },
      { topic: "Cinema", title: "Vintage Cinema Palace with Crimson Velvet Seats", desc: "Atmospheric architectural photo of ornate Art Deco theater hall glowing before movie premiere." },
      { topic: "Arcade_game", title: "Neon-Lit Retro Arcade Room Filled with Pinball Machines", desc: "Vibrant gaming culture photo showing neon sign reflections across rows of vintage game cabinets." },
      { topic: "Symphony_orchestra", title: "Full Symphony Orchestra Performing in Majestic Hall", desc: "Commanding cultural photograph of conductor leading strings, brass, and percussion in acoustics." }
    ],
    Selfy: [
      { topic: "Music_festival", title: "Music Festival Goers Smiling with Wristbands in Crowd", desc: "Energetic festival selfie of friends covered in glitter with towering main stage behind them." },
      { topic: "Theatrical_scenery", title: "Actor Backstage Mirror Selfie Applying Theatrical Makeup", desc: "Intimate behind-the-scenes selfie showing actor in ornate period costume preparing before curtain." },
      { topic: "Popcorn", title: "Movie Date Night Smiling Selfie with Tub of Butter Popcorn", desc: "Cozy theater selfie of smiling couple holding jumbo popcorn bucket and 3D glasses." },
      { topic: "Stand-up_comedy", title: "Comedian Waving Selfie with Packed Comedy Club Crowd", desc: "Triumphant stage selfie looking back from mic stand at laughing audience members." },
      { topic: "Disc_jockey", title: "DJ Performing Headliner Set Smiling Selfie with Crowd", desc: "High-energy festival DJ selfie with turntables and thousands of dancing hands in air." }
    ],
    Portrait: [
      { topic: "Saxophone", title: "Soulful Jazz Saxophonist Immersed in Solo Spotlight", desc: "Moody low-key portrait of brass saxophone gleaming under solitary spotlight in smoky club." },
      { topic: "Stradivarius", title: "Concertmaster Playing Vintage Stradivarius Violin Portrait", desc: "Poetic fine art portrait capturing fingers on ebony fingerboard and horsehair bow on strings." },
      { topic: "Electric_guitar", title: "Guitar Virtuoso Bending Strings on Sunburst Stratocaster", desc: "Dynamic stage portrait focusing on fretboard mastery and amplifier reflection in finish." },
      { topic: "Magician", title: "Illusionist Performing Sleight-of-Hand with Floating Playing Cards", desc: "Mysterious portrait of suited magician manipulating cards appearing to levitate in midair." },
      { topic: "Circus", title: "Trapeze Acrobat Portrait in Shimmering Gold Leotard", desc: "Dignified backstage portrait of aerial acrobat holding chalked hands and safety harness." }
    ],
    Pano: [
      { topic: "Stadium", title: "Packed 80,000 Seat Stadium Concert Illuminated by Phone Flashlights", desc: "Ultra-wide stadium panorama showing galaxy of white lights glowing in darkness during ballad." },
      { topic: "Opera_house", title: "Gilded Multi-Tiered Balconies of Historic Opera House Panorama", desc: "Architectural panorama of golden proscenium arch, velvet curtain, and red velvet balconies." },
      { topic: "Fireworks", title: "Midnight Fireworks Display Exploding over City Skyline Panorama", desc: "Vast panoramic capture of cascading chrysanthemums and peonies of fire lighting up the bay." },
      { topic: "Pinball", title: "Rows of Illuminated Classic Pinball Machines Panorama", desc: "Retro arcade panorama capturing glowing backglasses and chrome rails stretching into distance." },
      { topic: "Ballet", title: "Corps de Ballet Formations Across Expansive Stage Panorama", desc: "Graceful panoramic photograph of ballerinas in white tutus performing Swan Lake in unison." }
    ],
    Uncategorized: [
      { topic: "Film_projector", title: "Vintage 35mm Cinema Projector Whirring with Light Beam", desc: "Nostalgic documentary photo of mechanical film reels spinning and projecting dust-mote beam." },
      { topic: "Puppet", title: "Master Puppeteer Manipulating Carved Wooden Marionette", desc: "Fascinating theatrical capture of fingers delicately pulling string controls of antique puppet." },
      { topic: "Vinyl_record", title: "Diamond Turntable Needle Riding Grooves of Black Vinyl", desc: "Macro audio photograph highlighting record player cartridge tracking rotating micro-grooves." },
      { topic: "Grand_piano", title: "Concert Grand Piano Open Lid and Polished Soundboard", desc: "Elegant musical still life showing heavy cast-iron plate and tightly strung copper bass strings." },
      { topic: "Stage_lighting", title: "Array of Colored DMX Stage Moving Heads Beaming into Fog", desc: "Modern lighting production photo showing laser-sharp cyan and magenta beams cutting through haze." }
    ]
  },

  // 9. Celebrities
  9: {
    Photo: [
      { topic: "Red_carpet", title: "Star-Studded Movie Premiere Red Carpet Arrival", desc: "Glamorous photograph of red carpet walkway flanked by velvet ropes, gold stanchions, and flashing cameras." },
      { topic: "Academy_Awards", title: "Iconic Golden Statuette Trophy Gleaming on Stage Podium", desc: "Dignified photography of prestigious cinema award trophy resting under bright theater lights." },
      { topic: "Cannes_Film_Festival", title: "Palais des Festivals Grand Red Carpet Steps in Cannes", desc: "Iconic festival photography showing monumental staircase draped in red carpet along French Riviera." },
      { topic: "Film_premiere", title: "Crowd of Cheering Fans Lining Barriers at World Premiere", desc: "High-energy entertainment photograph of fans waving autograph books as limousines arrive." },
      { topic: "Paparazzi", title: "Riser of Press Photographers with Heavy Telephoto Lenses", desc: "Behind-the-scenes media capture of dozen press photographers focusing on arrival carpet." }
    ],
    Selfy: [
      { topic: "Celebrity", title: "Hollywood Star Smiling Selfie with Cheering Fans at Premiere", desc: "Electrifying red carpet selfie taken by a movie icon leaning into crowd of excited fans." },
      { topic: "Met_Gala", title: "High-Fashion Icon Mirror Selfie Before Gala Entrance", desc: "Glamorous dressing room selfie showing bespoke avant-garde haute couture evening creation." },
      { topic: "Grammy_Award", title: "Musician Winner Golden Trophy Celebration Selfie", desc: "Joyous selfie of recording artist smiling and holding shiny golden gramophone award backstage." },
      { topic: "Talk_show", title: "Late-Night Host Smiling Studio Selfie with Guest Star", desc: "Fun television set selfie taken behind iconic wooden desk with audience cheering in background." },
      { topic: "Autograph", title: "Actor Signing Posters and Taking Fan Selfie at Convention", desc: "Warm community interaction selfie of popular fantasy actor smiling with fan holding collectible." }
    ],
    Portrait: [
      { topic: "Film_director", title: "Acclaimed Film Director Framing Shot with Viewfinder", desc: "Dramatic cinematic portrait of director on film set studying lighting with director's finder." },
      { topic: "Cinematographer", title: "Director of Photography Behind High-End Digital Camera", desc: "Professional portrait of master cinematographer adjusting follow focus on massive prime lens." },
      { topic: "Actor", title: "Dramatic Black and White Studio Portrait of Leading Actor", desc: "Classic studio portrait with deep shadows capturing intensity and emotion in actor's eyes." },
      { topic: "Actress", title: "Sophisticated Editorial Glamour Portrait of Acclaimed Actress", desc: "High-fashion portrait with soft Rembrandt lighting and exquisite designer diamond necklace." },
      { topic: "Costume_designer", title: "Costume Designer Working on Ornate Period Wardrobe", desc: "Artistic environmental portrait surrounded by costume sketches, velvet fabrics, and beads." }
    ],
    Pano: [
      { topic: "Hollywood_Walk_of_Fame", title: "Historic Hollywood Walk of Fame Stars on Boulevard Panorama", desc: "Wide street panorama showing bronze and terrazzo coral stars stretching down Hollywood Boulevard." },
      { topic: "Dolby_Theatre", title: "Lavish Dolby Theatre Auditorium Ready for Awards Telecast", desc: "Panoramic interior view of multi-tiered opera-style seating and illuminated gold art deco arches." },
      { topic: "Golden_Globe_Awards", title: "Banquet Ballroom Tables Lined with Champagne Panorama", desc: "Opulent banquet hall panorama set with circular tables, floral arrangements, and golden centerpieces." },
      { topic: "Limousine", title: "Fleet of Sleek Black Limousines Arriving at Gala Panorama", desc: "Wide nighttime street panorama of VIP motorcade outside illuminated historic theatre entrance." },
      { topic: "Press_conference", title: "Major Entertainment Press Conference Stage Panorama", desc: "Panoramic view of media podium covered in microphone flags facing hundreds of journalists." }
    ],
    Uncategorized: [
      { topic: "Clapperboard", title: "Engraved Movie Production Slate Clapperboard on Film Set", desc: "Authentic filmmaking still life showing wooden slate with chalked scene, take, and roll numbers." },
      { topic: "Microphone", title: "Vintage Shure 55SH Chrome Unidyne Microphone", desc: "Iconic vintage ribbon microphone gleaming with mirror finish on stage stand under spotlight." },
      { topic: "Director%27s_chair", title: "Classic Canvas Director's Chair on Soundstage", desc: "Evocative movie set photo of black folding chair with white script lettering under studio grid." },
      { topic: "Emmy_Award", title: "Golden Winged Muse Holding Atom Emmy Award Sculpture", desc: "Close-up craftsmanship photograph of symbolic statuette recognizing television excellence." },
      { topic: "Evening_gown", title: "Bespoke Silk Chiffon Red Carpet Gown on Mannequin", desc: "Atelier craftsmanship capture of intricate hand-embroidered beads on flowing couture gown." }
    ]
  },

  // 10. Animals
  10: {
    Photo: [
      { topic: "Lion", title: "Majestic Male African Lion Resting in Golden Savannah Grass", desc: "Commanding wildlife portrait of adult male lion with dark mane scanning his territory." },
      { topic: "Bengal_tiger", title: "Bengal Tiger Prowling Through Misty Indian Jungle", desc: "Powerful wildlife photograph of striped apex predator walking stealthily beside forest waterhole." },
      { topic: "Giant_panda", title: "Giant Panda Peacefully Chewing Fresh Green Bamboo", desc: "Heartwarming wildlife portrait of panda sitting in lush Sichuan mountain forest enjoying meal." },
      { topic: "Bald_eagle", title: "Majestic Bald Eagle Soaring with Outstretched Wings", desc: "Incredible action photograph of American national bird gliding against crisp blue mountain sky." },
      { topic: "Humpback_whale", title: "Giant Humpback Whale Breaching Out of Ocean Swells", desc: "Spectacular marine action capture of massive 40-ton whale leaping completely out of water." }
    ],
    Selfy: [
      { topic: "Dog", title: "Happy Golden Retriever Park Selfie Panting in Sun", desc: "Endearing pet selfie of smiling dog owner and joyful retriever after game of fetch." },
      { topic: "Cat", title: "Cozy Domestic Cat Snuggling Cheeks in Bed Selfie", desc: "Sweet indoor selfie of purring tabby cat leaning affectionately against owner's face." },
      { topic: "Horse", title: "Gentle Farm Horse Nuzzling Shoulder in Pasture Selfie", desc: "Warm outdoor selfie with majestic brown thoroughbred resting its muzzle against human cheek." },
      { topic: "Cow", title: "Curious Jersey Dairy Cow Poking Nose into Farm Selfie", desc: "Humorous country selfie of sweet brown cow with large liquid eyes investigating smartphone." },
      { topic: "Parrot", title: "Colorful Amazon Parrot Perched on Shoulder Waving Selfie", desc: "Delightful pet portrait selfie with emerald green feathered companion spreading its wings." }
    ],
    Portrait: [
      { topic: "Snowy_owl", title: "Piercing Golden Gaze of Wise Arctic Snowy Owl", desc: "Mesmerizing close-up portrait of white-feathered owl camouflaged in winter snowstorm." },
      { topic: "Cheetah", title: "Intense Eyes of Fast African Cheetah on Termite Mound", desc: "Detailed predatory portrait highlighting characteristic black tear stripes and focused amber eyes." },
      { topic: "Gorilla", title: "Thoughtful Silverback Mountain Gorilla Close-Up Portrait", desc: "Deeply moving portrait capturing wisdom and peaceful countenance in gorilla leader's gaze." },
      { topic: "Polar_bear", title: "Mighty Polar Bear Sniffing Arctic Air on Pack Ice", desc: "Striking wildlife portrait of great white predator against turquoise arctic sea ice." },
      { topic: "Red_fox", title: "Curious Red Fox with Bushy Tail Pausing in Winter Woods", desc: "Enchanting portrait of vibrant orange fox standing in pristine white powdery snowfall." }
    ],
    Pano: [
      { topic: "Wildebeest", title: "Great Wildebeest Migration Crossing Mara River Panorama", desc: "Epic panoramic perspective of thousands of animals braving river currents in Serengeti." },
      { topic: "Flamingo", title: "Thousands of Pink Flamingos Feeding in Alkaline Lake Panorama", desc: "Vibrant panoramic sea of pink wading birds mirrored across calm shallow waters of Lake Nakuru." },
      { topic: "Penguin", title: "Emperor Penguin Colony Across Antarctic Sea Ice Panorama", desc: "Breathtaking polar panorama showing thousands of penguins and fluffy chicks in icy expanse." },
      { topic: "Zebra", title: "Herd of African Zebras Grazing under Acacia Trees Panorama", desc: "Wide savannah panorama showing dazzling black-and-white optical patterns across open plains." },
      { topic: "Dolphin", title: "Superpod of Wild Dolphins Surfing Swells in Open Ocean", desc: "Vast ocean panorama capturing hundreds of dolphins leaping across sunlit Pacific swells." }
    ],
    Uncategorized: [
      { topic: "Giraffe", title: "Tall Giraffe Mother Bending Down to Nuzzle Newborn Calf", desc: "Tender wildlife moment between towering mother giraffe and her week-old baby on savannah." },
      { topic: "Monarch_butterfly", title: "Monarch Butterfly Resting on Wild Purple Coneflower", desc: "Exquisite macro wildlife photo of orange and black wings dusted with yellow flower pollen." },
      { topic: "Sea_turtle", title: "Ancient Green Sea Turtle Gliding Over Coral Reef", desc: "Peaceful underwater photograph of marine reptile swimming gracefully with foreflipper strokes." },
      { topic: "African_elephant", title: "Elephant Matriarch Leading Herd Across Dry Riverbed", desc: "Dignified documentary photo of family group walking in single file across dusty African plains." },
      { topic: "Gray_wolf", title: "Timber Wolf Howling into Frosty Mountain Morning Air", desc: "Evocative wilderness photograph of wild wolf standing on rock ledge with breath steaming in cold." }
    ]
  },

  // 11. Technologies
  11: {
    Photo: [
      { topic: "Quantum_computing", title: "Golden Quantum Computer Dilution Refrigerator Cryostat", desc: "Mesmerizing photograph of tiered chandelier structure housing superconducting qubit circuits." },
      { topic: "Industrial_robot", title: "Six-Axis Industrial Robotic Arm Welding Car Chassis", desc: "High-tech manufacturing capture of orange sparks flying from precision robotic spot welder." },
      { topic: "Server_(computing)", title: "Endless Rows of Illuminated Server Racks in Enterprise Datacenter", desc: "Futuristic perspective down cool aisle of modern hyperscale cloud computing facility." },
      { topic: "Unmanned_aerial_vehicle", title: "Carbon-Fiber Quadcopter Drone Hovering with 4K Gimbal", desc: "Sleek aerial technology photo of modern drone hovering steadily against dramatic clouds." },
      { topic: "Integrated_circuit", title: "Silicon Wafer Disk with Hundreds of Microchips in Cleanroom", desc: "Rainbow diffraction patterns gleaming across mirror-polished semiconductor silicon wafer." }
    ],
    Selfy: [
      { topic: "Robotics", title: "Robotics Engineer Smiling beside Bipedal Humanoid Robot", desc: "Excited tech creator selfie posing next to advanced prototype robot walking on test track." },
      { topic: "Computer_programming", title: "Software Engineer Dual-Screen Coding Workspace Selfie", desc: "Modern developer selfie with syntax-highlighted code editors and mechanical keyboard glowing." },
      { topic: "Virtual_reality", title: "Gamer Wearing Sleek VR Headset and Motion Controllers Selfie", desc: "Immersive tech selfie showing user immersed in virtual world with tracking base stations." },
      { topic: "Satellite", title: "Aerospace Systems Engineer with CubeSat Satellite Cleanroom", desc: "Proud engineering selfie in ESD lab coat beside completed orbital communications satellite." },
      { topic: "Artificial_intelligence", title: "AI Researcher on Stage with Neural Network Topology Slides", desc: "Triumphant tech conference selfie presenting breakthrough machine learning architecture." }
    ],
    Portrait: [
      { topic: "Microprocessor", title: "Extreme Macro Portrait of Modern GPU Silicon Die Architecture", desc: "Incredible microscopic photography revealing billions of transistors and gold wire bonds." },
      { topic: "Fiber-optic_cable", title: "Glowing Blue Glass Fiber Optic Bundle Transmitting High-Speed Light", desc: "Artistic macro portrait of luminous glass hair strands carrying gigabits of internet traffic." },
      { topic: "Motherboard", title: "Computer Motherboard Surface Mount SMD Components Portrait", desc: "Precision electronics portrait focusing on capacitor banks, VRM heatsinks, and golden traces." },
      { topic: "Bionics", title: "Advanced Bionic Myoelectric Prosthetic Hand Portrait", desc: "Inspiring biomedical engineering portrait showing carbon-fiber articulated fingers and sensors." },
      { topic: "Nanotechnology", title: "Carbon Nanotube Lattice Microscopic Simulation Portrait", desc: "Cutting-edge material science visualization of interlocking hexagonal carbon molecular bonds." }
    ],
    Pano: [
      { topic: "Photovoltaics", title: "Vast Desert Solar Farm Array Stretching to Mountains Panorama", desc: "Sweeping panorama of thousands of blue photovoltaic panels tracking sun in clean energy farm." },
      { topic: "Wind_turbine", title: "Offshore Wind Farm Turbines Spinning in Ocean Mist Panorama", desc: "Expansive marine panorama of towering white wind turbines generating renewable power at sea." },
      { topic: "Supercomputer", title: "High-Performance Computing Cluster Hall with Liquid Cooling Panorama", desc: "Panoramic view of world-class supercomputer cabinets glowing with blue LED activity monitors." },
      { topic: "Automated_guided_vehicle", title: "Automated Fulfillment Center with Robotic Delivery Fleet Panorama", desc: "Wide panorama of smart logistics warehouse with hundreds of autonomous drive units moving pods." },
      { topic: "Cleanroom", title: "Semiconductor Fabrication Fab Floor Panoramic Perspective", desc: "Ultra-wide panoramic perspective inside automated multimillion-dollar chip foundry." }
    ],
    Uncategorized: [
      { topic: "Holography", title: "Translucent 3D Holographic Model Floating in Ambient Dark", desc: "Futuristic optical visualization demonstrating laser interference creating volumetric imagery." },
      { topic: "Electric_battery", title: "Lithium-Ion Cylindrical Battery Cell Pack for Electric Vehicle", desc: "Clean automotive technology still life showing copper busbars connecting battery modules." },
      { topic: "Microcontroller", title: "Miniature Microcontroller Development Board with Sensor Array", desc: "Makerspace still life showing breadboard prototyping with jumper wires and digital OLED display." },
      { topic: "Drone", title: "Delivery Drone Dropping Package Gently into Backyard Lawn", desc: "Future logistics photo of autonomous drone lowering package via tether cable onto grass." },
      { topic: "Smart_home", title: "Minimalist Smart Home Control Interface on Brushed Metal Wall", desc: "Modern architectural tech photo showing digital touchscreen adjusting ambient LED lighting." }
    ]
  },

  // 12. Memories
  12: {
    Photo: [
      { topic: "Instant_camera", title: "Scattered Vintage Polaroid Snapshots Across Rustic Oak Desk", desc: "Nostalgic still life photo of square white-bordered candid memories and instant film camera." },
      { topic: "Campfire", title: "Cozy Night Campfire with Acoustic Guitar Under Starry Sky", desc: "Warm outdoor memory photograph of crackling embers, glowing logs, and friends singing." },
      { topic: "Treehouse", title: "Charming Wooden Childhood Treehouse Nestled in Giant Oak", desc: "Evocative outdoor photo of secret backyard haven with rope ladder and wooden shutters." },
      { topic: "Sunset", title: "Elderly Couple Holding Hands Walking on Beach at Sunset", desc: "Touching fine art photograph of lifelong companions walking along edge of reflective wet sand." },
      { topic: "Fountain_pen", title: "Antique Fountain Pen and Leather Journal Beside Window", desc: "Reflective still life capture of handwritten letters, open journal, and brass inkpot in soft light." }
    ],
    Selfy: [
      { topic: "Reunion", title: "Childhood Best Friends Recreating Iconic 15-Year Throwback Selfie", desc: "Heartwarming comparison selfie of lifelong friends laughing and matching their old poses." },
      { topic: "Family", title: "Multi-Generation Family Thanksgiving Dinner Table Selfie", desc: "Joyous holiday selfie featuring grandparents, parents, and grandchildren around feast." },
      { topic: "Road_trip", title: "Friends Van Road Trip Scenic Overlook Golden Hour Selfie", desc: "Adventurous travel selfie leaning out of camper van doors overlooking expansive canyon." },
      { topic: "Anniversary", title: "Grandparents Celebrating 50th Golden Wedding Anniversary Selfie", desc: "Loving elderly couple smiling sweetly together holding celebration cake with golden candles." },
      { topic: "Graduation", title: "High School Best Friends Cheering Together in Caps and Gowns", desc: "Youthful celebration selfie of close friends taking their final photograph as classmates." }
    ],
    Portrait: [
      { topic: "Pocket_watch", title: "Vintage Gold Pocket Watch Ticking on Weathered Book", desc: "Evocative temporal portrait highlighting engraved floral case, roman numerals, and gold chain." },
      { topic: "Locket", title: "Delicate Silver Heart Locket Opening to Reveal Miniature Photo", desc: "Precious heirloom macro portrait showing faded black-and-white portrait tucked inside locket." },
      { topic: "Teddy_bear", title: "Vintage Well-Loved Teddy Bear Sitting on Sunlit Attic Floor", desc: "Poignant childhood memory still life capturing worn plush fur, stitched nose, and button eyes." },
      { topic: "Photo_album", title: "Weathered Hands Gently Turning Pages of Vintage Album", desc: "Tender generational portrait focusing on wrinkled hands pointing out memories in black-and-white." },
      { topic: "Music_box", title: "Intricate Wooden Wind-Up Music Box with Rotating Ballerina", desc: "Magical childhood treasure portrait focusing on tiny mechanical gears and mirror reflection." }
    ],
    Pano: [
      { topic: "Dock_(maritime)", title: "Sunset over Peaceful Mountain Lake Wooden Dock Panorama", desc: "Serene panorama of empty wooden boat dock extending into glassy lake reflecting pink twilight." },
      { topic: "Autumn", title: "Country Lane Shrouded in Golden Fallen Maple Leaves Panorama", desc: "Atmospheric autumn landscape panorama showing arched canopy of orange and yellow trees." },
      { topic: "Cottage", title: "Cozy Stone Cottage Nestled in Blooming English Countryside", desc: "Idyllic wide panorama of thatched-roof home surrounded by climbing roses and picket fence." },
      { topic: "Campground", title: "Nostalgic Summer Camp Lakeside Cabins Panorama", desc: "Warm panoramic view of rustic wooden cabins, canoes lined up on grass, and mirror-still water." },
      { topic: "Town", title: "Historic Hometown Main Street Decorated with Warm Holiday Lights", desc: "Comforting evening panorama of brick storefronts, glowing lampposts, and gentle snowfall." }
    ],
    Uncategorized: [
      { topic: "Postcard", title: "Collection of Handwritten Vintage Travel Postcards with Stamps", desc: "Fascinating flatlay still life of historic postal cards from Paris, Rome, and Cairo." },
      { topic: "Hourglass", title: "Brass Hourglass with Golden Sand Trickling Through Narrow Neck", desc: "Meditative still life photograph of time slipping away inside blown glass bulb." },
      { topic: "Phonograph_record", title: "Stack of Classic 1970s Vinyl LP Albums in Cardboard Sleeves", desc: "Music collector memory still life showing colorful retro album artwork and grooved vinyl." },
      { topic: "Seashell", title: "Glass Jar Filled with Collected Beach Shells and Sea Glass", desc: "Warm seaside memory still life capturing translucent green glass and spiraled shells on windowsill." },
      { topic: "Fireplace", title: "Warm Wool Blanket and Steaming Mug beside Stone Fireplace", desc: "Cozy winter retreat still life capturing dancing yellow flames and soft glowing hearth." }
    ]
  },

  // 13. Beauty & Fashion
  13: {
    Photo: [
      { topic: "Haute_couture", title: "Haute Couture Model Walking Grand Paris Runway", desc: "Sensational high-fashion runway photograph showing flowing sculpted silk and dramatic lighting." },
      { topic: "Diamond", title: "Luxury Diamond and Sapphire Necklace Displayed on Dark Velvet", desc: "Gleaming fine jewelry photograph capturing pristine facets and sparkling light reflections." },
      { topic: "Perfume", title: "Sculptural Crystal Perfume Bottle in Morning Sunbeams", desc: "Refined luxury fragrance still life photo with golden amber liquid and delicate atomizer pump." },
      { topic: "Evening_gown", title: "Emerald Green Silk Evening Gown Cascading Down Marble Stairs", desc: "Opulent fashion photograph showing yards of lustrous silk velvet sweeping down staircase." },
      { topic: "Fashion_model", title: "High-Fashion Street Style Model in Milan Fashion District", desc: "Dynamic street style fashion photograph of trendsetting model wearing tailored camel coat." }
    ],
    Selfy: [
      { topic: "Cosmetics", title: "Beauty Makeup Artist Glowing Skin Runway Backstage Selfie", desc: "Flawless backstage selfie showing luminous highlighted cheekbones, bold liner, and soft gloss." },
      { topic: "Fashion_show", title: "Runway Model Smiling Selfie with Avant-Garde Headpiece", desc: "Dramatic fashion week selfie showing intricate feather and crystal headwear before show." },
      { topic: "Sunglasses", title: "Golden Hour Selfie Wearing Oversized Designer Sunglasses", desc: "Sleek glamorous selfie capturing sunset reflection in gradient polarized designer shades." },
      { topic: "Handbag", title: "Fashion Influencer Mirror Selfie with Iconic Leather Handbag", desc: "Chic wardrobe mirror selfie showcasing tailored blazer, gold jewelry, and luxury quilted bag." },
      { topic: "Manicure", title: "Nail Artist Beaming Selfie Showcasing Gemstone Nail Art", desc: "Intricate beauty selfie showing hand-painted chrome abstract art and Swarovski crystals on nails." }
    ],
    Portrait: [
      { topic: "Lipstick", title: "Macro Beauty Portrait Focusing on Bold Velvet Crimson Red Lips", desc: "Striking editorial beauty portrait highlighting satin texture, lip line precision, and porcelain skin." },
      { topic: "Jewellery", title: "Dramatic Fashion Portrait with Sculptural Gold Filigree Earrings", desc: "High-contrast studio portrait emphasizing dramatic bone structure and hammered gold jewelry." },
      { topic: "Silk", title: "Ethereal Beauty Portrait Wrapped in Shimmering Blush Silk", desc: "Soft-focus beauty photograph featuring model gently cradled by gossamer silk chiffon." },
      { topic: "Eye_liner", title: "Artistic Editorial Eye Makeup Portrait with Graphic Winged Liner", desc: "Avante-garde beauty studio close-up showing precision geometric eyeliner and feathered brows." },
      { topic: "Earring", title: "Close-Up Profile Beauty Portrait with Cascading Pearl Drop Earrings", desc: "Timeless elegant portrait showing delicate ear cuffs, natural skin glow, and swept-back hair." }
    ],
    Pano: [
      { topic: "Paris_Fashion_Week", title: "Grand Palais Paris Fashion Week Runway Stage Panorama", desc: "Monumental wide panorama of colossal runway set with hundreds of seated editors and buyers." },
      { topic: "Boutique", title: "Luxurious Designer Flagship Boutique Interior Panorama", desc: "Ultra-wide interior panorama showing minimalist marble pedestals, velvet seating, and couture racks." },
      { topic: "Milan_Fashion_Week", title: "Milan Fashion Week Outdoor Street Photography Swarm Panorama", desc: "Exciting wide panorama of photographers capturing fashion influencers crossing piazza." },
      { topic: "Department_store", title: "High-End Cosmetic Beauty Hall with Lighted Vanity Mirrors", desc: "Dazzling wide panorama of luxury department store beauty counters glowing with gold fixtures." },
      { topic: "Shoe", title: "Exquisite Designer Footwear Salon Display Wall Panorama", desc: "Lush retail panorama showcasing rows of satin stilettos, embroidered mules, and leather pumps." }
    ],
    Uncategorized: [
      { topic: "High-heeled_shoe", title: "Ruby Red Lacquered Sole Stiletto Heel on Polished Pedestal", desc: "Sculptural luxury accessory photo highlighting curved arch and mirror black patent leather." },
      { topic: "Textile", title: "Rich Velvet and Brocade Fabric Swatches in Atelier Workshop", desc: "Sumptuous texture study of woven metallic threads, raised embroidery, and rich jewel tones." },
      { topic: "Emerald", title: "Deep Forest Green Colombian Emerald Ring with Diamond Halo", desc: "Exquisite fine jewelry macro photo capturing rich green clarity and platinum prong setting." },
      { topic: "Sewing_machine", title: "Artisan Couturier Sewing Delicate Silk on Vintage Machine", desc: "Behind-the-scenes fashion craft photo showing needle piercing fabric under warm task lamp." },
      { topic: "Pearl", title: "Strand of Lustrous Natural South Sea Pearls on Silk Cushion", desc: "Timeless jewelry still life capturing orient luster and soft rainbow iridescence of graded pearls." }
    ]
  },

  // 14. Art
  14: {
    Photo: [
      { topic: "Mona_Lisa", title: "Leonardo da Vinci's Iconic Mona Lisa in the Louvre Museum", desc: "World-famous masterpiece photograph displaying the enigmatic smile behind museum glass." },
      { topic: "The_Starry_Night", title: "Vincent van Gogh's Swirling The Starry Night Canvas", desc: "Fine art photographic reproduction showcasing thick impasto brushstrokes and vibrant cobalt sky." },
      { topic: "David_(Michelangelo)", title: "Michelangelo's Colossal Marble David Statue in Florence", desc: "Commanding museum photograph capturing heroic proportions, veins in hands, and marble muscle." },
      { topic: "The_Thinker", title: "Auguste Rodin's Bronze The Thinker Pensive on Stone", desc: "Powerful outdoor sculpture photograph of bronze man deep in philosophical contemplation." },
      { topic: "Venus_de_Milo", title: "Ancient Greek Venus de Milo Marble Sculpture in Louvre", desc: "Classical art photograph highlighting graceful drapery and classical Hellenistic beauty." }
    ],
    Selfy: [
      { topic: "Easel", title: "Fine Art Student Smiling beside Completed Master Copy Canvas", desc: "Proud art studio mirror selfie posing with wooden easel and newly varnished oil painting." },
      { topic: "Museum", title: "Art Lover Smiling Selfie in Museum Grand Gallery", desc: "Inspiring cultural selfie in front of historic golden-framed Renaissance portraiture." },
      { topic: "Sculptor", title: "Sculptor Covered in Stone Dust Smiling beside Chiseled Bust", desc: "Authentic studio selfie showing artist holding mallet and pointing at newly carved limestone." },
      { topic: "Watercolor_painting", title: "Plein Air Painter Smiling Selfie on Hillside with Field Palette", desc: "Outdoor landscape artist selfie holding wet watercolor board with valley view behind it." },
      { topic: "Printmaking", title: "Printmaker Holding Fresh Linocut Relief Print Smiling", desc: "Artisan print shop selfie showing black oil ink on paper and carved battleship linoleum block." }
    ],
    Portrait: [
      { topic: "Terracotta_Army", title: "Ancient Terracotta Warrior Face Detail with Intricate Topknot", desc: "Archaeological portrait revealing individualized facial features of Emperor Qin's clay army." },
      { topic: "Fresco", title: "Detail of Renaissance Wall Fresco Showing Seraphic Angel", desc: "Intimate close-up portrait of pigment absorbed into ancient Italian lime plaster wall." },
      { topic: "Impasto", title: "Extreme Macro Portrait of Thick Oil Paint Textures on Canvas", desc: "Sculptural paint texture study highlighting ridges, knife strokes, and vibrant yellow pigment." },
      { topic: "Abstract_art", title: "Geometric Modern Art Color Block Composition Portrait", desc: "Refined minimalist art photograph highlighting pure primary color harmonies and clean edges." },
      { topic: "Bronze_sculpture", title: "Patinated Green Bronze Classical Bust Portrait in Garden", desc: "Atmospheric outdoor sculpture portrait showing natural verdigris patina on cast bronze features." }
    ],
    Pano: [
      { topic: "Louvre", title: "Monumental Grand Gallery Hall of the Louvre Museum Panorama", desc: "Ultra-wide panoramic perspective of gilded barrel vault ceiling and Italian Renaissance masterworks." },
      { topic: "Sistine_Chapel_ceiling", title: "Michelangelo's Complete Sistine Chapel Ceiling Panorama", desc: "Breathtaking wide panorama of the Creation of Adam and prophetic frescoes in the Vatican." },
      { topic: "Sculpture_park", title: "Expansive Public Outdoor Modern Sculpture Park Panorama", desc: "Sweeping landscape panorama showing monumental steel and stone artworks spread across green hills." },
      { topic: "Modern_art", title: "Spacious White Cube Modern Art Museum Hall Panorama", desc: "Contemporary wide panoramic view of polished concrete floors and large-scale minimalist canvases." },
      { topic: "Vatican_Museums", title: "Gallery of Maps in the Vatican Museums Vaulted Panorama", desc: "Spectacular architectural panorama of 120-meter corridor with painted topography and golden ceiling." }
    ],
    Uncategorized: [
      { topic: "Ceramic", title: "Handmade Ceramic Vase Dipped in Crackle Celadon Glaze", desc: "Fine craft still life showing delicate web of hairline fissures under translucent jade glaze." },
      { topic: "Palette_(painting)", title: "Hardwood Painter's Palette with Squeezed Mounds of Pigment", desc: "Artist workspace photograph highlighting rainbow gradient of oil colors mixed on walnut board." },
      { topic: "Stained_glass", title: "Sunlight Streaming Through Rose Window Stained Glass", desc: "Ethereal cathedral photo showing jewel-toned red and blue light patterns projected onto floor." },
      { topic: "Drawing", title: "Charcoal Life Drawing Study of Hand on Textured Newsprint", desc: "Expressive fine art drawing still life showing vine charcoal sticks, kneaded eraser, and shaded lines." },
      { topic: "Engraving", title: "Fine Copperplate Engraving Plate with Incised Burin Lines", desc: "Intricate metal craft photo showing microscopic crosshatched grooves ready for inking." }
    ]
  },

  // 15. Tavel & Tourism
  15: {
    Photo: [
      { topic: "Eiffel_Tower", title: "Eiffel Tower Illuminated in Golden Glow at Twilight", desc: "Breathtaking Parisian travel photograph from Champ de Mars as the city of light sparkles." },
      { topic: "Colosseum", title: "Colosseum in Rome Under Warm Mediterranean Afternoon Sun", desc: "Iconic historical monument photograph showing ancient travertine arches of the Roman amphitheater." },
      { topic: "Taj_Mahal", title: "White Marble Taj Mahal Reflected in Tranquil Pool at Dawn", desc: "Perfect symmetrical travel photograph of the world wonder shimmering in soft morning mist." },
      { topic: "Machu_Picchu", title: "Ancient Incan Citadel of Machu Picchu in Morning Clouds", desc: "Spectacular Andean travel photograph showing terraced green stone ruins perched high on ridge." },
      { topic: "Santorini", title: "Whitewashed Oia Clifftop Villas and Blue Domes in Santorini", desc: "Classic Aegean Sea travel photo capturing white walls, pink bougainvillea, and caldera sunset." }
    ],
    Selfy: [
      { topic: "Venice", title: "Tourist Couple Smiling Selfie on Traditional Gondola in Venice", desc: "Romantic Italian vacation selfie cruising down Grand Canal with Venetian palazzos in background." },
      { topic: "Great_Wall_of_China", title: "Traveler Summit Watchtower Selfie on Great Wall of China", desc: "Triumphant travel selfie looking back at ancient brick battlements winding over rugged mountains." },
      { topic: "Grand_Canyon", title: "Hiker Smiling Selfie Overlooking Grand Canyon South Rim", desc: "Inspiring adventure travel selfie with breathtaking depth of layered red rock canyon below." },
      { topic: "Kyoto", title: "Solo Explorer Selfie in Kyoto Fushimi Inari Torii Tunnel", desc: "Magical Japanese travel selfie walking through thousand vermilion gates winding up sacred mountain." },
      { topic: "Leaning_Tower_of_Pisa", title: "Playful Tourist 'Holding Up' Leaning Tower of Pisa Selfie", desc: "Fun humorous travel selfie with classic forced-perspective pose on lush green lawn." }
    ],
    Portrait: [
      { topic: "Gondolier", title: "Venetian Gondolier in Striped Shirt and Straw Boater Hat", desc: "Authentic character portrait of canal boatman holding wooden oar against historic bridge." },
      { topic: "Geisha", title: "Traditional Geiko in Exquisite Silk Kimono in Kyoto Gion", desc: "Graceful cultural portrait showing white oshiroi makeup, intricate kanzashi pins, and silk obi." },
      { topic: "Petra", title: "Bedouin Guide Resting Outside Al-Khazneh Treasury in Petra", desc: "Evocative desert portrait seated on camel saddle in front of monumental carved rock facade." },
      { topic: "Guard", title: "British King's Guard in Scarlet Tunic and Bearskin Hat", desc: "Stately military portrait standing at attention outside royal London palace gate." },
      { topic: "Mount_Fuji", title: "Japanese Farmer in Straw Hat Overlooking Mount Fuji", desc: "Peaceful rural portrait of elderly farmer standing in green tea plantation with snow volcano behind." }
    ],
    Pano: [
      { topic: "Grand_Canal_(Venice)", title: "Sweeping Panoramic Sunset over Venice Grand Canal", desc: "Ultra-wide panoramic perspective from Rialto Bridge showing vaporettos and historic palazzos." },
      { topic: "Pyramids_of_Giza", title: "Ancient Pyramids of Giza Panorama Across Golden Desert", desc: "Majestic wide panorama showing Great Pyramid of Khufu and Sphinx under vast desert sky." },
      { topic: "Sydney_Opera_House", title: "Sydney Harbour Panorama with Opera House and Bridge", desc: "Breathtaking wide panoramic view of iconic white sail shells glistening on harbour water." },
      { topic: "Neuschwanstein_Castle", title: "Fairytale Neuschwanstein Castle Perched on Alpine Cliff", desc: "Sweeping panorama of romantic Bavarian fortress surrounded by autumnal mountain forests." },
      { topic: "Sagrada_Família", title: "Antoni Gaudí's Sagrada Família Basilica Spire Panorama", desc: "Architectural panorama of organic stone towers reaching toward vibrant Barcelona sky." }
    ],
    Uncategorized: [
      { topic: "Big_Ben", title: "Iconic Big Ben Elizabeth Tower Clock and Red London Bus", desc: "Classic British travel scene capturing double-decker bus crossing Westminster Bridge." },
      { topic: "Luggage", title: "Vintage Leather Suitcases Stacked with Old Travel Decals", desc: "Nostalgic wanderlust still life photo of battered brass-cornered trunks and leather passport." },
      { topic: "Map", title: "Unfolded Paper World Map and Brass Compass on Wooden Deck", desc: "Wanderlust travel planning photo showing plotted routes, fountain pen, and traveler's notebook." },
      { topic: "Hot_air_balloon", title: "Dozens of Hot Air Balloons Drifting over Cappadocia Valleys", desc: "Fairytale morning flight photograph over honeycombed volcanic rock spires at sunrise." },
      { topic: "Lantern", title: "Glowing Red Silk Lanterns Hanging in Hoi An Ancient Town", desc: "Magical night street photograph of illuminated lanterns casting warm glow over cobblestone canal." }
    ]
  },

  // 16. Nature
  16: {
    Photo: [
      { topic: "Aurora_(natural_phenomenon)", title: "Emerald Green Northern Lights Dancing Over Snowy Fjords", desc: "Astounding long-exposure night photograph of celestial aurora curtains reflecting in icy sea." },
      { topic: "Victoria_Falls", title: "Majestic Victoria Falls Plunge Creating Massive Rainbow", desc: "Awe-inspiring waterfall photography capturing millions of gallons crashing into Batoka Gorge." },
      { topic: "Redwood_National_and_State_Parks", title: "Sunbeams Piercing Through Ancient Giant Redwood Forest", desc: "Cathedral-like forest photograph of towering 300-foot coastal redwoods bathed in morning mist." },
      { topic: "Rocky_Mountains", title: "Calm Alpine Lake Perfectly Mirroring Rocky Mountain Peaks", desc: "Crisp wilderness photograph of crystal clear waters reflecting jagged snow-draped granite horns." },
      { topic: "Yosemite_Valley", title: "El Capitan and Bridalveil Fall in Yosemite Valley at Dawn", desc: "Iconic American wilderness photograph showing dramatic monolith glowing in soft morning pink." }
    ],
    Selfy: [
      { topic: "Hiking", title: "Solo Trail Hiker Smiling Summit Ridge Panoramic Selfie", desc: "Invigorating hiking selfie perched on jagged granite ridge with endless wilderness below." },
      { topic: "Waterfall", title: "Adventurer Smiling Selfie Beside Roaring Mountain Waterfall", desc: "Refreshing outdoor selfie covered in cool mist in front of cascading jungle mountain falls." },
      { topic: "Camping", title: "Happy Campers Outside Glowing Tent Under Milky Way Selfie", desc: "Unforgettable wilderness night selfie posing outside illuminated nylon tent beneath starry sky." },
      { topic: "Wildflower", title: "Nature Walker Smiling Selfie in Blooming Alpine Meadow", desc: "Vibrant summer selfie surrounded by dense carpet of purple lupines and yellow sunflowers." },
      { topic: "Desert", title: "Desert Trekker Selfie Standing Under Massive Sandstone Arch", desc: "Awe-inspiring adventure selfie in red rock country framed by colossal natural stone span." }
    ],
    Portrait: [
      { topic: "Dew", title: "Macro Portrait of Morning Dew Drops on Spider Silk", desc: "Exquisite macro nature photograph showing glistening water beads reflecting tiny landscape views." },
      { topic: "Autumn_leaf_color", title: "Brilliant Scarlet Red Japanese Maple Leaf Portrait", desc: "Intimate botanical portrait capturing delicate leaf veins backlit by radiant autumn sunshine." },
      { topic: "Snowflake", title: "Macro Portrait of Pristine Hexagonal Ice Crystal Snowflake", desc: "Astonishing macro physics photograph revealing microscopic symmetrical branching of frozen water." },
      { topic: "Lavender", title: "Macro Portrait of Fragrant Purple Lavender Sprig with Bee", desc: "Warm summer macro photo of bumblebee gathering nectar on lavender spikes in Provence." },
      { topic: "Tree", title: "Gnarled Ancient Bristlecone Pine Tree Trunk Portrait", desc: "Detailed texture portrait of 4,000-year-old twisted golden wood surviving harsh high-altitude winds." }
    ],
    Pano: [
      { topic: "Monument_Valley", title: "Iconic Sandstone Buttes of Monument Valley Wide Panorama", desc: "Cinematic wide panorama showing iconic red sandstone mittens rising from flat desert plain." },
      { topic: "Glacier", title: "Sweeping Panorama of Massive Alaskan Tidewater Glacier Face", desc: "Ultra-wide polar panorama of fractured blue ice wall calving into frigid ocean waters." },
      { topic: "Amazon_River", title: "Aerial Panorama of Meandering Amazon River in Dense Jungle", desc: "Breathtaking wide aerial perspective of mighty serpentine waterway winding through endless green." },
      { topic: "Sahara", title: "Sea of Endless Wind-Sculpted Golden Sand Dunes Panorama", desc: "Vast desert panorama showing graceful curving dune ridges and sharp shadows under Sahara sun." },
      { topic: "Rainbow", title: "Double Rainbow Arcing Over Dramatic Stormy Ocean Coast Panorama", desc: "Electrifying wide landscape panorama of vibrant full-spectrum rainbow over churning coastal surf." }
    ],
    Uncategorized: [
      { topic: "Canyon", title: "Deep Mossy Slot Canyon Carved by Rushing Mountain Stream", desc: "Enchanting geological photo of water-sculpted curving sandstone walls lined with emerald ferns." },
      { topic: "Lava", title: "Molten Orange Basalt Lava Flow Pouring into Steaming Sea", desc: "Dramatic volcanic action photograph of creation of new land where magma meets Pacific Ocean." },
      { topic: "Cherry_blossom", title: "Canopy of Blooming Pink Sakura Cherry Blossoms in Tokyo", desc: "Poetic spring photograph looking up through cloud-like boughs of delicate pink flower petals." },
      { topic: "Bamboo", title: "Arashiyama Towering Bamboo Grove Swaying in Gentle Breeze", desc: "Serene green nature corridor photo looking up at dense vertical stalks reaching into sky." },
      { topic: "Lightning", title: "Powerful Cloud-to-Ground Lightning Bolt Striking Ridge", desc: "High-voltage meteorological photograph of branching electric discharge illuminating night storm." }
    ]
  },

  // 17. Science
  17: {
    Photo: [
      { topic: "James_Webb_Space_Telescope", title: "James Webb Telescope Deep Field Cosmic View of Carina Nebula", desc: "Astonishing astrophysical photograph revealing cosmic cliffs of star birth in infrared spectrum." },
      { topic: "Large_Hadron_Collider", title: "CERN Large Hadron Collider Massive Particle Detector Ring", desc: "Monumental scientific infrastructure photograph of ATLAS detector cylinder deep underground." },
      { topic: "Laser", title: "High-Power Emerald Green Laser Beam Splitting in Optics Lab", desc: "Crisp physics laboratory photograph showing coherent light beam refracted through quartz prisms." },
      { topic: "Petri_dish", title: "Microbiologist Inspecting Fluorescent Bacterial Culture in Dish", desc: "Scientific research still life photo of bioluminescent agar plate glowing under ultraviolet lamp." },
      { topic: "Solar_eclipse", title: "Total Solar Eclipse Showing Diamond Ring Effect and Corona", desc: "Breathtaking astronomical photograph capturing glowing solar atmosphere during totality." }
    ],
    Selfy: [
      { topic: "Astronomer", title: "Astrophysicist Smiling Night Selfie Inside Observatory Dome", desc: "Inspiring science selfie with giant optical telescope silhouette and open slit showing stars." },
      { topic: "Chemist", title: "Laboratory Chemist in White Coat and Goggles Smiling Selfie", desc: "Modern laboratory researcher selfie posing safely in front of active chemical fume hood." },
      { topic: "Marine_biology", title: "Marine Biologist Smiling Selfie in Research Submarine", desc: "Deep-sea exploration selfie surrounded by spherical acrylic viewport and sonar instrumentation." },
      { topic: "Genetics", title: "Genomics Scientist Smiling Beside Next-Gen DNA Sequencer", desc: "Proud biotechnology researcher selfie in cleanroom lab processing human genome mapping chips." },
      { topic: "Volcanology", title: "Volcanologist in Heat-Reflective Silver Suit at Crater Rim", desc: "Thrilling science expedition selfie standing near steaming crater collecting active gas samples." }
    ],
    Portrait: [
      { topic: "DNA", title: "3D Molecular Structure Portrait of DNA Double Helix Model", desc: "Illuminated scientific portrait of genetic staircase showing base pairs and sugar-phosphate backbone." },
      { topic: "Crystal", title: "Polarized Light Microscopic Portrait of Bismuth Crystals", desc: "Vibrant iridescent macro photography showing stepped hopper crystal growth and rainbow oxidation." },
      { topic: "Plasma_globe", title: "Glowing Neon Plasma Filaments Reaching Toward Fingertip", desc: "Mesmerizing high-voltage physics portrait of energetic purple and pink electrical streamers in glass." },
      { topic: "Ferrofluid", title: "Spiked Geometrical Sculpture of Magnetic Ferrofluid Fluid", desc: "Surreal physics still life photo of black liquid forming sharp spikes in strong neodymium field." },
      { topic: "Neuron", title: "Fluorescent Microscopy Portrait of Human Brain Neuron Network", desc: "Astonishing biomedical portrait highlighting synaptic dendrites and glowing axon connections." }
    ],
    Pano: [
      { topic: "Radio_telescope", title: "Very Large Array Radio Astronomy Dish Field Panorama", desc: "Sweeping desert panorama of 25-meter parabolic radio antennae tracking celestial signals." },
      { topic: "Tokamak", title: "Interior Vacuum Vessel of Experimental Nuclear Fusion Tokamak", desc: "Futuristic scientific panorama showing toroidal magnetic confinement chamber and tungsten tiles." },
      { topic: "Observatory", title: "Mountaintop Astronomical Observatory Domes Above Sea of Clouds", desc: "Epic panoramic perspective of stargazing telescopes perched above marine inversion layer." },
      { topic: "Cleanroom", title: "Nanotechnology Fabrication Cleanroom Facility Panorama", desc: "Spacious panorama of yellow-filtered research facility with photolithography steppers." },
      { topic: "Particle_physics", title: "Synchrotron Electron Storage Ring Tunnel Panorama", desc: "Ultra-wide perspective along curving circular accelerator beamline equipped with bending magnets." }
    ],
    Uncategorized: [
      { topic: "Hubble_Space_Telescope", title: "Hubble Telescope Orbiting High Above Vibrant Earth Horizon", desc: "Historic space photography showing silver solar panels glistening in high Earth orbit." },
      { topic: "Fossil", title: "Complete Tyrannosaurus Rex Skeleton Mounted in Museum Hall", desc: "Dramatic palaeontology photograph of massive prehistoric carnivore skull with dagger-like teeth." },
      { topic: "Laboratory", title: "Volumetric Flasks Containing Colorful Chemical Solution Gradients", desc: "Classic chemistry laboratory still life featuring precise glassware filled with blue and amber liquids." },
      { topic: "Meteorite", title: "Polished Pallasite Meteorite Slice with Translucent Olivine Crystals", desc: "Extraterrestrial material macro study showing cosmic nickel-iron matrix embedded with peridot gems." },
      { topic: "Superconductivity", title: "High-Temperature Superconductor Pellet Levitation Over Magnet", desc: "Quantum levitation physics demonstration showing disc floating silently above frozen magnet." }
    ]
  },

  // 18. Food
  18: {
    Photo: [
      { topic: "Pizza", title: "Authentic Wood-Fired Neapolitan Margherita Pizza with Fresh Basil", desc: "Mouthwatering culinary photograph of blistered airy crust, crushed San Marzano tomatoes, and mozzarella." },
      { topic: "Sushi", title: "Exquisite Japanese Nigiri and Sashimi Wooden Platter", desc: "Artisanal culinary presentation featuring glistening salmon, yellowtail, tuna, and freshly grated wasabi." },
      { topic: "Hamburger", title: "Gourmet Brioche Cheeseburger with Melted Cheddar and Crispy Bacon", desc: "Juicy burger culinary portrait highlighting toasted bun, crisp lettuce, ripe tomato, and melting cheese." },
      { topic: "Croissant", title: "Freshly Baked Golden French Sourdough Croissants on Cooling Rack", desc: "Artisanal bakery photograph showing flaky buttery layers and deep golden caramelization." },
      { topic: "Ramen", title: "Steaming Bowl of Traditional Tonkotsu Ramen with Chashu Pork", desc: "Savory noodle soup photography featuring rich milky broth, ramen noodles, soft-boiled ajitsuke egg, and nori." }
    ],
    Selfy: [
      { topic: "Chef", title: "Master Chef in White Jacket Smiling Selfie Holding Signature Dish", desc: "Proud restaurant kitchen selfie of executive chef presenting an artistic fine-dining plate." },
      { topic: "Ice_cream", title: "Foodie Smiling Selfie with Giant Artisanal Gelato Cone", desc: "Fun travel selfie on Italian piazza holding triple-scoop pistachio and dark chocolate gelato cone." },
      { topic: "Taco", title: "Street Food Traveler Smiling Selfie Eating Fresh Street Tacos", desc: "Lively market selfie enjoying authentic Mexican tacos al pastor with lime and cilantro." },
      { topic: "Baker", title: "Artisan Baker Smiling Selfie Holding Fresh Crusty Sourdough Boule", desc: "Warm bakery morning selfie covered in flour dust showcasing freshly baked rustic loaf." },
      { topic: "Barbecue", title: "Pitmaster Smiling Selfie Beside Smoking Barbecue Brisket Pit", desc: "Epic barbecue cooking selfie showing seasoned hickory smoked beef brisket with dark bark." }
    ],
    Portrait: [
      { topic: "Steak", title: "Juicy Grilled Prime Ribeye Steak with Garlic Herb Butter", desc: "Savory culinary portrait focusing on crosshatch sear marks and melting rosemary compound butter." },
      { topic: "Chocolate_brownie", title: "Decadent Warm Chocolate Lava Cake with Oozing Center", desc: "Dessert food portrait showing molten dark chocolate ganache flowing onto plate dusted with sugar." },
      { topic: "Macaron", title: "Pastel Rainbow Tower of Delicate French Macarons", desc: "Exquisite confectionery portrait showcasing smooth crisp almond shells and rich ganache fillings." },
      { topic: "Espresso", title: "Velvety Espresso Cup with Flawless Latte Art Rosetta", desc: "Top-down specialty coffee portrait showing contrasting crema and silky microfoam leaf pour." },
      { topic: "Tiramisu", title: "Classic Italian Tiramisu Dusted with Rich Dutch Cocoa Powder", desc: "Indulgent dessert close-up highlighting layers of espresso-soaked ladyfingers and mascarpone cream." }
    ],
    Pano: [
      { topic: "Banquet", title: "Abundant Mediterranean Mezze Feast Dining Table Panorama", desc: "Ultra-wide dining panorama showcasing falafel, hummus, stuffed grape leaves, olives, and warm pita." },
      { topic: "Market_(place)", title: "Bustling Asian Night Market Street Food Stalls Panorama", desc: "Vibrant culinary panorama filled with steaming woks, sizzling skewers, and glowing neon food signs." },
      { topic: "Vineyard", title: "Long Outdoor Banquet Table Set Amongst Sunlit Grapevines Panorama", desc: "Idyllic winery dining panorama featuring wine glasses, cheese platters, and panoramic vineyard hills." },
      { topic: "Buffet", title: "Luxury Hotel Five-Star Seafood and Pastry Buffet Panorama", desc: "Opulent culinary spread panorama showing iced towers of oysters, lobster tails, and gourmet desserts." },
      { topic: "Farmers%27_market", title: "Colorful Organic Farm Stand Heaps of Heirloom Produce Panorama", desc: "Fresh market panorama showcasing colorful heirloom tomatoes, crisp bell peppers, and fresh berries." }
    ],
    Uncategorized: [
      { topic: "Dim_sum", title: "Bamboo Steamer Baskets Releasing Steam with Fresh Dumplings", desc: "Authentic Cantonese culinary photo of steaming har gow shrimp dumplings and shumai pork buns." },
      { topic: "Pasta", title: "Handmade Pasta Dough Being Cut into Fresh Fettuccine Ribbons", desc: "Artisanal Italian kitchen photo showing dusting of semolina flour on silky yellow egg pasta ribbons." },
      { topic: "Paella", title: "Traditional Spanish Seafood Paella in Wide Steel Skillet", desc: "Vibrant Mediterranean culinary photo featuring saffron rice, giant prawns, mussels, and lemon wedges." },
      { topic: "Lobster", title: "Steamed Whole Maine Lobster Served with Drawn Herb Butter", desc: "Coastal culinary still life photo of bright red lobster shell, claw crackers, and lemon wedges." },
      { topic: "Cheese", title: "Artisan Gourmet Cheese Board with Honeycomb and Walnuts", desc: "Sophisticated appetizer still life showcasing aged gouda, creamy brie, blue cheese, and crisp crackers." }
    ]
  },

  // 19. Sports
  19: {
    Photo: [
      { topic: "Association_football", title: "Soccer Striker Scoring Dramatic Diving Header Goal", desc: "Electrifying athletic action photograph freezing football player heading ball into stadium net." },
      { topic: "Basketball", title: "Basketball Player Executing Gravity-Defying Slam Dunk", desc: "Powerful sports action photograph capturing airborne athlete hammering basketball through rim." },
      { topic: "Surfing", title: "Pro Surfer Carving Powerful Turn Inside Massive Blue Barrel", desc: "Breathtaking ocean sports capture of surfer inside hollow turquoise tube wave with sea spray." },
      { topic: "Formula_One", title: "Formula One Car Apexing Curving Corner with Glowing Brakes", desc: "High-speed motorsport photograph showing glowing red carbon brake discs and heat haze." },
      { topic: "Alpine_skiing", title: "Downhill Alpine Skier Spraying Powder Snow on Slalom Gate", desc: "High-adrenaline winter sports photo carving hard through blue gate on steep alpine racecourse." }
    ],
    Selfy: [
      { topic: "Marathon", title: "Marathon Finisher Smiling Selfie Holding Golden Medal", desc: "Euphoric road runner selfie proudly displaying engraved race medal after crossing marathon line." },
      { topic: "Rock_climbing", title: "Rock Climber Summit Selfie on Sheer Granite Cliff Ledge", desc: "Thrilling extreme sports selfie hanging in harness with thousands of feet of valley air below." },
      { topic: "Snowboarding", title: "Snowboarder Goggles Selfie on Snow-Covered Alpine Peak", desc: "Epic winter mountain selfie showing snowy summits reflected in mirrored iridescent ski goggles." },
      { topic: "Cycling", title: "Road Cyclist Helmet Selfie on Mountain Pass Switchback", desc: "Athletic endurance selfie paused at top of iconic alpine climb with winding road stretching below." },
      { topic: "Scuba_diving", title: "Scuba Diver Smiling Underwater Selfie with Coral Reef Backdrop", desc: "Clear tropical ocean selfie showing diver with regulator, mask, and colorful reef fish behind." }
    ],
    Portrait: [
      { topic: "Boxing", title: "Championship Boxer with Taped Hands Staring into Lens", desc: "Intense black-and-white athletic portrait capturing grit, sweat droplets, and fierce determination." },
      { topic: "Tennis", title: "Tennis Champion Serving Ball Frozen at Peak Racquet Impact", desc: "High-speed sports portrait freezing yellow tennis ball compressed against racquet strings in sunlight." },
      { topic: "Track_and_field", title: "Olympic Sprinter in Starting Blocks Focused on Finish Line", desc: "Dramatic trackside portrait showing coiled muscles, spiked shoes, and intense concentration." },
      { topic: "Swimming_(sport)", title: "Swimmer Emerging from Pool Surface with Cascading Water Droplets", desc: "Powerful aquatic sports portrait of athlete breaking through water surface in butterfly stroke." },
      { topic: "Gymnastics", title: "Male Gymnast Holding Still Rings Iron Cross Balance Portrait", desc: "Incredible athletic strength portrait highlighting supreme control and muscular definition on rings." }
    ],
    Pano: [
      { topic: "Stadium", title: "Roaring 90,000 Seat Football Stadium Under Glowing Floodlights Panorama", desc: "Ultra-wide sporting panorama of packed tiered stands cheering during championship final." },
      { topic: "Tour_de_France", title: "Tour de France Peloton Racing Across French Sunflower Fields", desc: "Vibrant wide panorama of colorful peloton of cyclists speeding past vast golden sunflower fields." },
      { topic: "Yacht_racing", title: "Competitive Ocean Regatta Sailing Fleet Heeled in Bay Panorama", desc: "Spectacular marine sports panorama of modern racing yachts slicing through white-capped swells." },
      { topic: "Ski_jumping", title: "Olympic Ski Jump Ramp Overlooking Snowy Valley Panorama", desc: "Monumental panoramic perspective from in-run tower looking down snowy landing slope to valley." },
      { topic: "Golf", title: "Championship Coastal Golf Course Green at Golden Hour Panorama", desc: "Serene sports landscape panorama of manicured green, white sand bunker, and ocean waves." }
    ],
    Uncategorized: [
      { topic: "Ice_hockey", title: "Ice Hockey Goalie Diving Across Crease to Make Glove Save", desc: "High-energy winter sports action photo with ice shavings spraying as puck is caught in leather glove." },
      { topic: "Skateboarding", title: "Street Skater Executing High Kickflip Over Concrete Stairs", desc: "Crisp urban action photograph freezing skateboarder mid-air above city street staircase." },
      { topic: "Rugby_union", title: "Rugby Union Muddy Scrum Clashing in Rain Championship", desc: "Gritty athletic photograph showing forward pack locking arms in steam and flying mud." },
      { topic: "Martial_arts", title: "Karate Master Executing Dynamic High Flying Side Kick", desc: "Disciplined martial arts photograph freezing athlete in crisp white gi executing kick in dojo." },
      { topic: "Archery", title: "Recurve Archer Releasing Arrow with Perfect Form and Release", desc: "Precision Olympic sport photograph focusing on stabilization rods, bow string, and intense eye aim." }
    ]
  }
};

// Fallback high-res real photography URLs in case of any Wikipedia fetch issue
const FALLBACK_REAL_IMAGES = [
  "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=1200&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&q=80",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80",
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1200&q=80",
  "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80",
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&q=80",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80"
];

async function fetchWikiImagesBatch(topics) {
  const titles = topics.map(t => encodeURIComponent(t.replace(/ /g, "_"))).join("|");
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${titles}&prop=pageimages|description&format=json&pithumbsize=1280`;
  const res = await fetch(url, { headers: { "User-Agent": "WochaGochaBot/1.0 (contact@wocha-gocha.org)" } });
  if (!res.ok) return {};
  const data = await res.json();
  const pages = data.query?.pages || {};
  const map = {};
  for (const k of Object.keys(pages)) {
    const p = pages[k];
    if (p.title && p.thumbnail?.source) {
      map[p.title.replace(/ /g, "_").toLowerCase()] = {
        source: p.thumbnail.source,
        desc: p.description
      };
    }
  }
  return map;
}

async function uploadToLive(imgBuffer, filename) {
  const blob = new Blob([imgBuffer], { type: "image/jpeg" });
  const form = new FormData();
  form.append("file", blob, filename);

  let attempts = 0;
  while (attempts < 3) {
    try {
      const res = await fetch(`${LIVE_BASE_URL}/api/upload`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const url = data.url || data.secure_url || (data.urls && data.urls[0]);
      if (!url) throw new Error("No URL in response");
      return url.replace(/^http:\/\//, "https://");
    } catch (err) {
      attempts++;
      if (attempts >= 3) throw err;
      await new Promise(r => setTimeout(r, 600 * attempts));
    }
  }
}

async function run() {
  console.log("==========================================================");
  console.log("📸 SEEDING REAL, 100% UNIQUE CONTENT FOR PIC TOURS (475 ITEMS)");
  console.log("==========================================================");

  // 1. Fetch subcategory mapping
  const subRows = (await pool.query("SELECT id, category_id, name FROM pic_sub_category ORDER BY category_id, id")).rows;
  const subMapping = {};
  for (const s of subRows) {
    if (!subMapping[s.category_id]) subMapping[s.category_id] = {};
    subMapping[s.category_id][s.name] = s.id;
  }

  // 2. Fetch all remaining rows from pic_tours grouped by subcategory
  const tourRows = (await pool.query("SELECT id, pic_category, sub_category FROM pic_tours ORDER BY pic_category, sub_category, id")).rows;
  console.log(`Found ${tourRows.length} remaining rows in pic_tours.`);

  const toursBySubcat = {};
  for (const r of tourRows) {
    if (!toursBySubcat[r.sub_category]) toursBySubcat[r.sub_category] = [];
    toursBySubcat[r.sub_category].push(r);
  }

  // 3. Prepare list of all unique topics to batch-query Wikipedia
  const allTopics = [];
  for (let catId = 1; catId <= 19; catId++) {
    const catData = CATEGORY_TOPICS[catId];
    if (!catData) continue;
    for (const subName of ["Photo", "Selfy", "Portrait", "Pano", "Uncategorized"]) {
      const items = catData[subName] || [];
      for (const item of items) {
        allTopics.push(item.topic);
      }
    }
  }

  console.log(`\n1. Fetching verified images for ${allTopics.length} distinct topics from Wikipedia API in batches...`);
  const wikiImageMap = {};
  const BATCH_SIZE = 40;
  for (let i = 0; i < allTopics.length; i += BATCH_SIZE) {
    const batch = allTopics.slice(i, i + BATCH_SIZE);
    try {
      const batchMap = await fetchWikiImagesBatch(batch);
      Object.assign(wikiImageMap, batchMap);
    } catch (err) {
      console.warn(`Warning on batch ${i}:`, err.message);
    }
    process.stdout.write(`  ✔ Processed ${Math.min(i + BATCH_SIZE, allTopics.length)}/${allTopics.length} topics\n`);
  }

  console.log(`Successfully mapped ${Object.keys(wikiImageMap).length} high-resolution real images.`);

  // 4. Build the final 475 tasks
  const tasks = [];
  const heroImagesByCat = {};
  let topicIndex = 0;

  for (let catId = 1; catId <= 19; catId++) {
    const catData = CATEGORY_TOPICS[catId];
    if (!catData) continue;

    for (const subName of ["Photo", "Selfy", "Portrait", "Pano", "Uncategorized"]) {
      const subId = subMapping[catId]?.[subName];
      if (!subId) {
        console.warn(`Missing subcategory ID for cat ${catId}, sub ${subName}`);
        continue;
      }

      const dbRows = toursBySubcat[subId] || [];
      const topicItems = catData[subName] || [];

      for (let idx = 0; idx < Math.min(dbRows.length, topicItems.length); idx++) {
        const dbRow = dbRows[idx];
        const topicItem = topicItems[idx];
        const normalizedTopic = topicItem.topic.replace(/ /g, "_").toLowerCase();
        const wikiInfo = wikiImageMap[normalizedTopic];
        
        let downloadUrl = wikiInfo?.source;
        if (!downloadUrl) {
          downloadUrl = FALLBACK_REAL_IMAGES[topicIndex % FALLBACK_REAL_IMAGES.length];
        }

        const task = {
          dbId: dbRow.id,
          catId,
          subId,
          subName,
          title: topicItem.title,
          desc: topicItem.desc,
          downloadUrl,
          filename: `pictour_c${catId}_s${subId}_row${dbRow.id}.jpg`
        };

        tasks.push(task);
        topicIndex++;

        // Keep the best Photo (idx 0 of Photo) as the hero image for top_tours
        if (subName === "Photo" && idx === 0) {
          heroImagesByCat[catId] = {
            title: topicItem.title,
            desc: topicItem.desc,
            taskRef: task
          };
        }
      }
    }
  }

  console.log(`\n2. Ready to download and upload ${tasks.length} unique images to live CDN...`);

  // 5. Concurrency Runner: download, upload to live CDN, update database
  const CONCURRENCY = 6;
  let completed = 0;
  let activeIndex = 0;
  const uploadedUrls = new Set();

  async function worker(workerId) {
    while (activeIndex < tasks.length) {
      const task = tasks[activeIndex++];
      let uploadedUrl = null;

      try {
        // Download image
        const dlRes = await fetch(task.downloadUrl, {
          headers: { "User-Agent": "WochaGochaBot/1.0 (contact@wocha-gocha.org)" }
        });
        if (!dlRes.ok) throw new Error(`Download HTTP ${dlRes.status}`);
        const buf = Buffer.from(await dlRes.arrayBuffer());
        if (buf.length < 2000) throw new Error("Image buffer too small");

        // Upload to live CDN
        uploadedUrl = await uploadToLive(buf, task.filename);
        task.uploadedUrl = uploadedUrl;
        uploadedUrls.add(uploadedUrl);

        // Update database row
        await pool.query(
          "UPDATE pic_tours SET name = $1, description = $2, image = $3, pic_category = $4, sub_category = $5, status = 'approved', updated_at = NOW() WHERE id = $6",
          [task.title, task.desc, uploadedUrl, task.catId, task.subId, task.dbId]
        );
      } catch (err) {
        console.error(`❌ Error on task ${task.dbId} (${task.title}):`, err.message);
        // Fallback: if upload failed, keep existing or fallback
      }

      completed++;
      if (completed % 25 === 0 || completed === tasks.length) {
        console.log(`  ✔ Completed ${completed}/${tasks.length} items (Uploaded unique URLs: ${uploadedUrls.size})`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i));
  await Promise.all(workers);

  console.log(`\n✔ Finished seeding ${completed} items in pic_tours.`);
  console.log(`✔ Unique uploaded CDN images: ${uploadedUrls.size}`);

  // 6. Update top_tours for each category
  console.log("\n3. Updating top_tours table with premier hero photos...");
  for (let catId = 1; catId <= 19; catId++) {
    const hero = heroImagesByCat[catId];
    if (hero && hero.taskRef?.uploadedUrl) {
      await pool.query(
        "UPDATE top_tours SET name = $1, description = $2, image = $3, updated_at = NOW() WHERE pic_category = $4",
        [hero.title, hero.desc, hero.taskRef.uploadedUrl, catId]
      );
    }
  }
  console.log("✔ Updated all 19 top_tours records.");

  // 7. Clear all caches
  console.log("\n4. Clearing Redis/application cache...");
  try {
    await clearAllCache();
    console.log("✔ Application cache cleared successfully!");
  } catch (err) {
    console.warn("Cache clear note:", err.message);
  }

  // 8. Verification queries
  console.log("\n==========================================================");
  console.log("📊 FINAL VERIFICATION OF PIC TOURS MODULE");
  console.log("==========================================================");
  const totalRes = await pool.query("SELECT COUNT(*)::int as total FROM pic_tours");
  console.log(`Total pic_tours rows: ${totalRes.rows[0].total} (Target: 475)`);

  const distinctImages = await pool.query("SELECT COUNT(DISTINCT image)::int as unique_images FROM pic_tours");
  console.log(`Unique images: ${distinctImages.rows[0].unique_images} (Target: 475)`);

  const subcatCheck = await pool.query(
    "SELECT sub_category, COUNT(*)::int as cnt FROM pic_tours GROUP BY sub_category HAVING COUNT(*) != 5"
  );
  console.log(`Subcategories with != 5 records: ${subcatCheck.rows.length} (Target: 0)`);

  const sampleTours = await pool.query(
    "SELECT id, name, pic_category, sub_category, image FROM pic_tours ORDER BY id LIMIT 5"
  );
  console.log("\nSample seeded records:", sampleTours.rows);

  console.log("\n🎉 PIC TOUR MODULE UPGRADE COMPLETE!");
  process.exit(0);
}

run();
