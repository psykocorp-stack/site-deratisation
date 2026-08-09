// api/dispatch.js — Partenaire accepte/refuse un lead
// Appelé depuis les liens Telegram : /api/dispatch?token=...
const { createClient } = require('@libsql/client');
const { verifierLien, envoyerTelegram, notifierAdmin, genererLienChantier } = require('./auto-dispatch');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'psykocorp@gmail.com';

function getDb() {
  if (TURSO_URL && TURSO_TOKEN) return createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  return null;
}

function htmlPage(title, msg, emoji) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f1f5f9;color:#1e293b}.card{background:white;padding:48px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center;max-width:480px}h1{font-size:3rem;margin:0 0 8px}p{font-size:1.1rem;color:#64748b;margin:0 0 24px}a{display:inline-block;padding:12px 24px;background:#0a1628;color:white;text-decoration:none;border-radius:8px;font-weight:600}</style></head><body><div class="card"><h1>${emoji}</h1><h2>${title}</h2><p>${msg}</p><a href="/admin.html">← Admin</a></div></body></html>`;
}

module.exports = async function handler(req, res) {
  const { token } = req.query || {};
  if (!token) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(htmlPage('Erreur', 'Token manquant.', '❌'));
  }

  const verification = verifierLien(token);
  if (!verification.valide) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(403).send(htmlPage('Erreur', 'Token invalide : ' + verification.erreur, '🚫'));
  }

  const { leadId, partenaireId, action } = verification;
  const client = getDb();
  if (!client) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(htmlPage('Erreur', 'Base de données non disponible.', '⚠️'));
  }

  try {
    // Vérifier que le lead existe
    const leadRows = await client.execute({ sql: 'SELECT * FROM leads WHERE id = ?', args: [leadId] });
    const partenaireRows = await client.execute({ sql: 'SELECT * FROM partenaires WHERE id = ?', args: [partenaireId] });

    const lead = leadRows.rows[0];
    const partenaire = partenaireRows.rows[0];

    if (!lead) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(htmlPage('Introuvable', 'Ce lead n\'existe plus.', '🔍'));
    }

    if (action === 'accepter') {
      // Marquer comme accepté
      await client.execute({
        sql: `UPDATE leads_dispatch SET statut = 'accepte', accepte_le = datetime('now') WHERE lead_id = ? AND partenaire_id = ?`,
        args: [leadId, partenaireId]
      });
      await client.execute({
        sql: `UPDATE leads SET statut = 'accepté', partenaire_id = ? WHERE id = ?`,
        args: [partenaireId, leadId]
      });

      // Envoyer les coordonnées au partenaire
      const message = [
        `✅ *Lead #${leadId} accepté*`,
        ``,
        `👤 ${lead.nom}`,
        `📞 ${lead.telephone}`,
        `📧 ${lead.email}`,
        `📍 ${lead.departement}`,
        `🐀 ${lead.type_nuisible || ''}`,
        `📝 ${lead.message || ''}`,
        lead.urgence ? `\n🚨 URGENT` : '',
      ].filter(Boolean).join('\n');

      if (partenaire && partenaire.telegram_id) {
        await envoyerTelegram(partenaire.telegram_id, message);
        // Lien vers l'espace chantier (photos, commentaires, tarif, clôture)
        const chantierLien = genererLienChantier(leadId);
        const chantierMsg = [
          `🛠️ *Espace chantier #${leadId}*`,
          ``,
          `Accède au chantier pour :`,
          `   • 📸 photos avant/pendant/après`,
          `   • 💬 commentaires`,
          `   • 💰 tarif`,
          `   • 🟥 clôturer l'intervention`,
          ``,
          `🔗 ${chantierLien}`,
        ].join('\n');
        await envoyerTelegram(partenaire.telegram_id, chantierMsg);
      }

      // Notifier admin
      await notifierAdmin(lead, `✅ Lead #${leadId} ACCEPTÉ par *${partenaire?.nom || 'partenaire #' + partenaireId}*`);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(htmlPage('Lead accepté !', `Le lead #${leadId} est accepté. Les coordonnées du client vous ont été envoyées par Telegram.`, '✅'));

    } else if (action === 'refuser') {
      // Marquer comme refusé
      await client.execute({
        sql: `UPDATE leads_dispatch SET statut = 'refuse', refuse_le = datetime('now') WHERE lead_id = ? AND partenaire_id = ?`,
        args: [leadId, partenaireId]
      });

      // Décrémenter charge
      await client.execute({
        sql: `UPDATE partenaires SET charge_actuelle = charge_actuelle - 1 WHERE id = ? AND charge_actuelle > 0`,
        args: [partenaireId]
      });

      // Notifier admin
      await notifierAdmin(lead, `❌ Lead #${leadId} REFUSÉ par *${partenaire?.nom || 'partenaire #' + partenaireId}* — re-dispatch en cours`);

      // Re-dispatch automatique
      const dispatch = require('./auto-dispatch');
      const tousPartenaires = await client.execute({ sql: 'SELECT * FROM partenaires WHERE actif = 1' });
      dispatch.dispatcherLead(lead, client, tousPartenaires.rows).catch(e => console.error('[REDISPATCH]', e.message));

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(htmlPage('Lead refusé', `Lead #${leadId} refusé. Un autre partenaire sera contacté automatiquement.`, '🔄'));
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(htmlPage('Erreur', 'Action inconnue.', '❌'));

  } catch (err) {
    console.error('[DISPATCH] Action error:', err);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(htmlPage('Erreur', err.message, '⚠️'));
  }
};
