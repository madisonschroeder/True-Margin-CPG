// @ts-nocheck
// Vercel Serverless Function — validates access codes
// Valid codes stored in VALID_CODES environment variable (JSON array)

export default function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ valid: false, error: 'Code required' });
    }

    // Parse valid codes from env var (JSON array or comma-separated string)
    const raw = (process.env.VALID_CODES || '').trim();
    let validCodes: string[] = [];
    if (raw.startsWith('[')) {
      try { validCodes = JSON.parse(raw); } catch { validCodes = []; }
    } else if (raw) {
      validCodes = raw.split(',').map((c: string) => c.trim()).filter(Boolean);
    }

    // Admin password always works as fallback
    const ADMIN_CODE = process.env.ADMIN_CODE || '';

    const isValid = validCodes.includes(code.trim()) || (ADMIN_CODE && code.trim() === ADMIN_CODE);

    return res.status(isValid ? 200 : 401).json({ valid: isValid });
  } catch (err) {
    return res.status(500).json({ valid: false, error: 'Server error' });
  }
}
