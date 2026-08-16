import { supabase } from './supabase';

/**
 * Log a journey event (passive tracking)
 * @param userId - User ID from auth
 * @param journeyId - ID of the journey
 * @param eventType - 'journey_start', 'choice_selected', 'journey_complete', etc.
 * @param eventData - Additional data (choice_id, time_spent, etc.)
 */
export async function logJourneyEvent(userId: string, journeyId: string, eventType: string, eventData: any = {}) {
  if (!userId || !journeyId) {
    console.error('logJourneyEvent: Missing userId or journeyId');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('journey_events')
      .insert([
        {
          user_id: userId,
          journey_id: journeyId,
          event_type: eventType,
          event_data: eventData,
          created_at: new Date().toISOString(),
        }
      ]);

    if (error) {
      console.error('Error logging journey event:', error);
      return null;
    }

    console.log(`✓ Logged: ${eventType} for journey ${journeyId}`);
    return data;
  } catch (err) {
    console.error('Exception in logJourneyEvent:', err);
    return null;
  }
}

/**
 * Log sentiment feedback after journey completion
 * @param userId
 * @param journeyId
 * @param sentimentScore - 0-4 (😕 to 🔥)
 * @param emoji
 * @param sessionDurationSeconds
 */
export async function logJourneyFeedback(
  userId: string,
  journeyId: string,
  sentimentScore: number,
  emoji: string,
  sessionDurationSeconds: number | null = null
) {
  if (sentimentScore < 0 || sentimentScore > 4) {
    console.error('Sentiment score must be 0-4');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('journey_feedback')
      .insert([
        {
          user_id: userId,
          journey_id: journeyId,
          sentiment_score: sentimentScore,
          emoji: emoji,
          session_duration_seconds: sessionDurationSeconds,
          created_at: new Date().toISOString(),
        }
      ]);

    if (error) {
      console.error('Error logging feedback:', error);
      return null;
    }

    console.log(`✓ Feedback logged: ${emoji} (${sentimentScore}/4) for journey ${journeyId}`);
    return data;
  } catch (err) {
    console.error('Exception in logJourneyFeedback:', err);
    return null;
  }
}

/**
 * Log feature usage (passive)
 * @param userId
 * @param featureName - 'dna_profile', 'journal', 'search', etc.
 * @param sessionId - Optional session identifier
 */
export async function logFeatureUsage(userId: string, featureName: string, sessionId: string | null = null) {
  try {
    const { data, error } = await supabase
      .from('feature_usage')
      .insert([
        {
          user_id: userId,
          feature_name: featureName,
          session_id: sessionId,
          accessed_at: new Date().toISOString(),
        }
      ]);

    if (error) {
      console.error('Error logging feature usage:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Exception in logFeatureUsage:', err);
    return null;
  }
}

/**
 * Log an unmatched search query (story request demand signal)
 * @param userId
 * @param searchQuery - What they searched for
 */
export async function logUnmatchedSearch(userId: string, searchQuery: string) {
  if (!searchQuery || searchQuery.trim().length === 0) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('unmatched_searches')
      .insert([
        {
          user_id: userId,
          search_query: searchQuery.trim(),
          searched_at: new Date().toISOString(),
        }
      ]);

    if (error) {
      console.error('Error logging unmatched search:', error);
      return null;
    }

    console.log(`✓ Search request logged: "${searchQuery}"`);
    return data;
  } catch (err) {
    console.error('Exception in logUnmatchedSearch:', err);
    return null;
  }
}

/**
 * Add/vote on personality wish list
 * @param userId
 * @param personalityName
 */
export async function addToWishlist(userId: string, personalityName: string) {
  if (!personalityName || personalityName.trim().length === 0) {
    console.error('Personality name cannot be empty');
    return null;
  }

  try {
    // First, try to upsert (insert or update)
    const { data, error } = await supabase
      .from('personality_wishlist')
      .upsert(
        [
          {
            user_id: userId,
            personality_name: personalityName.trim(),
            vote_count: 1,
            requested_at: new Date().toISOString(),
          }
        ],
        {
          onConflict: 'user_id,personality_name',
          ignoreDuplicates: false
        }
      );

    if (error) {
      console.error('Error adding to wishlist:', error);
      return null;
    }

    console.log(`✓ Added to wishlist: ${personalityName}`);
    return data;
  } catch (err) {
    console.error('Exception in addToWishlist:', err);
    return null;
  }
}

/**
 * Log story difficulty rating (1-5)
 * @param userId
 * @param journeyId
 * @param difficultyRating - 1-5
 * @param part - 1 or 2
 */
export async function logDifficultyFeedback(userId: string, journeyId: string, difficultyRating: number, part: number = 1) {
  if (difficultyRating < 1 || difficultyRating > 5) {
    console.error('Difficulty rating must be 1-5');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('story_difficulty_feedback')
      .insert([
        {
          user_id: userId,
          journey_id: journeyId,
          difficulty_rating: difficultyRating,
          part: part,
          created_at: new Date().toISOString(),
        }
      ]);

    if (error) {
      console.error('Error logging difficulty feedback:', error);
      return null;
    }

    console.log(`✓ Difficulty feedback logged: ${difficultyRating}/5 for ${journeyId}`);
    return data;
  } catch (err) {
    console.error('Exception in logDifficultyFeedback:', err);
    return null;
  }
}

/**
 * Save topic preference
 * @param userId
 * @param topic - 'science', 'sports', 'arts', 'business', 'social_impact'
 */
export async function saveTopicPreference(userId: string, topic: string) {
  try {
    const { data, error } = await supabase
      .from('user_topic_preferences')
      .insert([
        {
          user_id: userId,
          topic: topic,
          selected_at: new Date().toISOString(),
        }
      ]);

    if (error) {
      console.error('Error saving topic preference:', error);
      return null;
    }

    console.log(`✓ Topic preference saved: ${topic}`);
    return data;
  } catch (err) {
    console.error('Exception in saveTopicPreference:', err);
    return null;
  }
}

/**
 * Log survey response
 * @param userId
 * @param questionKey - 'biggest_takeaway', 'recommend', 'useful_feature'
 * @param response
 */
export async function saveSurveyResponse(userId: string, questionKey: string, response: string | number) {
  try {
    const { data, error } = await supabase
      .from('survey_responses')
      .insert([
        {
          user_id: userId,
          question_key: questionKey,
          response_text: typeof response === 'string' ? response : null,
          response_rating: typeof response === 'number' ? response : null,
          responded_at: new Date().toISOString(),
        }
      ]);

    if (error) {
      console.error('Error saving survey response:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Exception in saveSurveyResponse:', err);
    return null;
  }
}

/**
 * Get top requested personalities (for admin/wish list display)
 */
export async function getTopRequestedPersonalities(limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from('personality_wishlist')
      .select('personality_name, COUNT(*) as vote_count')
      .order('vote_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching top personalities:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception in getTopRequestedPersonalities:', err);
    return [];
  }
}

/**
 * Get journey feedback summary (for admin dashboard)
 */
export async function getJourneyFeedbackSummary(journeyId: string) {
  try {
    const { data, error } = await supabase
      .from('journey_feedback')
      .select('sentiment_score, emoji')
      .eq('journey_id', journeyId);

    if (error) {
      console.error('Error fetching feedback summary:', error);
      return null;
    }

    const total = data.length;
    const avgSentiment = total > 0
      ? (data.reduce((sum: number, fb: any) => sum + fb.sentiment_score, 0) / total).toFixed(2)
      : 0;

    const sentimentBreakdown = {
      0: data.filter((fb: any) => fb.sentiment_score === 0).length,
      1: data.filter((fb: any) => fb.sentiment_score === 1).length,
      2: data.filter((fb: any) => fb.sentiment_score === 2).length,
      3: data.filter((fb: any) => fb.sentiment_score === 3).length,
      4: data.filter((fb: any) => fb.sentiment_score === 4).length,
    };

    return {
      total_feedbacks: total,
      average_sentiment: parseFloat(avgSentiment as string),
      sentiment_breakdown: sentimentBreakdown,
    };
  } catch (err) {
    console.error('Exception in getJourneyFeedbackSummary:', err);
    return null;
  }
}

export default {
  logJourneyEvent,
  logJourneyFeedback,
  logFeatureUsage,
  logUnmatchedSearch,
  addToWishlist,
  logDifficultyFeedback,
  saveTopicPreference,
  saveSurveyResponse,
  getTopRequestedPersonalities,
  getJourneyFeedbackSummary,
};
