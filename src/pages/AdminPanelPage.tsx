import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, AlertTriangle, UserPlus, Trash2, Shield } from 'lucide-react';
import { supabase } from '../utils/supabase';

export function AdminPanelPage() {
    const navigate = useNavigate();

    // Admin auth — read persisted Google email from localStorage
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = loading
    const [currentEmail, setCurrentEmail] = useState('');

    useEffect(() => {
        const checkAdmin = async () => {
            const email = localStorage.getItem('aya_google_email');
            if (!email) { setIsAdmin(false); return; }
            setCurrentEmail(email);
            // Founder always gets access
            if (email === 'anitadhakad333@gmail.com') { setIsAdmin(true); return; }
            // Other admins: check database
            try {
                const { data } = await supabase.from('admin_users').select('email').eq('email', email).maybeSingle();
                setIsAdmin(!!data);
            } catch {
                setIsAdmin(false);
            }
        };
        checkAdmin();
    }, []);

    // Notification state
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [notifStatus, setNotifStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [notifMessage, setNotifMessage] = useState('');

    // Admin management state
    const [adminList, setAdminList] = useState<{ id: string; email: string }[]>([]);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [adminStatus, setAdminStatus] = useState<'idle' | 'adding' | 'success' | 'error'>('idle');
    const [adminMessage, setAdminMessage] = useState('');

    // Load admin list
    useEffect(() => {
        if (isAdmin) {
            loadAdmins();
        }
    }, [isAdmin]);

    const loadAdmins = async () => {
        try {
            const { data, error } = await supabase.from('admin_users').select('id, email').order('created_at', { ascending: true });
            if (error) throw error;
            setAdminList(data || []);
        } catch (err: any) {
            console.error('Failed to load admins:', err);
        }
    };

    const handleAddAdmin = async () => {
        const email = newAdminEmail.trim().toLowerCase();
        if (!email || !email.includes('@')) {
            setAdminStatus('error');
            setAdminMessage('Please enter a valid email address.');
            return;
        }
        if (adminList.some(a => a.email === email)) {
            setAdminStatus('error');
            setAdminMessage('This email is already an admin.');
            return;
        }

        setAdminStatus('adding');
        try {
            const { error } = await supabase.from('admin_users').insert({ email });
            if (error) throw error;
            setAdminStatus('success');
            setAdminMessage(`${email} added as admin!`);
            setNewAdminEmail('');
            await loadAdmins();
        } catch (err: any) {
            setAdminStatus('error');
            setAdminMessage(err.message || 'Failed to add admin.');
        }
    };

    const handleRemoveAdmin = async (id: string, email: string) => {
        if (email === 'anitadhakad333@gmail.com') {
            setAdminStatus('error');
            setAdminMessage('Cannot remove the founder account.');
            return;
        }
        try {
            const { error } = await supabase.from('admin_users').delete().eq('id', id);
            if (error) throw error;
            setAdminStatus('success');
            setAdminMessage(`${email} removed.`);
            await loadAdmins();
        } catch (err: any) {
            setAdminStatus('error');
            setAdminMessage(err.message || 'Failed to remove admin.');
        }
    };

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) {
            setNotifStatus('error');
            setNotifMessage('Title and body are required.');
            return;
        }

        setNotifStatus('sending');
        try {
            const res = await fetch('/api/send-notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, body, url: '/game' }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }

            const data = await res.json();
            
            if (data.sent === 0 && data.message) {
                setNotifStatus('error');
                setNotifMessage(data.message);
            } else if (data.failed > 0) {
                setNotifStatus('error');
                setNotifMessage(`Sent to ${data.sent} device(s), but failed for ${data.failed} device(s).`);
            } else {
                setNotifStatus('success');
                setNotifMessage(`Notification broadcasted successfully to ${data.sent} device(s)!`);
                setTitle('');
                setBody('');
            }
        } catch (err: any) {
            console.error('Broadcast error:', err);
            setNotifStatus('error');
            setNotifMessage(err.message || 'An unexpected error occurred.');
        }
    };

    // Loading state
    if (isAdmin === null) {
        return (
            <div className="min-h-screen bg-[#0a0510] flex items-center justify-center">
                <div className="text-purple-300 text-lg animate-pulse">Verifying admin access...</div>
            </div>
        );
    }

    // Access denied
    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-[#0a0510] flex items-center justify-center p-6">
                <div className="bg-red-900/40 p-6 rounded-2xl border border-red-500/50 text-center">
                    <AlertTriangle className="mx-auto mb-4 text-red-400" size={48} />
                    <h2 className="text-xl font-bold text-red-100 mb-2">Access Denied</h2>
                    <p className="text-red-200 mb-4">You do not have permission to view this page.</p>
                    <p className="text-red-300/60 text-xs mb-6">Logged in as: {currentEmail || 'unknown'}</p>
                    <button onClick={() => navigate('/game')} className="px-6 py-2 bg-red-600 rounded-full font-bold text-white">Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[100dvh] bg-[#0a0510] text-white p-6 md:p-12 relative overflow-y-auto overflow-x-hidden pb-32">
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
                <p className="text-slate-400 mb-8">Logged in as <span className="text-purple-300">{currentEmail}</span></p>

                {/* ── SECTION 1: Broadcast Notifications ── */}
                <form onSubmit={handleBroadcast} className="glass-panel rounded-3xl p-6 md:p-8 mb-8">
                    <h2 className="text-xl font-bold text-purple-200 mb-6 flex items-center gap-2">
                        <Send size={20} /> Broadcast Notification
                    </h2>
                    
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

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-purple-200 mb-2 uppercase tracking-wider">Notification Body</label>
                        <textarea
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            className="w-full bg-black/40 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all min-h-[100px] resize-y"
                            placeholder="e.g. Tap here to discover your future archetype..."
                            maxLength={150}
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        {notifStatus !== 'idle' && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`mb-6 p-4 rounded-xl border ${
                                    notifStatus === 'success' ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-200' :
                                    notifStatus === 'error' ? 'bg-red-900/30 border-red-500/50 text-red-200' :
                                    'bg-blue-900/30 border-blue-500/50 text-blue-200'
                                }`}
                            >
                                {notifStatus === 'sending' ? 'Broadcasting to all users...' : notifMessage}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button 
                        type="submit"
                        disabled={notifStatus === 'sending'}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={20} />
                        {notifStatus === 'sending' ? 'SENDING...' : 'BROADCAST NOTIFICATION'}
                    </button>
                </form>

                {/* ── SECTION 2: Manage Admins ── */}
                <div className="glass-panel rounded-3xl p-6 md:p-8">
                    <h2 className="text-xl font-bold text-purple-200 mb-6 flex items-center gap-2">
                        <Shield size={20} /> Manage Admins
                    </h2>

                    {/* Add new admin */}
                    <div className="flex gap-2 mb-6">
                        <input
                            type="email"
                            value={newAdminEmail}
                            onChange={e => setNewAdminEmail(e.target.value)}
                            className="flex-1 bg-black/40 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                            placeholder="Enter Gmail ID to add as admin..."
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddAdmin())}
                        />
                        <button
                            type="button"
                            onClick={handleAddAdmin}
                            disabled={adminStatus === 'adding'}
                            className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <UserPlus size={18} />
                            Add
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {adminStatus !== 'idle' && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`mb-6 p-3 rounded-xl border text-sm ${
                                    adminStatus === 'success' ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-200' :
                                    adminStatus === 'error' ? 'bg-red-900/30 border-red-500/50 text-red-200' :
                                    'bg-blue-900/30 border-blue-500/50 text-blue-200'
                                }`}
                            >
                                {adminStatus === 'adding' ? 'Adding admin...' : adminMessage}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Admin list */}
                    <div className="space-y-2">
                        {adminList.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-4">No admins found.</p>
                        ) : (
                            adminList.map(admin => (
                                <div key={admin.id} className="flex items-center justify-between bg-black/30 border border-purple-500/10 rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-300 text-sm font-bold">
                                            {admin.email[0].toUpperCase()}
                                        </div>
                                        <span className="text-sm text-white">
                                            {admin.email}
                                            {admin.email === 'anitadhakad333@gmail.com' && (
                                                <span className="ml-2 text-xs text-fuchsia-400 font-bold">FOUNDER</span>
                                            )}
                                        </span>
                                    </div>
                                    {admin.email !== 'anitadhakad333@gmail.com' && (
                                        <button
                                            onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2 rounded-lg transition-all"
                                            title="Remove admin"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
