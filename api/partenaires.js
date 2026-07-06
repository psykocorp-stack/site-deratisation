// DERATISATION.FR — API Partenaires (Turso)
const { createClient } = require('@libsql/client');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

function getDb() {
  if (TURSO_URL && TURSO_TOKEN) return createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  return null;
}

function isAuth(req) {
  const key = req.headers['x-api-key'];
  return key === 'dev-key-123' || key === 'admin-key-prod';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!isAuth(req)) return res.status(401).json({ error: 'Non autorisé' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Base de données non configurée' });

  try {
    // GET
    if (req.method === 'GET') {
      const r = await db.execute('SELECT * FROM partenaires ORDER BY created_at DESC');
      const partenaires = r.rows.map(p => ({
        ...p,
        depts: typeof p.depts === 'string' ? JSON.parse(p.depts || '[]') : (p.depts || []),
        nuisibles: typeof p.nuisibles === 'string' ? JSON.parse(p.nuisibles || '[]') : (p.nuisibles || []),
      }));
      return res.json({ partenaires });
    }

    // POST
    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.nom) return res.status(400).json({ error: 'Nom requis' });
      await db.execute({
        sql: 'INSERT INTO partenaires (nom, email, telephone, depts, nuisibles, actif, telegram_id, created_at) VALUES (?,?,?,?,?,?,?,?)',
        args: [
          body.nom,
          body.email || '',
          body.telephone || '',
          JSON.stringify(body.depts || []),
          JSON.stringify(body.nuisibles || []),
          1,
          body.telegram_id || '',
          new Date().toISOString(),
        ],
      });
      return res.json({ success: true, message: 'Partenaire ajouté' });
    }

    // DELETE
    if (req.method === 'DELETE') {
      const id = parseInt(req.query.id);
      if (!id) return res.status(400).json({ error: 'ID requis' });
      await db.execute({ sql: 'DELETE FROM partenaires WHERE id = ?', args: [id] });
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
