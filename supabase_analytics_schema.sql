-- Complete Analytics & Feedback Schema Setup
-- Run this script in your Supabase SQL Editor to create all missing tables and enable admin access.

-- 1. CREATE ALL TABLES IF THEY DO NOT EXIST

CREATE TABLE IF NOT EXISTS personality_wishlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  personality_name text NOT NULL,
  vote_count integer DEFAULT 1,
  requested_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, personality_name)
);

CREATE TABLE IF NOT EXISTS journey_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id text NOT NULL,
  sentiment_score integer NOT NULL,
  emoji text,
  session_duration_seconds integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS story_difficulty_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id text NOT NULL,
  difficulty_rating integer NOT NULL,
  part integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS feature_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  session_id text,
  accessed_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS unmatched_searches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  search_query text NOT NULL,
  searched_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS search_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query text NOT NULL,
  query_original text,
  matched boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS journey_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id text NOT NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS user_topic_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  selected_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  response_text text,
  response_rating integer,
  responded_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. ENABLE ROW LEVEL SECURITY

ALTER TABLE personality_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_difficulty_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE unmatched_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_topic_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- 3. HELPER FUNCTION FOR ADMIN VERIFICATION

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ) OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'anitadhakad333@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. SAFELY CREATE POLICIES

DO $$ 
BEGIN
  -- Insert/Update policies for regular users
  DROP POLICY IF EXISTS "Users can insert their own wishlist" ON personality_wishlist;
  CREATE POLICY "Users can insert their own wishlist" ON personality_wishlist FOR INSERT WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can update their own wishlist" ON personality_wishlist;
  CREATE POLICY "Users can update their own wishlist" ON personality_wishlist FOR UPDATE USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert journey feedback" ON journey_feedback;
  CREATE POLICY "Users can insert journey feedback" ON journey_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert difficulty feedback" ON story_difficulty_feedback;
  CREATE POLICY "Users can insert difficulty feedback" ON story_difficulty_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert feature usage" ON feature_usage;
  CREATE POLICY "Users can insert feature usage" ON feature_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert unmatched searches" ON unmatched_searches;
  CREATE POLICY "Users can insert unmatched searches" ON unmatched_searches FOR INSERT WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Anyone can insert search logs" ON search_logs;
  CREATE POLICY "Anyone can insert search logs" ON search_logs FOR INSERT WITH CHECK (true);

  -- Admin Select Policies
  DROP POLICY IF EXISTS "Admins can view all wishlists" ON personality_wishlist;
  CREATE POLICY "Admins can view all wishlists" ON personality_wishlist FOR SELECT USING (is_admin());

  DROP POLICY IF EXISTS "Admins can view all feedback" ON journey_feedback;
  CREATE POLICY "Admins can view all feedback" ON journey_feedback FOR SELECT USING (is_admin());

  DROP POLICY IF EXISTS "Admins can view all difficulty ratings" ON story_difficulty_feedback;
  CREATE POLICY "Admins can view all difficulty ratings" ON story_difficulty_feedback FOR SELECT USING (is_admin());

  DROP POLICY IF EXISTS "Admins can view all feature usage" ON feature_usage;
  CREATE POLICY "Admins can view all feature usage" ON feature_usage FOR SELECT USING (is_admin());

  DROP POLICY IF EXISTS "Admins can view all unmatched searches" ON unmatched_searches;
  CREATE POLICY "Admins can view all unmatched searches" ON unmatched_searches FOR SELECT USING (is_admin());

  DROP POLICY IF EXISTS "Admins can view all search logs" ON search_logs;
  CREATE POLICY "Admins can view all search logs" ON search_logs FOR SELECT USING (is_admin());
END $$;
