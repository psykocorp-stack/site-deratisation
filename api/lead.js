// DERATISATION.FR — API Lead (Turso)
// CRUD leads stockés dans Turso (SQLite edge)
// Notifications Mailgun + Telegram en async
const { createClient } = require('@libsql/client');
const crypto = require('crypto');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const RESEND_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'psykocorp@gmail.com';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '2146505139';
const ACTION_SECRET = process.env.ADMIN_API_KEY || 'dev-key-123';

// Génère un token pour les liens Accept/Reject
function actionToken(id) {
  return crypto.createHmac('sha256', ACTION_SECRET).update(String(id)).digest('hex').substring(0, 16);
}

let db = null;

function getDb() {
  if (!db && TURSO_URL && TURSO_TOKEN) {
    db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  }
  return db;
}

function isAuth(req) {
  const key = req.headers['x-api-key'];
  return key === 'dev-key-123' || key === 'admin-key-prod';
}

// ─── Resend ──────────────────────────────────
let resendClient = null;
function getResend() {
  if (!resendClient && RESEND_KEY) {
    const { Resend } = require('resend');
    resendClient = new Resend(RESEND_KEY);
  }
  return resendClient;
}

async function sendEmail(lead) {
  const rs = getResend();
  if (!rs) return;

  // Token pour les liens d'action
  const id = lead.id || 'new';
  const token = actionToken(id);
  const baseUrl = 'https://deratisation.vercel.app';
  const acceptUrl = `${baseUrl}/api/lead/action?id=${id}&action=accept&token=${token}`;
  const rejectUrl = `${baseUrl}/api/lead/action?id=${id}&action=reject&token=${token}`;

  const subject = lead.urgence
    ? `🚨 URGENT - ${lead.type_nuisible} - ${lead.departement}`
    : `📋 Nouveau lead ${lead.type_nuisible} - ${lead.departement}`;

  const text = [
    `Nouvelle demande de devis`,
    ``,
    `🐀 Nuisible: ${lead.type_nuisible}`,
    `🏠 Lieu: ${lead.type_lieu || '—'}`,
    `📍 Département: ${lead.departement}`,
    `🚨 Urgence: ${lead.urgence ? 'OUI' : 'Non'}`,
    `💬 Message: ${lead.message || '—'}`,
    ``,
    `───────────────`,
    `⬆️ ACCEPTER ce devis :`,
    acceptUrl,
    ``,
    `⬇️ REFUSER ce devis :`,
    rejectUrl,
    `───────────────`,
    ``,
    `Les coordonnées client sont transmises uniquement après acceptation.`,
  ].join('\n');

  try {
    await rs.emails.send({
      from: 'Traitement des Nuisibles <onboarding@resend.dev>',
      to: [NOTIFY_EMAIL],
      subject,
      text,
    });
    console.log('Email sent to', NOTIFY_EMAIL);
  } catch (e) { console.error('Resend:', e.message); }
}

// ─── Telegram ─────────────────────────────────
async function sendTelegram(lead) {
  if (!TG_TOKEN) return;
  const urg = lead.urgence ? '🚨' : '';
  const msg = lead.message ? `\n💬 "${lead.message.substring(0, 100)}${lead.message.length > 100 ? '...' : ''}"` : '';
  const text = [
    `${urg} *Nouvelle demande de devis*`,
    ``,
    `👤 *Contact*`,
    `   Nom : ${lead.nom}`,
    `   📞 ${lead.telephone}`,
    `   📧 ${lead.email}`,
    ``,
    `🏠 *Infestation*`,
    `   Type : ${lead.type_nuisible}`,
    `   Lieu : ${lead.type_lieu}`,
    `   📍 ${lead.departement}`,
    lead.urgence ? `\n⚠️ *URGENCE — Intervention rapide requise*` : '',
    msg,
    ``,
    `[📋 Voir dans l'admin](${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://deratisation.vercel.app'}/admin.html)`,
  ].filter(Boolean).join('\n');
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
    });
  } catch (e) { console.error('Telegram:', e.message); }
}

// ─── Seed data ────────────────────────────────
const seedNames = ['Sophie Martin','Pierre Dubois','Marie Leroy','Lucas Bernard','Emma Petit','Hugo Roux','Chloé Moreau','Nathan Girard'];
const seedPhones = ['0612345678','0698765432','0755443322','0777889900','0622334455','0788990011'];
const seedNuisibles = ['Rats','Punaises de lit','Cafards','Guêpes','Fourmis','Pigeons'];
const seedLieux = ['Appartement','Maison','Commerce','Bureaux','Cave'];
const seedDepts = ['75-Paris','92-Hauts-de-Seine','93-Seine-Saint-Denis','94-Val-de-Marne','78-Yvelines','77-Seine-et-Marne'];
const seedMsgs = ['Bruit suspect la nuit','Infestation découverte','Nid visible','Piqûres depuis 2 jours','Trace d\'excréments'];

// ─── Handler ──────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const client = getDb();

  try {
    // ── GET (admin) ───────────────────────────────
    if (req.method === 'GET') {
      if (!isAuth(req)) return res.status(401).json({ error: 'Non autorisé' });
      if (client) {
        const r = await client.execute('SELECT * FROM leads ORDER BY created_at DESC');
        return res.json({ leads: r.rows });
      }
      return res.json({ leads: [] });
    }

    // ── PATCH (admin) ─────────────────────────────
    if (req.method === 'PATCH') {
      if (!isAuth(req)) return res.status(401).json({ error: 'Non autorisé' });
      const { id, statut, partenaire_id, traite } = req.body || {};
      if (!id) return res.status(400).json({ error: 'ID requis' });
      const updates = [];
      const args = [];
      if (statut) { updates.push('statut = ?'); args.push(statut); }
      if (partenaire_id !== undefined) { updates.push('partenaire_id = ?'); args.push(parseInt(partenaire_id)); }
      if (traite !== undefined) { updates.push('traite = ?'); args.push(traite ? 1 : 0); }
      if (updates.length === 0) return res.status(400).json({ error: 'Rien à mettre à jour' });
      args.push(parseInt(id));
      if (client) {
        await client.execute({ sql: `UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, args });
      }
      return res.json({ success: true });
    }

    // ── POST ──────────────────────────────────────
    if (req.method === 'POST') {
      const { seed } = req.query || {};

      // Seed mode
      if (seed) {
        if (!isAuth(req)) return res.status(401).json({ error: 'Non autorisé' });
        const count = parseInt(seed) || 5;
        const now = new Date().toISOString();
        let created = 0;
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(Math.random() * seedNames.length);
          const lead = {
            nom: seedNames[idx],
            telephone: seedPhones[idx % seedPhones.length],
            email: seedNames[idx].toLowerCase().replace(' ', '.') + '@email.fr',
            type_nuisible: seedNuisibles[Math.floor(Math.random() * seedNuisibles.length)],
            type_lieu: seedLieux[Math.floor(Math.random() * seedLieux.length)],
            departement: seedDepts[Math.floor(Math.random() * seedDepts.length)],
            urgence: Math.random() > 0.5 ? 1 : 0,
            message: seedMsgs[Math.floor(Math.random() * seedMsgs.length)],
            created_at: now,
            source: 'seed',
          };
          if (client) {
            await client.execute({
              sql: 'INSERT INTO leads (nom, telephone, email, type_nuisible, type_lieu, departement, urgence, message, created_at, source) VALUES (?,?,?,?,?,?,?,?,?,?)',
              args: [lead.nom, lead.telephone, lead.email, lead.type_nuisible, lead.type_lieu, lead.departement, lead.urgence, lead.message, lead.created_at, lead.source],
            });
            created++;
          }
        }
        return res.json({ success: true, message: `${created} leads générés` });
      }

    // New lead from form
      const body = req.body || {};
      if (!body.nom || !body.telephone || !body.email || !body.type_nuisible || !body.departement) {
        return res.status(400).json({ success: false, errors: ['Champs requis manquants'] });
      }

      const lead = {
        nom: body.nom.trim(),
        telephone: body.telephone.trim(),
        email: body.email.trim(),
        type_nuisible: body.type_nuisible,
        type_lieu: body.type_lieu || '',
        departement: body.departement,
        urgence: body.urgence ? 1 : 0,
        message: body.message || '',
        created_at: new Date().toISOString(),
        source: req.headers['referer'] || 'web',
      };

      if (client) {
        const ins = await client.execute({
          sql: 'INSERT INTO leads (nom, telephone, email, type_nuisible, type_lieu, departement, urgence, message, created_at, source) VALUES (?,?,?,?,?,?,?,?,?,?)',
          args: [lead.nom, lead.telephone, lead.email, lead.type_nuisible, lead.type_lieu, lead.departement, lead.urgence, lead.message, lead.created_at, lead.source],
        });
        lead.id = ins.lastInsertRowid;
      } else {
        lead.id = Date.now();
      }

      // Notifications asynchrones
      sendEmail(lead).catch(e => console.error('Email:', e.message));
      sendTelegram(lead).catch(e => console.error('Telegram:', e.message));

      // Auto-dispatch aux partenaires (synchronisé)
      let dispatchResult = null;
      try {
        const dispatch = require('./auto-dispatch');
        if (client && lead.id) {
          let partenaires = [];
          try {
            const pRows = await client.execute('SELECT * FROM partenaires WHERE actif = 1');
            partenaires = pRows.rows || [];
          } catch(e) {
            if (!e.message.includes('no such table')) console.error('[DISPATCH] Table partenaires:', e.message);
          }
          dispatchResult = await dispatch.dispatcherLead(lead, client, partenaires);
        }
      } catch (e) {
        console.error('[DISPATCH] Error:', e.message);
      }

      return res.json({
        success: true,
        message: 'Votre demande a été envoyée avec succès !',
        dispatch: dispatchResult ? 'ok' : 'no_partenaire'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
