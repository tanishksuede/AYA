import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// We temporarily use local files as the source of truth for the seed script.
// The app will continue fetching from Supabase directly.
import { STORY_DATABASE } from './src/data/scenarios.js';
import { generateLevels } from './src/utils/levelGenerator.js';

const scenariosMap = STORY_DATABASE;
const masterLevels = generateLevels(18);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log("🌱 Starting Database Seed...");

  // 3. Upsert Scenarios
  console.log("Uploading Scenarios...");
  const scenarioEntries = Object.entries(scenariosMap).map(([id, data]) => ({
    id,
    title: data.title,
    source: data.source,
    frames: data.frames
  }));

  for (let i = 0; i < scenarioEntries.length; i += 50) {
    const chunk = scenarioEntries.slice(i, i + 50);
    const { error } = await supabase.from('scenarios').upsert(chunk);
    if (error) console.error("Error inserting scenarios chunk:", error);
  }

  // 4. Upsert Levels
  console.log("Uploading Levels...");
  const levelEntries = masterLevels.map((lvl, index) => ({
    id: lvl.id,
    day_number: index + 1,
    title: lvl.title,
    description: lvl.description,
    personality: lvl.personality,
    required_stars: lvl.requiredStars,
    year: lvl.year,
    age: lvl.age,
    theme: lvl.theme,
    archetype: lvl.archetype,
    bio: lvl.bio,
    fame: lvl.fame,
    achievements: lvl.achievements,
    lesson: lvl.lesson,
    avatar_url: lvl.avatarUrl,
    scenario_id: lvl.scenarioId,
    idol_traits: lvl.idolTraits,
    status: lvl.status,
    is_locked: lvl.isLocked,
    stars: lvl.stars,
    part1: lvl.part1,
    part2: lvl.part2,
    placeholder: lvl.placeholder
  }));

  for (let i = 0; i < levelEntries.length; i += 50) {
    const chunk = levelEntries.slice(i, i + 50);
    const { error } = await supabase.from('levels').upsert(chunk);
    if (error) console.error("Error inserting levels chunk:", error);
  }

  console.log("✅ Seed Complete! All scenarios and levels have been uploaded.");
}

seed();
