// @ts-nocheck
// Vercel Serverless Function — validates access codes and returns user role
// RLB- prefix codes = consultant (full Client Library access)
// TM- prefix codes = client (single-model view only)

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

    // Admin password always works as fallback (consultant role)
    const ADMIN_CODE = process.env.ADMIN_CODE || '';

    const trimmedCode = code.trim().toUpperCase();
    const isValid = validCodes.includes(trimmedCode) || (ADMIN_CODE && trimmedCode === ADMIN_CODE);

    if (!isValid) {
      return res.status(401).json({ valid: false });
    }

    // Determine role from code prefix
    // RLB- codes = consultant (Right Lane Brands internal — full Client Library)
    // TM- codes = client (single-model, clean experience)
    // Admin code = consultant
    const role = trimmedCode.startsWith('RLB-') ? 'consultant'
               : (ADMIN_CODE && trimmedCode === ADMIN_CODE) ? 'consultant'
               : 'client';

    return res.status(200).json({ valid: true, role });
  } catch (err) {
    return res.status(500).json({ valid: false, error: 'Server error' });
  }
}
