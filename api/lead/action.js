// DERATISATION.FR — Accept/Reject lead action
// Appelé depuis les liens dans l'email notification
const { createClient } = require('@libsql/client');
const crypto = require('crypto');
const { Resend } = require('resend');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '2146505139';
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'psykocorp@gmail.com';
const RESEND_KEY = process.env.RESEND_API_KEY;
const ACTION_SECRET = process.env.ADMIN_API_KEY || 'dev-key-123';

const BASE = 'https://deratisation.vercel.app';

function getDb() {
  if (TURSO_URL && TURSO_TOKEN) {
    return createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  }
  return null;
}

function actionToken(id) {
  return crypto.createHmac('sha256', ACTION_SECRET).update(String(id)).digest('hex').substring(0, 16);
}

async function sendTelegram(msg) {
  if (!TG_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: msg, parse_mode: 'Markdown' }),
    });
  } catch (e) { console.error('TG action:', e.message); }
}

async function sendEmail(subject, text) {
  if (!RESEND_KEY) return;
  try {
    const rs = new Resend(RESEND_KEY);
    await rs.emails.send({ from: 'Dératisation.fr <onboarding@resend.dev>', to: [NOTIFY_EMAIL], subject, text });
  } catch (e) { console.error('Email action:', e.message); }
}

function htmlPage(title, msg, emoji) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f1f5f9;color:#1e293b}.card{background:white;padding:48px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center;max-width:480px}h1{font-size:3rem;margin:0 0 8px}p{font-size:1.1rem;color:#64748b;margin:0 0 24px}a{display:inline-block;padding:12px 24px;background:#0a1628;color:white;text-decoration:none;border-radius:8px;font-weight:600}</style></head><body><div class="card"><h1>${emoji}</h1><h2>${title}</h2><p>${msg}</p><a href="${BASE}/admin.html">← Voir l'admin</a></div></body></html>`;
}

module.exports = async function handler(req, res) {
  const { id, action, token } = req.query || {};
  const leadId = parseInt(id);

  // Validation
  if (!leadId || !action || !token || !['accept', 'reject'].includes(action)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(htmlPage('Erreur', 'Lien invalide ou incomplet.', '❌'));
  }

  const expected = actionToken(leadId);
  if (token !== expected) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(403).send(htmlPage('Erreur', 'Token de sécurité invalide. Action non autorisée.', '🚫'));
  }

  const client = getDb();
  if (!client) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(htmlPage('Erreur', 'Base de données non disponible.', '⚠️'));
  }

  try {
    // Récupérer le lead
    const rows = await client.execute({ sql: 'SELECT * FROM leads WHERE id = ?', args: [leadId] });
    const lead = rows.rows[0];
    if (!lead) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(htmlPage('Introuvable', 'Cette demande de devis n\'existe plus.', '🔍'));
    }

    if (lead.statut === 'accepté' || lead.statut === 'refusé') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send(htmlPage('Déjà traité', `Ce devis a déjà été ${lead.statut}.`, '⏳'));
    }

    // Mettre à jour le statut
    const newStatus = action === 'accept' ? 'accepté' : 'refusé';
    await client.execute({ sql: 'UPDATE leads SET statut = ? WHERE id = ?', args: [newStatus, leadId] });

    const nuisible = lead.type_nuisible || '?';
    const dept = lead.departement || '?';

    if (action === 'accept') {
      // Lead accepté → notification RV avec toutes les infos
      const tgMsg = [
        `✅ *Devis accepté #${leadId}*`,
        ``,
        `👤 ${lead.nom}`,
        `📞 ${lead.telephone}`,
        `📧 ${lead.email}`,
        `🐀 ${nuisible} · ${dept}`,
        `📝 ${lead.message || '—'}`,
        ``,
        `[📋 Admin](${BASE}/admin.html)`,
      ].join('\n');

      await sendTelegram(tgMsg);
      await sendEmail(
        `✅ Devis accepté #${leadId} — ${nuisible} - ${dept}`,
        `Devis #${leadId} accepté.\n\nClient: ${lead.nom}\nTel: ${lead.telephone}\nEmail: ${lead.email}\nNuisible: ${nuisible}\nDépartement: ${dept}\nMessage: ${lead.message || '—'}\n\n${BASE}/admin.html`
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(htmlPage('Devis accepté !', `Le devis #${leadId} a été accepté. Les coordonnées du client te seront transmises.`, '✅'));
    } else {
      // Lead refusé
      await sendTelegram(`❌ *Devis refusé #${leadId}* — ${nuisible} - ${dept}`);
      await sendEmail(
        `❌ Devis refusé #${leadId} — ${nuisible} - ${dept}`,
        `Le devis #${leadId} (${nuisible} - ${dept}) a été refusé.\n\n${BASE}/admin.html`
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(htmlPage('Devis refusé', `Le devis #${leadId} a été refusé.`, '❌'));
    }

  } catch (err) {
    console.error('Action error:', err);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(htmlPage('Erreur', err.message, '⚠️'));
  }
};
