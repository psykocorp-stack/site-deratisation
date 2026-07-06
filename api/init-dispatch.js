// api/init-dispatch.js — Crée les tables partenaires + leads_dispatch
// Appel : GET /api/init-dispatch (protégé par X-API-Key)
const { createClient } = require('@libsql/client');

const ADMIN_KEY = process.env.ADMIN_API_KEY || 'dev-key-123';
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

module.exports = async function handler(req, res) {
  if (req.headers['x-api-key'] !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const client = TURSO_URL && TURSO_TOKEN ? createClient({ url: TURSO_URL, authToken: TURSO_TOKEN }) : null;
  if (!client) return res.status(500).json({ error: 'DB non configurée' });

  const results = [];

  try {
    // Table partenaires
    // Crée la table partenaires si elle n'existe pas
    await client.execute(`CREATE TABLE IF NOT EXISTS partenaires (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      email TEXT,
      telegram_id TEXT,
      telephone TEXT,
      actif INTEGER DEFAULT 1,
      charge_actuelle INTEGER DEFAULT 0,
      charge_max INTEGER DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    results.push('TABLE partenaires OK');

    // Ajout colonnes si manquantes (la table peut déjà exister avec des colonnes legacy)
    for (const [col, type, defaultVal] of [
      ['departements','TEXT',"'[]'"],
      ['nuisibles','TEXT',"'[]'"],
      ['charge_actuelle','INTEGER','0'],
      ['charge_max','INTEGER','10'],
      ['telephone','TEXT',"''"],
      ['whatsapp','TEXT',"''"]
    ]) {
      try {
        await client.execute(`ALTER TABLE partenaires ADD COLUMN ${col} ${type} DEFAULT ${defaultVal}`);
        results.push(`COLUMN ${col} added`);
      } catch (e) {
        if (!e.message.includes('duplicate') && !e.message.includes('already exists'))
          results.push(`COLUMN ${col}: ${e.message}`);
        else results.push(`COLUMN ${col} already exists`);
      }
    }

    // Table leads_dispatch
    await client.execute(`CREATE TABLE IF NOT EXISTS leads_dispatch (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      partenaire_id INTEGER,
      statut TEXT DEFAULT 'en_attente',
      token_accepter TEXT,
      token_refuser TEXT,
      vu_partenaire INTEGER DEFAULT 0,
      accepte_le DATETIME,
      refuse_le DATETIME,
      traite_le DATETIME,
      clos_le DATETIME,
      re_dispatch_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    results.push('TABLE leads_dispatch OK');

    // Ajout colonne partenaire_id à leads si pas présente
    try {
      await client.execute(`ALTER TABLE leads ADD COLUMN partenaire_id INTEGER`);
      results.push('COLUMN partenaire_id added to leads');
    } catch (e) {
      if (!e.message.includes('duplicate column')) results.push('COLUMN partenaire_id: ' + e.message);
      else results.push('COLUMN partenaire_id already exists');
    }

    // Seed partenaire test (TOI — admin par défaut)
    const existing = await client.execute({ sql: 'SELECT COUNT(*) as c FROM partenaires WHERE nom = ?', args: ['RV - PSYKO CORP'] });
    if (existing.rows[0].c === 0) {
      await client.execute({
        sql: `INSERT INTO partenaires (nom, email, telegram_id, telephone, departements, nuisibles, actif, charge_actuelle, charge_max)
              VALUES (?, ?, ?, ?, ?, ?, 1, 0, 10)`,
        args: [
          'RV - PSYKO CORP',
          'psykocorp@gmail.com',
          '2146505139',
          '0612345678',
          JSON.stringify(['75','78','77','60','95','91','17','81']),
          JSON.stringify(['rats','souris','punaises','cafards','fourmis','guepes','frelons','pigeons']),
        ]
      });
      results.push('SEED partenaire RV créé');
    } else {
      results.push('SEED partenaire RV déjà existant');
    }

    return res.json({ success: true, results });
  } catch (err) {
    console.error('[INIT-DISPATCH]', err);
    return res.status(500).json({ error: err.message });
  }
};
