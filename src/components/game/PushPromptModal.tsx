import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { subscribeUserToPush } from '../../utils/pushNotifications';
import { audioSynth } from '../../utils/audioSynth';
import { motion, AnimatePresence } from 'framer-motion';

export function PushPromptModal() {
    const [show, setShow] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    useEffect(() => {
        // Only show if the browser supports notifications and we haven't asked yet
        if ('Notification' in window && Notification.permission === 'default') {
            // Slight delay so it doesn't jump scare them instantly on load
            const timer = setTimeout(() => setShow(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleEnable = async () => {
        audioSynth.playClick();
        setStatus('loading');
        try {
            const sub = await subscribeUserToPush();
            if (sub) {
                setStatus('success');
                setTimeout(() => setShow(false), 2000);
            } else {
                setStatus('error');
                // If they blocked it or it failed, hide after a bit
                setTimeout(() => setShow(false), 3000);
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
            setTimeout(() => setShow(false), 3000);
        }
    };

    const handleClose = () => {
        audioSynth.playClick();
        setShow(false);
    };

    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-500/20 to-transparent pointer-events-none" />
                        
                        <button 
                            onClick={handleClose}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center text-center relative z-10 mt-4">
                            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 border border-purple-400/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                <Bell className="text-purple-300" size={32} />
                            </div>
                            
                            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Stay in the Loop</h2>
                            <p className="text-slate-300 text-sm mb-8 leading-relaxed">
                                Turn on notifications to get daily challenges, story updates, and streak reminders!
                            </p>

                            <button
                                onClick={handleEnable}
                                disabled={status !== 'idle'}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] disabled:opacity-50"
                            >
                                {status === 'idle' && 'ENABLE NOTIFICATIONS'}
                                {status === 'loading' && 'WAITING...'}
                                {status === 'success' && 'ENABLED! 🚀'}
                                {status === 'error' && 'FAILED ❌'}
                            </button>
                            
                            <button
                                onClick={handleClose}
                                className="mt-4 text-slate-400 text-xs font-bold uppercase tracking-wider hover:text-white transition-colors"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
