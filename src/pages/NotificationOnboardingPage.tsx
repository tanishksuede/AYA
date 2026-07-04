import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { subscribeUserToPush } from '../utils/pushNotifications';
import { audioSynth } from '../utils/audioSynth';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export function NotificationOnboardingPage() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const navigate = useNavigate();

    useEffect(() => {
        // If already prompted or unsupported, skip directly
        if (!('Notification' in window)) {
            navigate('/game', { replace: true });
        }
    }, [navigate]);

    const finish = () => {
        localStorage.setItem('aya_push_prompted', 'true');
        navigate('/game', { replace: true });
    };

    const handleEnable = async () => {
        audioSynth.playClick();
        setStatus('loading');
        try {
            const sub = await subscribeUserToPush();
            if (sub) {
                setStatus('success');
                setTimeout(finish, 1500);
            } else {
                setStatus('error');
                setTimeout(finish, 1500);
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
            setTimeout(finish, 1500);
        }
    };

    const handleSkip = () => {
        audioSynth.playClick();
        finish();
    };

    return (
        <div className="min-h-screen bg-[#0a0510] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-900/20 via-transparent to-fuchsia-900/10 pointer-events-none" />
            <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[100px] pointer-events-none" />

            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="max-w-md w-full relative z-10 flex flex-col items-center text-center"
            >
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
                    className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/10 flex items-center justify-center mb-8 border border-purple-400/30 shadow-[0_0_30px_rgba(168,85,247,0.3)] backdrop-blur-md"
                >
                    <Bell className="text-purple-300 w-12 h-12 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                </motion.div>

                <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-slate-400 mb-6 tracking-tight">
                    Stay Connected
                </h1>
                
                <p className="text-lg text-slate-300 mb-12 leading-relaxed">
                    Turn on notifications to get daily challenges, story updates, and streak reminders directly to your device!
                </p>

                <div className="w-full space-y-4">
                    <button
                        onClick={handleEnable}
                        disabled={status !== 'idle'}
                        className="w-full py-5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-lg font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <span className="relative z-10">
                            {status === 'idle' && 'ENABLE NOTIFICATIONS'}
                            {status === 'loading' && 'WAITING FOR BROWSER...'}
                            {status === 'success' && 'ENABLED! 🚀'}
                            {status === 'error' && 'FAILED ❌'}
                        </span>
                    </button>

                    <button
                        onClick={handleSkip}
                        className="w-full py-4 text-slate-400 font-bold uppercase tracking-widest hover:text-white transition-colors"
                    >
                        Maybe Later
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
