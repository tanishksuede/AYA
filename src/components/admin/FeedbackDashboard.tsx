import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import {
  getTopRequestedPersonalities,
  getGlobalSentimentDistribution,
  getGlobalDifficultyStats,
  getFeatureUsageStats,
  getStoryAnalytics,
  getUserAnalytics,
  getAllJourneyIds
} from '../../utils/feedbackUtils';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './FeedbackDashboard.css';

export function FeedbackDashboard() {
  const [activeTab, setActiveTab] = useState<'global' | 'story' | 'user'>('global');
  
  // Global Data
  const [topPersonalities, setTopPersonalities] = useState<any[]>([]);
  const [topSearches, setTopSearches] = useState<any[]>([]);
  const [sentimentData, setSentimentData] = useState<any>(null);
  const [difficultyData, setDifficultyData] = useState<any>(null);
  const [featureData, setFeatureData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Story Data
  const [storyIds, setStoryIds] = useState<string[]>([]);
  const [selectedStory, setSelectedStory] = useState('');
  const [storyAnalytics, setStoryAnalytics] = useState<any>(null);

  // User Data
  const [searchUserId, setSearchUserId] = useState('');
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadStoryList();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [personalities, sentiment, difficulty, features] = await Promise.all([
        getTopRequestedPersonalities(10),
        getGlobalSentimentDistribution(),
        getGlobalDifficultyStats(),
        getFeatureUsageStats()
      ]);

      setTopPersonalities(personalities || []);
      setSentimentData(sentiment);
      setDifficultyData(difficulty);
      setFeatureData(features || []);

      const { data: searches, error: searchError } = await supabase.from('unmatched_searches').select('search_query');
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

  const loadStoryList = async () => {
    const ids = await getAllJourneyIds();
    setStoryIds(ids);
    if (ids.length > 0) {
      setSelectedStory(ids[0]);
      handleStorySelect(ids[0]);
    }
  };

  const handleStorySelect = async (id: string) => {
    setSelectedStory(id);
    const data = await getStoryAnalytics(id);
    setStoryAnalytics(data);
  };

  const handleUserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUserId.trim()) return;
    setUserLoading(true);
    const data = await getUserAnalytics(searchUserId.trim());
    setUserAnalytics(data);
    setUserLoading(false);
  };

  if (loading) {
    return <div className="dashboard-loading">Loading advanced analytics...</div>;
  }

  return (
    <div className="feedback-dashboard">
      <div className="flex justify-between items-center w-full mb-6">
        <h1 className="m-0">📊 Advanced Analytics Dashboard</h1>
        <button onClick={() => { loadDashboardData(); loadStoryList(); }} className="refresh-btn m-0">🔄 Refresh</button>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-800 pb-4">
        <button className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'global' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`} onClick={() => setActiveTab('global')}>Global Overview</button>
        <button className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'story' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`} onClick={() => setActiveTab('story')}>Per Story Analysis</button>
        <button className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`} onClick={() => setActiveTab('user')}>Per User Analysis</button>
      </div>

      {/* GLOBAL TAB */}
      {activeTab === 'global' && (
        <div className="global-tab">
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
            <section className="dashboard-card" style={{ minHeight: '350px' }}>
              <h2>😍 Global Sentiment Distribution</h2>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={sentimentData?.distribution || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent = 0 }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {(sentimentData?.distribution || []).map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

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

            <section className="dashboard-card">
              <h2>🎯 Top Wishlisted Personalities</h2>
              <table className="data-table">
                <thead>
                  <tr><th>Rank</th><th>Personality</th><th>Votes</th></tr>
                </thead>
                <tbody>
                  {topPersonalities.slice(0, 10).map((item, idx) => (
                    <tr key={idx}><td>{idx + 1}</td><td>{item.personality_name}</td><td className="highlight">{item.vote_count}</td></tr>
                  ))}
                  {topPersonalities.length === 0 && <tr><td colSpan={3} className="text-center text-slate-500 py-4">No data available</td></tr>}
                </tbody>
              </table>
            </section>
            
            <section className="dashboard-card md:col-span-2">
              <h2>🔍 Top Unmatched Searches (Demand Signals)</h2>
              <table className="data-table">
                <thead>
                  <tr><th>Rank</th><th>Search Query</th><th>Count</th></tr>
                </thead>
                <tbody>
                  {topSearches.slice(0, 10).map((item, idx) => (
                    <tr key={idx}><td>{idx + 1}</td><td>{item.search_query}</td><td className="highlight">{item.count}</td></tr>
                  ))}
                  {topSearches.length === 0 && <tr><td colSpan={3} className="text-center text-slate-500 py-4">No data available</td></tr>}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      )}

      {/* STORY TAB */}
      {activeTab === 'story' && (
        <div className="story-tab flex flex-col gap-6">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <h2 className="text-xl font-bold mb-4 text-white">Select Story</h2>
            <select 
              className="w-full bg-slate-950 border border-slate-700 text-white p-3 rounded-lg outline-none focus:border-indigo-500"
              value={selectedStory} 
              onChange={(e) => handleStorySelect(e.target.value)}
            >
              {storyIds.length === 0 && <option value="">No stories played yet</option>}
              {storyIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>

          {storyAnalytics ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center">
                  <h3 className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-2">Completions</h3>
                  <p className="text-3xl font-black text-emerald-400 m-0">{storyAnalytics.completions}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center">
                  <h3 className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-2">Abandons (Drops)</h3>
                  <p className="text-3xl font-black text-rose-400 m-0">{storyAnalytics.abandons}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center">
                  <h3 className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-2">Completion Rate</h3>
                  <p className="text-3xl font-black text-amber-400 m-0">{storyAnalytics.completionRate}</p>
                </div>
              </div>

              <div className="dashboard-grid">
                <section className="dashboard-card">
                  <h2>⏱️ Avg Time Taken Per Frame</h2>
                  <div style={{ width: '100%', height: '300px' }}>
                    <ResponsiveContainer>
                      <BarChart data={storyAnalytics.avgFrameTimes.slice(0, 10)} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <XAxis dataKey="frame_id" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" />
                        <YAxis stroke="#94a3b8" fontSize={12} unit="s" />
                        <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                        <Bar dataKey="avg_time_s" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Avg Time (s)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="dashboard-card overflow-auto max-h-[350px]">
                  <h2>📊 Choice Distribution</h2>
                  <table className="data-table w-full text-sm">
                    <thead><tr><th>Frame ID</th><th>Choice</th><th>Count</th></tr></thead>
                    <tbody>
                      {Object.entries(storyAnalytics.choiceDistribution).map(([frameId, choices]: [string, any]) => (
                        Object.entries(choices).map(([choice, count]: [string, any], idx) => (
                          <tr key={`${frameId}-${idx}`}>
                            <td className="text-slate-300 font-mono">{frameId}</td>
                            <td className="text-white">{choice}</td>
                            <td className="text-indigo-400 font-bold">{count}</td>
                          </tr>
                        ))
                      ))}
                      {Object.keys(storyAnalytics.choiceDistribution).length === 0 && <tr><td colSpan={3} className="text-center text-slate-500 py-4">No choices logged yet</td></tr>}
                    </tbody>
                  </table>
                </section>
              </div>
            </>
          ) : (
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center text-slate-500">
              Select a story above to view detailed analytics.
            </div>
          )}
        </div>
      )}

      {/* USER TAB */}
      {activeTab === 'user' && (
        <div className="user-tab flex flex-col gap-6">
          <form onSubmit={handleUserSearch} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex gap-4">
            <input 
              type="text" 
              placeholder="Enter User ID (UUID)..." 
              className="flex-1 bg-slate-950 border border-slate-700 text-white p-3 rounded-lg outline-none focus:border-indigo-500"
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-colors whitespace-nowrap">
              Search User
            </button>
          </form>

          {userLoading && <div className="text-center p-8 text-indigo-400">Loading user analytics...</div>}
          
          {!userLoading && userAnalytics ? (
            <div className="animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Started</p>
                  <p className="text-2xl font-black text-white">{userAnalytics.totalStoriesStarted}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Completed</p>
                  <p className="text-2xl font-black text-emerald-400">{userAnalytics.totalStoriesCompleted}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Completion Rate</p>
                  <p className="text-2xl font-black text-amber-400">{userAnalytics.completionRate}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Avg Frame Time</p>
                  <p className="text-2xl font-black text-sky-400">{userAnalytics.avgDecisionTimeS}s</p>
                </div>
              </div>
              
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h2 className="text-xl font-bold mb-4 text-white">Recent Activity Log</h2>
                {userAnalytics.recentActivity.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {userAnalytics.recentActivity.map((log: any, idx: number) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col md:flex-row justify-between md:items-center gap-2">
                        <div>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-bold mr-3 ${log.event_type.includes('completed') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {log.event_type}
                          </span>
                          <span className="text-slate-300 font-mono text-sm">{log.journey_id}</span>
                        </div>
                        <div className="text-slate-500 text-xs">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">No activity recorded for this user.</p>
                )}
              </div>
            </div>
          ) : !userLoading && searchUserId && (
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center text-slate-500">
              No user data found or invalid UUID.
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default FeedbackDashboard;
