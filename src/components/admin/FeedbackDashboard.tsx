import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import {
  getTopRequestedPersonalities,
  getGlobalSentimentDistribution,
  getGlobalDifficultyStats,
  getFeatureUsageStats
} from '../../utils/feedbackUtils';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './FeedbackDashboard.css';

export function FeedbackDashboard() {
  const [topPersonalities, setTopPersonalities] = useState<any[]>([]);
  const [topSearches, setTopSearches] = useState<any[]>([]);
  const [sentimentData, setSentimentData] = useState<any>(null);
  const [difficultyData, setDifficultyData] = useState<any>(null);
  const [featureData, setFeatureData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      // Fetch all aggregate data in parallel
      const [
        personalities,
        sentiment,
        difficulty,
        features
      ] = await Promise.all([
        getTopRequestedPersonalities(10),
        getGlobalSentimentDistribution(),
        getGlobalDifficultyStats(),
        getFeatureUsageStats()
      ]);

      setTopPersonalities(personalities || []);
      setSentimentData(sentiment);
      setDifficultyData(difficulty);
      setFeatureData(features || []);

      // Get top unmatched searches
      const { data: searches, error: searchError } = await supabase
        .from('unmatched_searches')
        .select('search_query');
        
      if (!searchError && searches) {
        const counts = searches.reduce((acc: any, item: any) => {
          acc[item.search_query] = (acc[item.search_query] || 0) + 1;
          return acc;
        }, {});
        
        const sortedSearches = Object.entries(counts)
            .map(([query, count]) => ({ search_query: query, count }))
            .sort((a: any, b: any) => b.count - a.count)
            .slice(0, 10);
            
        setTopSearches(sortedSearches);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading advanced analytics...</div>;
  }

  return (
    <div className="feedback-dashboard">
      <div className="flex justify-between items-center w-full mb-6">
        <h1 className="m-0">📊 Advanced Analytics Dashboard</h1>
        <button onClick={loadDashboardData} className="refresh-btn m-0">🔄 Refresh</button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 w-full">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
          <span className="text-4xl mb-2">🎭</span>
          <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider m-0">Total Feedbacks</h3>
          <p className="text-3xl font-black text-white m-0">{sentimentData?.total || 0}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
          <span className="text-4xl mb-2">⭐</span>
          <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider m-0">Avg Sentiment</h3>
          <p className="text-3xl font-black text-amber-400 m-0">{sentimentData?.avgSentiment || '0.0'}/4.0</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
          <span className="text-4xl mb-2">📈</span>
          <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider m-0">Avg Difficulty</h3>
          <p className="text-3xl font-black text-rose-400 m-0">{difficultyData?.avgDifficulty || '0.0'}/5.0</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
          <span className="text-4xl mb-2">🌟</span>
          <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider m-0">Top Personality</h3>
          <p className="text-xl font-bold text-emerald-400 m-0 truncate w-full">{topPersonalities[0]?.personality_name || 'N/A'}</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Sentiment Pie Chart */}
        <section className="dashboard-card" style={{ minHeight: '350px' }}>
          <h2>😍 Global Sentiment Distribution</h2>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={sentimentData?.distribution || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {(sentimentData?.distribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Difficulty Bar Chart */}
        <section className="dashboard-card" style={{ minHeight: '350px' }}>
          <h2>🎢 Story Difficulty Ratings</h2>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <BarChart data={difficultyData?.distribution || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Feature Usage Bar Chart */}
        <section className="dashboard-card" style={{ minHeight: '350px' }}>
          <h2>🚀 Feature Usage</h2>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <BarChart data={featureData.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" stroke="#94a3b8" allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Top Requested Personalities */}
        <section className="dashboard-card">
          <h2>🎯 Top Wishlisted Personalities</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Personality</th>
                <th>Votes</th>
              </tr>
            </thead>
            <tbody>
              {topPersonalities.slice(0, 10).map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{item.personality_name}</td>
                  <td className="highlight">{item.vote_count}</td>
                </tr>
              ))}
              {topPersonalities.length === 0 && (
                <tr><td colSpan={3} className="text-center text-slate-500 py-4">No data available</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Top Unmatched Searches */}
        <section className="dashboard-card md:col-span-2">
          <h2>🔍 Top Unmatched Searches (Demand Signals)</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Search Query</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {topSearches.slice(0, 10).map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{item.search_query}</td>
                  <td className="highlight">{item.count}</td>
                </tr>
              ))}
              {topSearches.length === 0 && (
                <tr><td colSpan={3} className="text-center text-slate-500 py-4">No data available</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      <div className="mt-8 text-center text-slate-500 text-sm">
        <p>Last updated: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}

export default FeedbackDashboard;
