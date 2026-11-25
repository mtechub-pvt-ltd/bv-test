import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: '168.144.146.112',
  port: 5432,
  user: 'postgres',
  password: 'EE0Pd1ExgVEEl3TXr0X70Bsxw04zoHlUg1xkof1bl9ijD0uFnFRUvYDEK6P6QRHC',
  database: 'watchagocha-db'
});

const tvProgmaxCategories = [
  { index: 0, name: 'News', french_name: 'Actualités' },
  { index: 1, name: 'Debates', french_name: 'Débats' },
  { index: 2, name: 'Interviews', french_name: 'Interviews' },
  { index: 3, name: 'Series', french_name: 'Séries' },
  { index: 4, name: 'Weather Forecast', french_name: 'Météo' },
  { index: 5, name: 'Documentaries', french_name: 'Documentaires' },
  { index: 6, name: 'Talk Shows', french_name: 'Talk-shows' },
  { index: 7, name: 'Science', french_name: 'Sciences' },
  { index: 8, name: 'Technology', french_name: 'Technologie' },
  { index: 9, name: 'Education', french_name: 'Éducation' },
  { index: 10, name: 'Culture', french_name: 'Culture' },
  { index: 11, name: 'Youth', french_name: 'Jeunesse' },
  { index: 12, name: 'Cooking', french_name: 'Cuisine' },
  { index: 13, name: 'Travel', french_name: 'Voyage' },
  { index: 14, name: 'Health & Wellness', french_name: 'Santé & Bien-être' },
  { index: 15, name: 'Music', french_name: 'Musique' },
  { index: 16, name: 'Quiz', french_name: 'Quiz' },
  { index: 17, name: 'Competitions', french_name: 'Compétitions' },
  { index: 18, name: 'Comedy', french_name: 'Comédie' },
  { index: 19, name: 'Animal & Wildlife', french_name: 'Animaux & Faune' },
  { index: 20, name: 'Nature', french_name: 'Nature' },
  { index: 21, name: 'Religion', french_name: 'Religion' },
  { index: 22, name: 'Ceremonies', french_name: 'Cérémonies' },
  { index: 23, name: 'Shopping', french_name: 'Téléachat' },
  { index: 24, name: 'Sports', french_name: 'Sports' }
];

async function updateTvProgmaxCategories() {
  await client.connect();
  console.log('Connected to DB');

  // Fetch current categories
  const res = await client.query('SELECT id, name, index FROM tv_progmax_category ORDER BY id ASC');
  console.log(`Found ${res.rows.length} existing categories in tv_progmax_category.`);

  for (let i = 0; i < tvProgmaxCategories.length; i++) {
    const item = tvProgmaxCategories[i];
    const catId = i + 1; // IDs are 1 to 25

    const updated = await client.query(
      'UPDATE tv_progmax_category SET name = $1, french_name = $2, "index" = $3, updated_at = NOW() WHERE id = $4 RETURNING id, name, french_name, "index"',
      [item.name, item.french_name, item.index, catId]
    );

    if (updated.rowCount > 0) {
      console.log(`Updated ID ${catId} -> ${updated.rows[0].name} (${updated.rows[0].french_name}), index: ${updated.rows[0].index}`);
    } else {
      // If row doesn't exist, insert it
      const inserted = await client.query(
        'INSERT INTO tv_progmax_category (id, name, french_name, "index", created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, name, french_name, "index"',
        [catId, item.name, item.french_name, item.index]
      );
      console.log(`Inserted ID ${catId} -> ${inserted.rows[0].name}, index: ${inserted.rows[0].index}`);
    }
  }

  // Verify
  const verified = await client.query('SELECT id, name, french_name, "index" FROM tv_progmax_category ORDER BY "index" ASC, id ASC');
  console.log('\nFinal tv_progmax_category list:');
  console.table(verified.rows);

  await client.end();
}

updateTvProgmaxCategories().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
