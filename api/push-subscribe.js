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

      const subObject = {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime || null,
        keys: subscription.keys || {},
        aya_user_id: userId || null
      };

      const isValidUuid = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

      // Attempt 1: Insert with user_id if valid UUID, or user_id: null
      let payload1 = isValidUuid ? { user_id: userId, subscription: subObject } : { user_id: null, subscription: subObject };
      
      let { data: inserted, error: insertError } = await supabase
        .from('push_subscriptions')
        .insert(payload1)
        .select('id')
        .single();

      // Attempt 2: If FK error (23503) or NOT NULL error (23502), try without user_id key
      if (insertError && (insertError.code === '23503' || insertError.code === '23502')) {
        console.warn('[push-subscribe] Attempt 1 failed with constraint code', insertError.code, 'Retrying without user_id...');
        const payload2 = { subscription: subObject };
        const res2 = await supabase
          .from('push_subscriptions')
          .insert(payload2)
          .select('id')
          .single();
        
        if (!res2.error) {
          inserted = res2.data;
          insertError = null;
        } else {
          insertError = res2.error;
        }
      }

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
