import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, AlertTriangle } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { supabase } from '../utils/supabase';

export function AdminPanelPage() {
    const navigate = useNavigate();
    const profile = useUserStore((state) => state.profile);
    const isAdmin = profile?.isAdmin;

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-[#0a0510] flex items-center justify-center p-6">
                <div className="bg-red-900/40 p-6 rounded-2xl border border-red-500/50 text-center">
                    <AlertTriangle className="mx-auto mb-4 text-red-400" size={48} />
                    <h2 className="text-xl font-bold text-red-100 mb-2">Access Denied</h2>
                    <p className="text-red-200 mb-6">You do not have permission to view this page.</p>
                    <button onClick={() => navigate('/game')} className="px-6 py-2 bg-red-600 rounded-full font-bold text-white">Go Back</button>
                </div>
            </div>
        );
    }

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) {
            setStatus('error');
            setMessage('Title and body are required.');
            return;
        }

        setStatus('sending');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated with Supabase.');

            // We need to fetch the backend URL if we want to call it.
            // Since this is standard supabase, we can call invoke.
            const { error } = await supabase.functions.invoke('broadcast-push', {
                body: { title, body, url: '/game' }
            });

            if (error) {
                throw new Error(error.message || 'Failed to broadcast notification.');
            }

            setStatus('success');
            setMessage('Notification broadcasted successfully!');
            setTitle('');
            setBody('');
        } catch (err: any) {
            console.error('Broadcast error:', err);
            setStatus('error');
            setMessage(err.message || 'An unexpected error occurred.');
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0510] text-white p-6 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-900/20 to-transparent pointer-events-none" />
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 max-w-2xl mx-auto">
                <button 
                    onClick={() => navigate('/game')} 
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
                >
                    <ChevronLeft size={20} /> Back to Map
                </button>

                <h1 className="text-4xl font-black tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-300">
                    Admin Panel
                </h1>
                <p className="text-slate-400 mb-8">Broadcast push notifications to all users.</p>

                <form onSubmit={handleBroadcast} className="bg-[#1a1125]/80 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-6 md:p-8 shadow-2xl">
                    
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-purple-200 mb-2 uppercase tracking-wider">Notification Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-black/40 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                            placeholder="e.g. New Story Unlocked!"
                            maxLength={50}
                        />
                    </div>

                    <div className="mb-8">
                        <label className="block text-sm font-bold text-purple-200 mb-2 uppercase tracking-wider">Notification Body</label>
                        <textarea
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            className="w-full bg-black/40 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all min-h-[120px] resize-y"
                            placeholder="e.g. Tap here to discover your future archetype..."
                            maxLength={150}
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        {status !== 'idle' && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`mb-6 p-4 rounded-xl border ${
                                    status === 'success' ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-200' :
                                    status === 'error' ? 'bg-red-900/30 border-red-500/50 text-red-200' :
                                    'bg-blue-900/30 border-blue-500/50 text-blue-200'
                                }`}
                            >
                                {status === 'sending' ? 'Broadcasting to all users...' : message}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button 
                        type="submit"
                        disabled={status === 'sending'}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={20} />
                        {status === 'sending' ? 'SENDING...' : 'BROADCAST NOTIFICATION'}
                    </button>
                </form>
            </div>
        </div>
    );
}
