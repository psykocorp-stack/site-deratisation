/**
 * auto-dispatch.js — Dispatch automatique des leads aux partenaires
 *
 * FLUX :
 * 1. Nouveau lead → dispatcherLead() cherche partenaire
 * 2. Partenaire notifié (Telegram + email) avec lien Accept/Refuser
 * 3. Si accepté → coordonnées client révélées au partenaire
 * 4. Si refusé → re-dispatch auto jusqu'à 3 tentatives
 *
 * Intégré dans lead.js (POST) et action.js (refus → re-dispatch)
 */
const crypto = require('crypto');

const HMAC_SECRET = process.env.HMAC_SECRET || process.env.ADMIN_API_KEY || 'dispatch-secret-dev';

// === MATCHING ===
// RV toujours en premier choix pour tous les leads (tois départements)
const RV_NOM = 'RV - PSYKO CORP';

function trouverRVPrioritaire(lead, partenaires) {
  const departementNumber = String(lead.departement || '').replace(/[^0-9]/g, '');
  const nuisible = normaliserTexte(lead.type_nuisible || lead.nuisible || '');

  const rv = partenaires.find(p => p.nom === RV_NOM && p.actif !== 0);
  if (!rv) return null;
  if (rv.charge_actuelle >= rv.charge_max) return null;

  const depts = JSON.parse(rv.departements || '[]');
  const deptMatch = depts.some(d => String(d).replace(/[^0-9]/g, '') === departementNumber);
  if (!deptMatch) return null;

  if (nuisible) {
    const nuisiblesP = JSON.parse(rv.nuisibles || '[]');
    if (!nuisiblesP.some(n => nuisible.includes(normaliserTexte(n)))) return null;
  }

  return rv;
}

function matchingAuto(lead, partenaires) {
  // 1. Toujours essayer RV d'abord
  const rv = trouverRVPrioritaire(lead, partenaires);
  if (rv) return rv;

  // 2. Sinon matching normal parmi les autres partenaires
  const departementNumber = String(lead.departement || '').replace(/[^0-9]/g, '');
  const nuisible = normaliserTexte(lead.type_nuisible || lead.nuisible || '');

  const candidats = partenaires.filter(p => {
    if (p.nom === RV_NOM) return false;
    if (p.actif !== undefined && !p.actif) return false;
    if (p.charge_actuelle >= p.charge_max) return false;

    const depts = JSON.parse(p.departements || '[]');
    const deptMatch = depts.some(d => String(d).replace(/[^0-9]/g, '') === departementNumber);
    if (!deptMatch) return false;

    if (nuisible) {
      const nuisibles = JSON.parse(p.nuisibles || '[]');
      if (!nuisibles.some(n => nuisible.includes(normaliserTexte(n)))) return false;
    }

    return true;
  });

  candidats.sort((a, b) => a.charge_actuelle - b.charge_actuelle);
  return candidats[0] || null;
}

function normaliserTexte(t) {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// === LIENS ===
function genererLienAcceptRefuser(leadId, partenaireId, action) {
  const data = `${leadId}:${partenaireId}:${action}`;
  const hash = crypto.createHmac('sha256', HMAC_SECRET).update(data).digest('hex').substring(0, 20);
  const token = `${leadId}:${partenaireId}:${action}:${hash}`;
  const baseUrl = process.env.BASE_URL || 'https://deratisation.vercel.app';
  return `${baseUrl}/api/dispatch?token=${encodeURIComponent(token)}`;
}

// Lien espace chantier — envoyé au partenaire dès qu'il accepte
function genererLienChantier(leadId) {
  const token = crypto.createHmac('sha256', HMAC_SECRET).update('chantier:' + String(leadId)).digest('hex').substring(0, 24);
  const baseUrl = process.env.BASE_URL || 'https://traitement-des-nuisibles.fr';
  return `${baseUrl}/chantier.html?id=${leadId}&token=${token}`;
}

function verifierLien(token) {
  const parts = token.split(':');
  if (parts.length < 4) return { valide: false, erreur: 'token_invalide' };
  const leadId = parts[0];
  const partenaireId = parts[1];
  const action = parts.slice(2, -1).join(':');
  const hashFourni = parts[parts.length - 1];
  const data = `${leadId}:${partenaireId}:${action}`;
  const hashAttendu = crypto.createHmac('sha256', HMAC_SECRET).update(data).digest('hex').substring(0, 20);
  if (hashFourni !== hashAttendu) return { valide: false, erreur: 'hash_invalide' };
  return { valide: true, leadId: parseInt(leadId), partenaireId: parseInt(partenaireId), action };
}

// === DISPATCH ===
async function dispatcherLead(lead, db, partenaires) {
  let dispatchOk = false;
  let tentative = 0;
  const MAX_TENTATIVES = 3;

  while (!dispatchOk && tentative < MAX_TENTATIVES) {
    tentative++;
    const partenaire = matchingAuto(lead, partenaires || []);
    if (!partenaire) {
      console.log(`[DISPATCH] Aucun partenaire pour lead ${lead.id} (tentative ${tentative})`);
      if (tentative === 1) {
        await notifierAdmin(lead, '⚠️ Aucun partenaire disponible pour le lead #' + lead.id);
      }
      break;
    }

    const lienAccepter = genererLienAcceptRefuser(lead.id, partenaire.id, 'accepter');
    const lienRefuser = genererLienAcceptRefuser(lead.id, partenaire.id, 'refuser');

    const message = [
      `🔔 *Nouveau lead #${lead.id}*`,
      `🐀 ${lead.type_nuisible || lead.nuisible}`,
      `🏠 ${lead.type_lieu || ''} • ${lead.departement}`,
      `📝 ${(lead.message || lead.description || '').substring(0, 200)}`,
      ``,
      `✅ [Accepter](${lienAccepter})`,
      `❌ [Refuser](${lienRefuser})`,
    ].filter(Boolean).join('\n');

    // === NOTIFICATIONS PARTENAIRE ===
    if (partenaire.telegram_id && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
        const payload = { chat_id: String(partenaire.telegram_id), text: message, parse_mode: 'Markdown' };
        const r = await fetch(TELEGRAM_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!r.ok) console.error('[DISPATCH] Telegram:', await r.text());
      } catch (e) { console.error('[DISPATCH] Telegram error:', e.message); }
    } else {
      console.log(`[DISPATCH] Aucun token Telegram pour notification au partenaire #${partenaire.id}`);
    }

    try {
      await db.execute({
        sql: `INSERT INTO leads_dispatch (lead_id, partenaire_id, statut, token_accepter, token_refuser) VALUES (?, ?, 'envoye', ?, ?)`,
        args: [lead.id, partenaire.id, lienAccepter, lienRefuser]
      });
      await db.execute({
        sql: `UPDATE partenaires SET charge_actuelle = charge_actuelle + 1 WHERE id = ?`,
        args: [partenaire.id]
      });
    } catch (e) {
      console.error('[DISPATCH] DB error:', e.message);
    }

    await notifierAdmin(lead, `📤 Dispatché à *${partenaire.nom}* (tentative ${tentative})`);
    dispatchOk = true;
  }

  return dispatchOk;
}

// === ANONYMISATION ===
function anonymiserLead(lead) {
  return {
    nuisible: lead.type_nuisible || lead.nuisible,
    type_lieu: lead.type_lieu,
    departement: lead.departement,
    ville: lead.ville,
    code_postal: lead.code_postal,
    description: lead.message || lead.description,
    urgent: lead.urgence
  };
}

// === NOTIFICATIONS ===
async function envoyerTelegram(chatId, message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown', disable_web_page_preview: true })
    });
  } catch (e) { console.error('[DISPATCH] Telegram:', e.message); }
}

async function notifierAdmin(lead, texte) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || '2146505139';
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: texte, parse_mode: 'Markdown', disable_web_page_preview: true })
    });
  } catch (e) { console.error('[DISPATCH] Notif admin:', e.message); }
}

// === EXPORTS ===
module.exports = {
  matchingAuto,
  genererLienAcceptRefuser,
  genererLienChantier,
  verifierLien,
  dispatcherLead,
  anonymiserLead,
  envoyerTelegram,
  notifierAdmin,
  trouverRVPrioritaire,
  normaliserTexte
};
