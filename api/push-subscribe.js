import { createClient } from '@supabase/supabase-js';

// Use the SERVICE ROLE key so we bypass any RLS policies.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://xyzcompany.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: Return current subscription count (diagnostic) ───────────────
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id, created_at', { count: 'exact' });

      if (error) {
        return res.status(500).json({ success: false, error: error.message, hint: error.hint || null });
      }

      return res.status(200).json({
        success: true,
        count: data ? data.length : 0,
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
        return res.status(400).json({ success: false, error: 'Missing subscription or endpoint in request body.' });
      }

      // Check if this endpoint is already stored
      const { data: existing } = await supabase
        .from('push_subscriptions')
        .select('id')
        .filter('subscription->>endpoint', 'eq', subscription.endpoint)
        .maybeSingle();

      if (existing) {
        return res.status(200).json({ success: true, message: 'Subscription already registered.', id: existing.id });
      }

      // Insert new subscription — user_id is nullable, so we pass null if not available
      const { data: inserted, error: insertError } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: null,  // Always null to avoid FK issues with offline/local UUIDs
          subscription: { ...subscription, aya_user_id: userId || null }
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[push-subscribe] Insert error:', insertError);
        return res.status(500).json({ success: false, error: insertError.message, code: insertError.code, hint: insertError.hint });
      }

      console.log('[push-subscribe] ✓ Saved subscription:', inserted.id);
      return res.status(201).json({ success: true, id: inserted.id });

    } catch (err) {
      console.error('[push-subscribe] Fatal error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
