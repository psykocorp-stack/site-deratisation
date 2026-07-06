// DERATISATION.FR — API Auth (CommonJS)
// Authentification admin — MDP via variable d'env
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me-please';

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { password } = req.body || {};

    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ success: false });
    }

    return res.json({
      success: true,
      apiKey: process.env.ADMIN_API_KEY || 'dev-key-123',
      token: Date.now() + '-' + Math.random().toString(36).substring(2, 11),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
