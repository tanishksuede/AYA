import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://xyzcompany.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

// Initialize Web Push
webpush.setVapidDetails(
  'mailto:support@aya-game.com',
  process.env.VITE_VAPID_PUBLIC_KEY || 'BKuBEyjIX-OtnnyJ7cyBMLwAycYv6POyGVFIxPnlzbReZLxv3S-QP9wcJ-YIE38w_al1tqIDwSf41MUG8JgipZE',
  process.env.VAPID_PRIVATE_KEY || 'HHW51N5h_f1ofvSD3fJvVvToP93qk9lwr7_X7PuuPXo'
);

const STREAK_BODIES = [
  "[Name], at your age Sachin was already playing for India. What are YOU building?",
  "Your [X] day streak says a lot about you. Don't let it die tonight.",
  "[Name], legends aren't born — they show up daily. Like you have for [X] days.",
  "At your age, Kobe was training at 4AM. You just need to open the app. 🏀",
  "[Name], your daily challenge takes 5 minutes. Your streak takes a lifetime to build.",
];

function buildStreakBody(name, streakDays) {
  const dayIndex = new Date().getDate() % STREAK_BODIES.length;
  return STREAK_BODIES[dayIndex]
    .replace(/\[Name\]/g, name)
    .replace(/\[X\]/g, streakDays);
}

function buildNotification(user) {
  const name = user.name || 'Legend';
  const streak = user.current_streak || 0;
  const today = new Date().toISOString().slice(0, 10);
  const completedToday = user.last_challenge_date === today;

  if (completedToday) {
    return {
      title: `🌟 You showed up today, ${name}`,
      body: "That's what legends do. Come back tomorrow to keep your streak alive.",
    };
  }

  if (streak > 0) {
    const idols = ['Sachin', 'Kobe', 'SRK', 'Elon', 'Jobs', 'Musk', 'Ronaldo'];
    const idol = idols[new Date().getDate() % idols.length];
    return {
      title: `🔥 Day ${streak} — Don't break it now`,
      body: buildStreakBody(name, streak).includes('[Name]')
        ? `${name}, at your age ${idol} was already building their legacy. Your streak is alive. Keep it that way.`
        : buildStreakBody(name, streak),
    };
  }

  if (user.last_active_date) {
    return {
      title: `⚡ Start fresh, ${name}`,
      body: "SRK was rejected 100 times at your age. He showed up anyway. Your daily challenge is waiting.",
    };
  }

  return {
    title: `👋 ${name}, your story is waiting`,
    body: "What would you have done at Kobe's age? Step into their shoes today.",
  };
}

export default async function handler(req, res) {
  // Support CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Fetch all push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*, users:user_id(*)');

    if (error) {
      console.error('Supabase fetch error:', error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, sent: 0, failed: 0, message: 'No push subscriptions found in database' });
    }

    // Determine if custom payload from Admin Panel POST request
    const isCustomBroadcast = req.method === 'POST' && req.body && req.body.title;
    const customTitle = isCustomBroadcast ? req.body.title : null;
    const customBody = isCustomBroadcast ? req.body.body : null;
    const customUrl = isCustomBroadcast ? (req.body.url || '/game') : '/?challenge=true';

    // 2. Process notifications in parallel
    const notifications = subscriptions.map(async (sub) => {
      const user = sub.users || {};
      const { title, body } = isCustomBroadcast
        ? { title: customTitle, body: customBody }
        : buildNotification(user);

      const payload = JSON.stringify({
        title,
        body,
        url: customUrl
      });

      try {
        await webpush.sendNotification(sub.subscription, payload);
        return { status: 'fulfilled', subId: sub.id };
      } catch (err) {
        console.error(`Failed to send push to sub ${sub.id}:`, err);
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
        return { status: 'rejected', subId: sub.id, error: err.message };
      }
    });

    const results = await Promise.all(notifications);
    const fulfilled = results.filter(r => r && r.status === 'fulfilled').length;
    const rejected = results.filter(r => r && r.status === 'rejected').length;

    return res.status(200).json({
      success: true,
      processed: results.length,
      sent: fulfilled,
      failed: rejected
    });

  } catch (error) {
    console.error('Fatal Push Notification Error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
