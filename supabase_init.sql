-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO CREATE ALL REQUIRED TABLES

-- 1. Create the Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mobile TEXT UNIQUE,
  name TEXT,
  age INTEGER,
  access_type TEXT,
  access_start_date DATE,
  preferred_theme TEXT,
  preferred_map TEXT,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  stories_completed INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  daily_challenge_completed BOOLEAN DEFAULT false,
  daily_challenge_personality TEXT,
  level_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the Personality Profiles table
CREATE TABLE IF NOT EXISTS public.personality_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  mobile TEXT,
  trait_risk_taker INTEGER,
  trait_creative INTEGER,
  trait_analytical INTEGER,
  trait_social INTEGER,
  trait_ambitious INTEGER,
  future_archetype TEXT,
  interest_goal TEXT,
  interest_struggle TEXT,
  interest_domain TEXT,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  stories_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create the Quiz Responses table
CREATE TABLE IF NOT EXISTS public.quiz_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  responses JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create the Game Sessions table
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  scenario_id TEXT,
  score INTEGER,
  feedback TEXT,
  traits_impact JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Push Subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Disable Row Level Security (RLS) for now to allow your front-end to read/write without complex auth policies.
-- 6. Enable Row Level Security (RLS) and define access policies.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to read and update their own profile
CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);
-- For onboarding, allow insert if the user is authenticated and the ID matches
CREATE POLICY "Users can insert own data" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Similar policies for other tables
CREATE POLICY "Users can access own personality" ON public.personality_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own quiz responses" ON public.quiz_responses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own game sessions" ON public.game_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own push subscriptions" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id);
