// api/chantier.js — Espace chantier (upload photos, clôture)
// Partenaire accepte un lead → reçoit un lien sécurisé vers ce chantier.
// Upload photos (NextCloud + email multi-destinataires), commentaires, tarif, clôture.
const { createClient } = require('@libsql/client');
const crypto = require('crypto');
const { Resend } = require('resend');
const { notifierAdmin } = require('./auto-dispatch');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const HMAC_SECRET = process.env.HMAC_SECRET || process.env.ADMIN_API_KEY || 'dispatch-secret-dev';
const RESEND_KEY = process.env.RESEND_API_KEY;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Destinataires photos/récap (multi-stockage email)
const NOTIFY_EMAILS = (process.env.CHANTIER_NOTIFY_EMAILS || 'contact@traitement-des-nuisibles.fr,rvbod92@gmail.com,psykocorp@gmail.com')
  .split(',').map(s => s.trim()).filter(Boolean);

// NextCloud WebDAV
const NC_BASE = process.env.NEXTCLOUD_BASE || 'https://cloud.psykocorp.com/remote.php/dav/files/RV';
const NC_USER = process.env.NEXTCLOUD_USER || 'RV';
const NC_PASS = process.env.NEXTCLOUD_PASS;
const NC_DIR = process.env.NEXTCLOUD_CHANTIER_DIR || '/PSYKO/Chantiers-Traitement-Nuisibles';

let db = null;
function getDb() {
  if (!db && TURSO_URL && TURSO_TOKEN) db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  return db;
}

let resendClient = null;
function getResend() {
  if (!resendClient && RESEND_KEY) resendClient = new Resend(RESEND_KEY);
  return resendClient;
}

// ─── Token accès chantier ─────────────────────
// token = HMAC(leadId) — même logique que les liens dispatch
function chantierToken(leadId) {
  return crypto.createHmac('sha256', HMAC_SECRET).update('chantier:' + String(leadId)).digest('hex').substring(0, 24);
}
function verifierToken(leadId, token) {
  if (!leadId || !token) return false;
  const expected = chantierToken(leadId);
  const a = Buffer.from(token); const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ─── Upload NextCloud (WebDAV) ────────────────
async function ensureNextCloudDir(dirParts) {
  if (!NC_PASS) return false;
  let acc = '';
  for (const p of dirParts) {
    acc += '/' + encodeURIComponent(p);
    try {
      const r = await fetch(NC_BASE + acc, {
        method: 'MKCOL',
        headers: { 'Authorization': 'Basic ' + Buffer.from(NC_USER + ':' + NC_PASS).toString('base64') },
      });
      // MKCOL sur dossier existant => 405/301, c'est OK
    } catch { /* ignore */ }
  }
  return true;
}

async function uploadToNextCloud(remotePath, buffer) {
  if (!NC_PASS) return null;
  try {
    const r = await fetch(NC_BASE + remotePath, {
      method: 'PUT',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(NC_USER + ':' + NC_PASS).toString('base64'),
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });
    if (r.status < 300) return NC_BASE + remotePath;
    console.error('[NEXTCLOUD] upload HTTP', r.status, await r.text());
    return null;
  } catch (e) {
    console.error('[NEXTCLOUD] upload error', e.message);
    return null;
  }
}

// Re-télécharge une photo depuis NextCloud (pour pièces jointes récap)
async function downloadFromNextCloud(remotePath) {
  if (!NC_PASS) return null;
  try {
    const r = await fetch(NC_BASE + remotePath, {
      headers: { 'Authorization': 'Basic ' + Buffer.from(NC_USER + ':' + NC_PASS).toString('base64') },
    });
    if (r.status !== 200) return null;
    const buf = await r.arrayBuffer();
    return Buffer.from(buf).toString('base64');
  } catch (e) {
    console.error('[NEXTCLOUD] download error', e.message);
    return null;
  }
}

// ─── Emails ───────────────────────────────────
function truncate(s, n) { return String(s || '').substring(0, n); }

// Email à chaque photo (pièce jointe)
async function sendPhotoEmail(lead, photoName, etape, ncLien) {
  const rs = getResend();
  if (!rs || !RESEND_KEY) return;
  const nom = ['avant','pendant','apres'].includes(etape)
    ? ({avant:'Avant',pendant:'Pendant',apres:'Après'})[etape]
    : etape;
  const subject = `📸 ${nom} — Chantier #${lead.id} (${lead.type_nuisible} · ${lead.departement})`;
  const text = [
    `Photo enregistrée pour le chantier #${lead.id}.`,
    ``,
    `🏠 ${lead.type_lieu} · ${lead.departement}`,
    `🐀 ${lead.type_nuisible}`,
    `📸 Étape : ${nom}`,
    ncLien ? `\n☁️ Archivée sur NextCloud.` : '\n⚠️ À noter : photo non archivée sur NextCloud.',
  ].join('\n');
  try {
    await rs.emails.send({ from: 'Traitement des Nuisibles <chantier@resend.dev>', to: NOTIFY_EMAILS, subject, text });
    console.log('[EMAIL] photo envoyée', photoName);
  } catch (e) { console.error('[EMAIL] photo:', e.message); }
  // Notif Telegram RV (pratique)
  await notifierAdmin(lead, `📸 Photo *${nom}* pour chantier #${lead.id} (${lead.type_nuisible} · ${lead.departement})${ncLien ? '\n☁️ ' + ncLien : ''}`);
}

// Email récap lors de la clôture (toutes les photos en pièces jointes)
async function sendRecapEmail(lead, photos, montant) {
  const rs = getResend();
  if (!rs || !RESEND_KEY) return;
  // Relancer les photos depuis NextCloud en pièces jointes
  const attestachements = [];
  for (const ph of photos) {
    if (ph.lien && NC_PASS) {
      const remote = ph.lien.startsWith(NC_BASE) && ph.lien.length > NC_BASE.length
        ? ph.lien.substring(NC_BASE.length)
        : ('/PSYKO/Chantiers-Traitement-Nuisibles/chantier-' + lead.id + '/' + encodeURIComponent(ph.filename || ''));
      const b64 = await downloadFromNextCloud(remote);
      if (b64) {
        attestachements.push({ filename: ph.filename || ('photo-' + ph.etape + '-' + ph.id + '.jpg'), content: b64 });
      }
    }
  }
  const subject = `✅ Chantier #${lead.id} CLÔTURÉ — ${lead.type_nuisible} · ${lead.departement} · ${montant ? montant + '€' : 'tarif à fixer'}`;
  const text = [
    `Intervention clôturée.`,
    ``,
    `────────────────────────`,
    `🔎 CLIENT`,
    `   Nom : ${lead.nom}`,
    `   📞 ${lead.telephone}`,
    `   📧 ${lead.email}`,
    `   🏠 ${lead.type_lieu || '—'} · ${lead.departement}`,
    ``,
    `🐀 NUISIBLE : ${lead.type_nuisible}`,
    `📝 Message client : ${lead.message || '—'}`,
    ``,
    `💰 TARIF FIGÉ : ${montant ? montant + ' €' : 'À définir'}`,
    `💳 Paiement : en attente`,
    ``,
    `📝 COMMENTAIRES TECH :`,
    lead.commentaires ? `   ${truncate(lead.commentaires, 2000)}` : '   (aucun)',
    ``,
    `📸 PHOTOS (${photos.length}) :`,
    ...(photos.map((p) => `   [${p.etape}] ${p.filename || ''}${p.lien ? '\n      ' + p.lien : ''}`).slice(0, 30)),
    attestachements.length === 0 ? '' : `\n(${attestachements.length} photo(s) en pièce jointe)`,
    ``,
    `────────────────────────`,
    ``,
    `⚠️ Envoyer le lien de paiement au client.`,
  ].filter(Boolean).join('\n');
  try {
    await rs.emails.send({ from: 'Traitement des Nuisibles <chantier@resend.dev>', to: NOTIFY_EMAILS, subject, text, attachments: attestachements });
    console.log('[EMAIL] récap envoyé', lead.id);
  } catch (e) { console.error('[EMAIL] récap:', e.message); }
  await notifierAdmin(lead, `✅ *Chantier #${lead.id} clôturé*${montant ? ' — ' + montant + '€' : ''}\n👤 ${lead.nom} · ${lead.telephone}\n💳 Paiement : en attente`);
}

// ─── Utils CORS + JSON ────────────────────────
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
}
function json(res, status, obj) { res.status(status).json(obj); }

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const db = getDb();
  if (!db) return json(res, 500, { error: 'Base de données non configurée' });

  const leadId = parseInt(req.query.id || req.body?.id);
  const token = req.query.token || req.body?.token;

  // ── GET : infos chantier (protégé) ───────────
  if (req.method === 'GET') {
    if (!leadId || !verifierToken(leadId, token)) {
      return json(res, 403, { error: 'Accès non autorisé. Lien invalide ou expiré.' });
    }
    const rows = await db.execute({ sql: 'SELECT * FROM leads WHERE id = ?', args: [leadId] });
    const lead = rows.rows[0];
    if (!lead) return json(res, 404, { error: 'Chantier introuvable' });
    const photosRows = await db.execute({ sql: 'SELECT * FROM chantier_photos WHERE lead_id = ? ORDER BY created_at ASC', args: [leadId] });
    return res.json({
      chantier: {
        id: lead.id,
        nom: lead.nom,
        telephone: lead.telephone,
        email: lead.email,
        type_nuisible: lead.type_nuisible,
        type_lieu: lead.type_lieu,
        departement: lead.departement,
        message: lead.message,
        urgence: lead.urgence,
        statut: lead.statut,
        montant: lead.montant || 0,
        statut_paiement: lead.statut_paiement || 'en_attente',
        commentaires: lead.commentaires || '',
        notes: lead.notes || '',
        photos: (photosRows.rows || []).map(p => ({
          id: p.id, etape: p.etape, filename: p.filename, lien: p.lien_nextcloud, created_at: p.created_at
        })),
      }
    });
  }

  // ── POST : upload photo ──────────────────────
  if (req.method === 'POST') {
    if (!leadId || !verifierToken(leadId, token)) {
      return json(res, 403, { error: 'Accès non autorisé. Lien invalide.' });
    }
    const { etape, image_b64, filename, commentaire } = req.body || {};
    if (!etape || !image_b64) return json(res, 400, { error: 'Étape et image requis' });
    if (!['avant','pendant','apres'].includes(etape)) {
      return json(res, 400, { error: "Étape doit être 'avant', 'pendant' ou 'apres'" });
    }

    // Lead exists & accepté ?
    const leadRows = await db.execute({ sql: 'SELECT * FROM leads WHERE id = ?', args: [leadId] });
    const lead = leadRows.rows[0];
    if (!lead) return json(res, 404, { error: 'Chantier introuvable' });
    if (lead.statut === 'clôturé' || lead.statut === 'cloture') {
      return json(res, 400, { error: 'Chantier déjà clôturé' });
    }

    // Décoder + upload NextCloud + email
    let buffer = null;
    try { buffer = Buffer.from(image_b64, 'base64'); } catch { return json(res, 400, { error: 'Image invalide' }); }
    const safeName = (filename || ('chantier-' + leadId + '-' + etape + '-' + Date.now() + '.jpg')).replace(/[^\w.\-]/g, '_');
    const folderParts = ['PSYKO', 'Chantiers-Traitement-Nuisibles', 'chantier-' + leadId];
    await ensureNextCloudDir(folderParts);
    const remotePath = '/' + ['PSYKO', 'Chantiers-Traitement-Nuisibles', 'chantier-' + leadId, safeName].map(encodeURIComponent).join('/');
    const ncLien = await uploadToNextCloud(remotePath, buffer);

    // Enregistre en base
    const ins = await db.execute({
      sql: 'INSERT INTO chantier_photos (lead_id, etape, filename, lien_nextcloud, commentaire) VALUES (?,?,?,?,?)',
      args: [leadId, etape, safeName, ncLien, commentaire || ''],
    });
    const photoId = ins.lastInsertRowid;

    // Notification immédiate (à chaque photo, comme demandé)
    sendPhotoEmail(lead, safeName, etape, ncLien).catch(e => console.error('sendPhoto:', e.message));

    return res.json({ success: true, photo: { id: photoId, etape, filename: safeName, lien: ncLien } });
  }

  // ── PATCH : mise à jour (montant, commentaires) + clôture ──
  if (req.method === 'PATCH') {
    if (!leadId || !verifierToken(leadId, token)) {
      return json(res, 403, { error: 'Accès non autorisé. Lien invalide.' });
    }
    const leadRows = await db.execute({ sql: 'SELECT * FROM leads WHERE id = ?', args: [leadId] });
    const lead = leadRows.rows[0];
    if (!lead) return json(res, 404, { error: 'Chantier introuvable' });

    const { montant, commentaires, notes, cloturer } = req.body || {};
    const updates = []; const args = [];

    if (montant !== undefined && lead.statut !== 'clôturé') {
      const m = parseFloat(montant);
      if (isNaN(m) || m < 0) return json(res, 400, { error: 'Montant invalide' });
      updates.push('montant = ?'); args.push(m);
    }
    if (commentaires !== undefined) { updates.push('commentaires = ?'); args.push(String(commentaires)); }
    if (notes !== undefined) { updates.push('notes = ?'); args.push(String(notes)); }

    const estCloture = lead.statut === 'clôturé' || lead.statut === 'cloture';

    if (cloturer) {
      if (estCloture) return json(res, 400, { error: 'Déjà clôturé' });
      updates.push("statut = 'clôturé'");
      updates.push("statut_paiement = 'en_attente'");
      updates.push("cloture_le = datetime('now')");
    }

    if (updates.length > 0) {
      args.push(leadId);
      await db.execute({ sql: `UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, args });
    }

    // Si clôture → retrouver le lead à jour + photos → email récap
    if (cloturer) {
      const fresh = (await db.execute({ sql: 'SELECT * FROM leads WHERE id = ?', args: [leadId] })).rows[0];
      const photosRows = await db.execute({ sql: 'SELECT * FROM chantier_photos WHERE lead_id = ? ORDER BY created_at ASC', args: [leadId] });
      const photos = (photosRows.rows || []).map(p => ({ id: p.id, etape: p.etape, filename: p.filename, lien: p.lien_nextcloud }));
      sendRecapEmail(fresh, photos, fresh.montant).catch(e => console.error('sendRecap:', e.message));
      return res.json({ success: true, cloture: true, montant: fresh.montant });
    }

    // Retour montant / commentaires actualisés
    const fresh = (await db.execute({ sql: 'SELECT * FROM leads WHERE id = ?', args: [leadId] })).rows[0];
    return res.json({ success: true, chantier: { montant: fresh.montant, commentaires: fresh.commentaires, statut: fresh.statut, statut_paiement: fresh.statut_paiement } });
  }

  return json(res, 405, { error: 'Method not allowed' });
};
