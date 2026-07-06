// dotenv-like loader for init
const { createClient } = require('@libsql/client');

const TURSO_URL = 'libsql://deratisation-psykocorpia.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzkwMjQxNzcsImlkIjoiMDE5ZTM2MWEtNDcwMS03ZWU3LWJiYWQtMjhhYzZjNTMxNWE4IiwicmlkIjoiYTQxYTMyZTYtZjgzZS00ZWQxLWIwZTgtOTdlMzc3ZTFiNGI4In0.mMt-5FJ25436DU9zR1K2aqO0JNMXanc3OuxwEJFzCBJBqfkVdSdrpOqYZNvybB-iPDEN1X7D07Z9sBRdXO1DAw';

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function init() {
  try {
    console.log('🔌 Connecting to Turso...');
    
    // Create leads table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        telephone TEXT NOT NULL,
        email TEXT NOT NULL,
        type_nuisible TEXT NOT NULL,
        type_lieu TEXT DEFAULT '',
        departement TEXT NOT NULL,
        urgence INTEGER DEFAULT 0,
        message TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now', '+2 hours')),
        statut TEXT DEFAULT 'nouveau',
        traite INTEGER DEFAULT 0,
        partenaire_id INTEGER DEFAULT NULL,
        source TEXT DEFAULT 'web'
      )
    `);
    console.log('✅ Table leads créée');

    // Create partenaires table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS partenaires (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        email TEXT DEFAULT '',
        telephone TEXT DEFAULT '',
        depts TEXT DEFAULT '[]',
        nuisibles TEXT DEFAULT '[]',
        actif INTEGER DEFAULT 1,
        telegram_id TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now', '+2 hours'))
      )
    `);
    console.log('✅ Table partenaires créée');

    // Insert Psyko Corp if not exists
    const existing = await db.execute('SELECT id FROM partenaires WHERE id = 1');
    if (existing.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO partenaires (id, nom, email, telephone, depts, nuisibles, actif, telegram_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [1, 'Psyko Corp', 'psykocorp@gmail.com', '0612515432',
               JSON.stringify(['75','92','93','94','78','77','91','95']),
               JSON.stringify(['Rats','Souris','Cafards / Blattes','Punaises de lit','Fourmis','Guêpes / Frelons','Pigeons']),
               1, '2146505139']
      });
      console.log('✅ Partenaire Psyko Corp créé');
    }

    console.log('\n🎉 Turso ready!');
    
    // Show tables
    const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables:', tables.rows.map(r => r.name).join(', '));

  } catch (err) {
    console.error('❌ Erreur:', err.message);
  }
}

init();
