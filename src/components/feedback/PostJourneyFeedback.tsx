import { useState } from 'react';
import { useUserStore } from '../../store/userStore';
import { logJourneyFeedback } from '../../utils/feedbackUtils';
import './PostJourneyFeedback.css';

/**
 * Shown after user completes a journey.
 * Emoji reaction buttons (no text explanation needed).
 * Rewards +5 XP for any feedback given.
 */
export function PostJourneyFeedback({
  journeyId,
  sessionDurationSeconds,
  onFeedbackComplete,
}: {
  journeyId: string;
  sessionDurationSeconds: number | null;
  onFeedbackComplete?: () => void;
}) {
  const user = useUserStore(state => state.profile);
  const addXp = useUserStore(state => state.addXp);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const emojis = [
    { icon: '😕', label: 'Very negative', score: 0 },
    { icon: '😐', label: 'Neutral', score: 1 },
    { icon: '🤔', label: 'Okay', score: 2 },
    { icon: '😊', label: 'Good', score: 3 },
    { icon: '🔥', label: 'Excellent', score: 4 },
  ];

  const handleEmojiClick = async (score: number, emoji: string) => {
    if (!user || !user.id) return;

    setIsLoading(true);

    try {
      // Log feedback to Supabase
      await logJourneyFeedback(
        user.id,
        journeyId,
        score,
        emoji,
        sessionDurationSeconds
      );

      // Show confirmation
      setFeedbackGiven(true);

      // Award XP
      addXp(5);

      // Hide after 2 seconds
      setTimeout(() => {
        setFeedbackGiven(false);
        if (onFeedbackComplete) {
          onFeedbackComplete();
        }
      }, 2000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (feedbackGiven) {
    return (
      <div className="feedback-confirmation">
        <p>✓ Thank you! +5 XP</p>
      </div>
    );
  }

  return (
    <div className="post-journey-feedback">
      <p className="feedback-prompt">How was that journey?</p>

      <div className="emoji-reactions">
        {emojis.map((item) => (
          <button
            key={item.score}
            className="emoji-btn"
            onClick={() => handleEmojiClick(item.score, item.icon)}
            disabled={isLoading}
            title={item.label}
            aria-label={`Rate as ${item.label}`}
          >
            {item.icon}
          </button>
        ))}
      </div>

      <p className="feedback-hint">Your feedback helps us improve</p>
    </div>
  );
}

export default PostJourneyFeedback;
