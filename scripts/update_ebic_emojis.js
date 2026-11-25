import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: '168.144.146.112',
  port: 5432,
  user: 'postgres',
  password: 'EE0Pd1ExgVEEl3TXr0X70Bsxw04zoHlUg1xkof1bl9ijD0uFnFRUvYDEK6P6QRHC',
  database: 'watchagocha-db'
});

const categoryEmojis = {
  1: {
    top: '😍',
    items: [
      '🔥', '❤️', '👍', '😂', '✨', '🎉', '🙏', '💯', '👏', '🥰',
      '😎', '🚀', '🌟', '💪', '🙌', '🥳', '💖', '⭐', '👌', '🤩',
      '🤝', '⚡', '💡', '🎯', '🏆', '🎈', '🎊', '💐', '☀️', '🌈'
    ]
  },
  2: {
    top: '😊',
    items: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '☺️', '😇', '🙂',
      '🙃', '😉', '😌', '😘', '😗', '😙', '😚', '😋', '😛', '😜',
      '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑'
    ]
  },
  3: {
    top: '🤝',
    items: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
      '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
      '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🙏'
    ]
  },
  4: {
    top: '🦁',
    items: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅',
      '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐢'
    ]
  },
  5: {
    top: '🍕',
    items: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
      '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍔',
      '🍟', '🌭', '🍿', '🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍦'
    ]
  },
  6: {
    top: '🚀',
    items: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
      '🛻', '🚚', '🚛', '🚜', '🛵', '🏍️', '🛺', '🚲', '🛴', '🛹',
      '🚂', '✈️', '🛸', '🚁', '⛵', '🚤', '🛳️', '🚢', '🛰️', '🏖️'
    ]
  },
  7: {
    top: '💎',
    items: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🕹️', '💽',
      '💾', '💿', '📀', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞',
      '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️'
    ]
  },
  8: {
    top: '❤️',
    items: [
      '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️',
      '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️',
      '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎'
    ]
  },
  9: {
    top: '🏁',
    items: [
      '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏴‍☠️', '🇺🇸', '🇬🇧', '🇨🇦', '🇦🇺',
      '🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸', '🇯🇵', '🇰🇷', '🇨🇳', '🇮🇳', '🇧🇷', '🇲🇽',
      '🇦🇷', '🇳🇱', '🇸🇪', '🇳🇴', '🇩🇰', '🇫🇮', '🇨🇭', '🇦🇹', '🇿🇦', '🇪🇺'
    ]
  }
};

async function updateEBICEmojis() {
  await client.connect();
  console.log('Connected to DB');

  // 1. Update top_gebc
  for (let catId = 1; catId <= 9; catId++) {
    const topEmoji = categoryEmojis[catId].top;
    const res = await client.query(
      'UPDATE top_gebc SET image = $1 WHERE disc_category = $2 RETURNING id, disc_category, image',
      [topEmoji, catId]
    );
    console.log(`Updated top_gebc disc_category ${catId} with emoji: ${topEmoji}`, res.rows);
  }

  // 2. Update gebc items
  for (let catId = 1; catId <= 9; catId++) {
    const emojis = categoryEmojis[catId].items;
    // Exclude id = 271 from updating (keep its existing emoji 😍)
    const itemsRes = await client.query(
      'SELECT id FROM gebc WHERE category = $1 AND id != 271 ORDER BY id ASC',
      [catId]
    );

    const rows = itemsRes.rows;
    console.log(`Found ${rows.length} items for category ${catId}`);

    for (let i = 0; i < rows.length; i++) {
      const emoji = emojis[i % emojis.length];
      await client.query(
        'UPDATE gebc SET image = $1 WHERE id = $2',
        [emoji, rows[i].id]
      );
    }
    console.log(`Successfully updated category ${catId} items with themed emojis`);
  }

  // Verify
  const gebcStats = await client.query(
    'SELECT count(*) as total, count(*) filter (where image ~ \'^https?://\') as url_count, count(*) filter (where not (image ~ \'^https?://\')) as emoji_count FROM gebc'
  );
  console.log('Final gebc stats:', gebcStats.rows[0]);

  const topStats = await client.query(
    'SELECT count(*) as total, count(*) filter (where image ~ \'^https?://\') as url_count, count(*) filter (where not (image ~ \'^https?://\')) as emoji_count FROM top_gebc'
  );
  console.log('Final top_gebc stats:', topStats.rows[0]);

  const sample = await client.query(
    'SELECT id, name, category, image FROM gebc WHERE id IN (1, 17, 25, 49, 73, 97, 121, 145, 169, 193, 271) ORDER BY id'
  );
  console.log('Sample updated items:', sample.rows);

  await client.end();
}

updateEBICEmojis().catch(err => {
  console.error('Error updating EBIC emojis:', err);
  process.exit(1);
});
