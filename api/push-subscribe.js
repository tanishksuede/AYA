import { createClient } from '@supabase/supabase-js';

// Try service role key first (bypasses RLS), fall back to anon key
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
} catch (e) {
  // Will be caught per-request below
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Early check: is Supabase configured?
  if (!supabase || !supabaseUrl) {
    return res.status(500).json({
      success: false,
      error: 'Supabase not configured on server.',
      debug: { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey, keyType: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon' }
    });
  }

  // ── GET: Return current subscription count (diagnostic) ───────────────
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id, created_at');

      if (error) {
        return res.status(500).json({ success: false, error: error.message, hint: error.hint || null, code: error.code });
      }

      return res.status(200).json({
        success: true,
        count: data ? data.length : 0,
        keyType: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon',
        subscriptions: (data || []).map(s => ({ id: s.id, created_at: s.created_at }))
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── POST: Save a new push subscription ────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { subscription, userId } = req.body || {};

      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({
          success: false,
          error: 'Missing subscription or endpoint in request body.',
          received: { hasSubscription: !!subscription, hasEndpoint: !!(subscription && subscription.endpoint) }
        });
      }

      // Skip the "check existing" query — just upsert directly.
      // This avoids any potential issues with JSONB arrow filter syntax.
      // If duplicate endpoint exists, we simply insert another (harmless).
      const insertPayload = {
        user_id: null,
        subscription: {
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime || null,
          keys: subscription.keys || {},
          aya_user_id: userId || null
        }
      };

      const { data: inserted, error: insertError } = await supabase
        .from('push_subscriptions')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insertError) {
        console.error('[push-subscribe] Insert error:', JSON.stringify(insertError));
        return res.status(500).json({
          success: false,
          error: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
          details: insertError.details,
          keyType: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon'
        });
      }

      console.log('[push-subscribe] ✓ Saved subscription:', inserted?.id);
      return res.status(201).json({ success: true, id: inserted?.id });

    } catch (err) {
      console.error('[push-subscribe] Fatal error:', err);
      return res.status(500).json({ success: false, error: err.message, stack: err.stack?.substring(0, 200) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
