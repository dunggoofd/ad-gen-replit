const { pool } = require('./init');

async function getBrandKit(clientId) {
  const result = await pool.query(
    'SELECT * FROM brand_kits WHERE client_id = $1 LIMIT 1',
    [clientId]
  );
  return result.rows[0] || null;
}

async function upsertBrandKit(clientId, fields) {
  const existing = await pool.query(
    'SELECT id FROM brand_kits WHERE client_id = $1',
    [clientId]
  );
  if (existing.rows.length > 0) {
    const result = await pool.query(
      `UPDATE brand_kits
       SET primary_color=$1, secondary_color=$2, accent_color=$3,
           fonts=$4, tone_of_voice=$5, tagline=$6, updated_at=NOW()
       WHERE client_id=$7 RETURNING *`,
      [
        fields.primaryColor, fields.secondaryColor, fields.accentColor,
        fields.fonts,
        fields.toneOfVoice, fields.tagline,
        clientId
      ]
    );
    return result.rows[0];
  }
  const result = await pool.query(
    `INSERT INTO brand_kits
     (client_id, primary_color, secondary_color, accent_color, fonts, tone_of_voice, tagline)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      clientId,
      fields.primaryColor, fields.secondaryColor, fields.accentColor,
      fields.fonts,
      fields.toneOfVoice, fields.tagline
    ]
  );
  return result.rows[0];
}

async function updateLogoFields(clientId, updates) {
  const allowed = ['logo_light', 'logo_dark', 'logo_icon'];
  const keys = Object.keys(updates).filter(k => allowed.includes(k));
  if (keys.length === 0) return getBrandKit(clientId);

  const existing = await pool.query(
    'SELECT id FROM brand_kits WHERE client_id = $1', [clientId]
  );
  if (existing.rows.length === 0) {
    await pool.query(
      'INSERT INTO brand_kits (client_id) VALUES ($1)', [clientId]
    );
  }

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map(k => updates[k]);
  values.push(clientId);
  const result = await pool.query(
    `UPDATE brand_kits SET ${setClauses}, updated_at=NOW() WHERE client_id=$${values.length} RETURNING *`,
    values
  );
  return result.rows[0];
}

async function clearLogoField(clientId, field) {
  const allowed = ['logo_light', 'logo_dark', 'logo_icon'];
  if (!allowed.includes(field)) throw new Error('Invalid logo field');
  const result = await pool.query(
    `UPDATE brand_kits SET ${field} = NULL, updated_at=NOW() WHERE client_id=$1 RETURNING *`,
    [clientId]
  );
  return result.rows[0] || null;
}

module.exports = { getBrandKit, upsertBrandKit, updateLogoFields, clearLogoField };
