import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import {
  getTopRequestedPersonalities,
} from '../../utils/feedbackUtils';
import './FeedbackDashboard.css';

/**
 * Admin-only dashboard showing feedback analytics
 * Requires admin role in auth
 */
export function FeedbackDashboard() {
  const [topPersonalities, setTopPersonalities] = useState<any[]>([]);
  const [topSearches, setTopSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      // Get top requested personalities
      const personalities = await getTopRequestedPersonalities(20);
      setTopPersonalities(personalities);

      // Get top unmatched searches
      const { data: searches, error: searchError } = await supabase
        .from('unmatched_searches')
        .select('search_query')
        
      if (!searchError && searches) {
        // Group and count
        const counts = searches.reduce((acc: any, item: any) => {
          acc[item.search_query] = (acc[item.search_query] || 0) + 1;
          return acc;
        }, {});
        
        const sortedSearches = Object.entries(counts)
            .map(([query, count]) => ({ search_query: query, count }))
            .sort((a: any, b: any) => b.count - a.count)
            .slice(0, 20);
            
        setTopSearches(sortedSearches);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  return (
    <div className="feedback-dashboard">
      <h1>📊 Feedback & Analytics Dashboard</h1>

      <div className="dashboard-grid">
        {/* Top Requested Personalities */}
        <section className="dashboard-card">
          <h2>🎯 Top Requested Personalities</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Personality</th>
                <th>Votes</th>
              </tr>
            </thead>
            <tbody>
              {topPersonalities.slice(0, 15).map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{item.personality_name}</td>
                  <td className="highlight">{item.vote_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Top Unmatched Searches */}
        <section className="dashboard-card">
          <h2>🔍 Top Unmatched Searches</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Search Query</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {topSearches.slice(0, 15).map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{item.search_query}</td>
                  <td className="highlight">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="dashboard-footer">
        <button onClick={loadDashboardData} className="refresh-btn">
          🔄 Refresh Data
        </button>
        <p className="timestamp">
          Last updated: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default FeedbackDashboard;
