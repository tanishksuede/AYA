import { useState, useRef, useEffect, useMemo } from 'react';
import { useUserStore } from '../../store/userStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { audioSynth } from '../../utils/audioSynth';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { saveSession } from '../../utils/session';
import { supabase } from '../../utils/supabase';

import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';

// Horizontal Drag Strip for Age
const AgeDial = ({ value, onChange }: { value: number; onChange: (val: number) => void }) => {
    const MIN = 13;
    const MAX = 25;
    const TICK_WIDTH = 40; 
    
    const dragRef = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);

    // Sync external value to visual position when not dragging
    useEffect(() => {
        const targetX = -(value - MIN) * TICK_WIDTH;
        animate(x, targetX, { type: "spring", stiffness: 300, damping: 30 });
    }, [value, x]);

    const handleDragEnd = () => {
        const currentX = x.get();
        let targetIndex = Math.round(-currentX / TICK_WIDTH);
        
        targetIndex = Math.max(0, Math.min(MAX - MIN, targetIndex));
        
        const newValue = MIN + targetIndex;
        onChange(newValue);
    };

    const handleNudge = (direction: -1 | 1) => {
        audioSynth.playClick();
        const newValue = Math.max(MIN, Math.min(MAX, value + direction));
        onChange(newValue);
    };

    const ticks = Array.from({ length: MAX - MIN + 1 }, (_, i) => MIN + i);

    return (
        <div className="relative w-full max-w-sm mx-auto flex flex-col items-center">
            
            {/* Header / Number Display */}
            <div className="flex items-center justify-between w-full mb-6">
                <button 
                    onClick={() => handleNudge(-1)} 
                    className="p-3 bg-[#191923]/80 rounded-2xl hover:bg-[#2b2b38] transition-colors text-[#acaab5] hover:text-[#00f1fe]"
                >
                    <ChevronLeft size={24} />
                </button>
                
                <div className="flex flex-col items-center relative">
                    <motion.div 
                        key={value}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00f1fe] to-[#99f7ff] tracking-tight drop-shadow-[0_0_15px_rgba(0,241,254,0.6)]"
                    >
                        {value}
                    </motion.div>
                    <span className="text-xs uppercase tracking-[0.3em] text-[#00f1fe] absolute -bottom-4 font-bold opacity-80">Years</span>
                </div>

                <button 
                    onClick={() => handleNudge(1)} 
                    className="p-3 bg-[#191923]/80 rounded-2xl hover:bg-[#2b2b38] transition-colors text-[#acaab5] hover:text-[#00f1fe]"
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Ruler Track */}
            <div className="relative w-full h-24 overflow-hidden mask-horizontal-fade mt-4 touch-none">
                {/* Center Indicator */}
                <div className="absolute top-0 left-1/2 -ml-[2px] w-1 h-full bg-[#00f1fe] shadow-[0_0_15px_#00f1fe] z-10 rounded-full" />
                
                <motion.div 
                    ref={dragRef}
                    drag="x"
                    dragConstraints={{ 
                        left: -((MAX - MIN) * TICK_WIDTH), 
                        right: 0 
                    }}
                    style={{ x }}
                    onDragEnd={handleDragEnd}
                    className="absolute top-0 left-1/2 -ml-[20px] flex items-end h-full cursor-grab active:cursor-grabbing"
                >
                    {ticks.map((tick) => (
                        <div 
                            key={tick} 
                            style={{ width: TICK_WIDTH }} 
                            className="flex flex-col items-center justify-end h-full pb-4 shrink-0"
                        >
                            <div className={`w-1 rounded-t-full transition-all duration-300 ${tick === value ? 'h-8 bg-[#00f1fe] shadow-[0_0_10px_#00f1fe]' : (tick % 5 === 0 ? 'h-6 bg-[#acaab5]' : 'h-4 bg-[#2b2b38]')}`} />
                            <span className={`text-[10px] mt-2 font-bold transition-colors ${tick === value ? 'text-[#00f1fe]' : 'text-[#76747f]'}`}>
                                {tick % 5 === 0 ? tick : ''}
                            </span>
                        </div>
                    ))}
                </motion.div>
            </div>
            
        </div>
    );
};

export function OnboardingWizard() {
    const setProfile = useUserStore((state) => state.setProfile);
    const navigate = useNavigate();
    const location = useLocation();
    
    const isRegisterMode = location.pathname === '/game/setup';

    const [name, setName] = useState("");
    const [age, setAge] = useState<number>(20);
    const [mobile, setMobile] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    
    // Google Auth State
    const [googleAuthId, setGoogleAuthId] = useState<string | null>(null);

    const isSubmitting = useRef(false);

    // Sync googleAuthId and name on register mode mount
    useEffect(() => {
        if (isRegisterMode) {
            const tempGoogleId = sessionStorage.getItem('aya_temp_google_id');
            const tempGoogleName = sessionStorage.getItem('aya_temp_google_name');
            const tempGoogleAge = sessionStorage.getItem('aya_temp_google_age');
            const tempGoogleMobile = sessionStorage.getItem('aya_temp_google_mobile');
            if (tempGoogleId) {
                setGoogleAuthId(tempGoogleId);
                setName(tempGoogleName || "");
                if (tempGoogleAge) setAge(Number(tempGoogleAge));
                if (tempGoogleMobile) setMobile(tempGoogleMobile);
            }
            setIsLoading(false);
        }
    }, [isRegisterMode]);

    // Handle Google OAuth check ONLY in welcome/login mode
    useEffect(() => {
        if (isRegisterMode) return;

        const checkGoogleAuth = async () => {
            try {
                // If OAuth returned an error in the hash, catch it!
                const hash = window.location.hash;
                if (hash && hash.includes('error=')) {
                    const params = new URLSearchParams(hash.substring(1));
                    const errorDesc = params.get('error_description') || 'Authentication failed.';
                    setError(`Google Auth Error: ${errorDesc.replace(/\+/g, ' ')}`);
                    window.history.replaceState(null, '', window.location.pathname);
                    setIsLoading(false);
                    return;
                }

                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    setError(`Session Error: ${sessionError.message}`);
                    setIsLoading(false);
                    return;
                }

                if (session && session.user) {
                    const googleId = session.user.id;
                    
                    // See if they already have an account linked to this google_id
                    const { data: existingUser, error: dbError } = await supabase
                        .from('users')
                        .select('*')
                        .eq('google_id', googleId)
                        .maybeSingle();

                    if (dbError) {
                        console.error("DB Error checking Google ID:", dbError);
                        if (dbError.code === '42703' || dbError.message?.includes('google_id')) {
                            setError("CRITICAL ERROR: 'google_id' column missing! Run in Supabase SQL: ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;");
                        } else {
                            setError(`Database error: ${dbError.message}`);
                        }
                        setIsLoading(false);
                        return;
                    }

                    if (existingUser) {
                        // EXISTING USER: Directly log them in!
                        await performLogin(existingUser, googleId, true);
                        return;
                    } else {
                        // NEW USER: Redirect to setup page
                        sessionStorage.setItem('aya_temp_google_id', googleId);
                        sessionStorage.setItem('aya_temp_google_name', session.user.user_metadata.full_name || "");
                        sessionStorage.setItem('aya_temp_existing_user', 'false');
                        navigate('/game/setup');
                        return;
                    }
                }
            } catch (err: any) {
                console.error("Fatal Google Auth Error:", err);
                setError(`Unexpected Error: ${err.message || 'Check console'}`);
            }
            setIsLoading(false);
        };
        
        checkGoogleAuth();
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            if (session && session.user) {
                setIsLoading(true);
                checkGoogleAuth();
            }
        });
        
        return () => subscription.unsubscribe();
    }, [isRegisterMode]);

    const performLogin = async (userData: any, gId: string | null, isExisting: boolean) => {
        let userId = userData.id;
        let existingProfile: any = null;

        // Fetch personality profile if it exists
        if (isExisting) {
            const { data: profileCheck } = await supabase
                .from('personality_profiles')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();
            existingProfile = profileCheck;
            
            // If they just linked a Google account, update the users table
            if (gId && !userData.google_id) {
                await supabase.from('users').update({ google_id: gId }).eq('id', userId);
                userData.google_id = gId;
            }
        } else {
            // New user - create personality profile
            const { error: profileError } = await supabase.from('personality_profiles').upsert({
                user_id: userId,
                mobile: userData.mobile,
                trait_risk_taker: 50,
                trait_creative: 50,
                trait_analytical: 50,
                trait_social: 50,
                trait_ambitious: 50,
                future_archetype: 'Explorer',
                total_xp: 0,
                level: 1,
                stories_completed: 0
            }, { onConflict: 'user_id' });
            if (profileError) console.warn('Supabase personality upsert failed', profileError);
        }

        // Persist session to localStorage + sessionStorage
        saveSession({ id: userId, mobile: userData.mobile, name: userData.name, age: userData.age });

        // Extract level_scores from userData if they exist
        const dbScores: Record<string, number> = {};
        if (userData.level_scores) {
            const parsed = typeof userData.level_scores === 'string' 
                ? (() => { try { return JSON.parse(userData.level_scores); } catch { return {}; } })()
                : userData.level_scores;
            Object.entries(parsed).forEach(([id, stars]) => {
                dbScores[id] = Math.max(dbScores[id] || 0, Number(stars) || 0);
            });
        }

        // Merge into store BEFORE setting profile so it's ready when Map loads
        useUserStore.setState((state) => ({
            levelScores: { ...state.levelScores, ...dbScores }
        }));

        // Generate a fresh profile or load existing
        setProfile({
            id: userId, 
            mobile: userData.mobile, 
            name: userData.name, 
            age: userData.age,
            access_type: userData.access_type || 'open',
            access_start_date: userData.access_start_date,
            preferred_map: userData.preferred_map || 'solar',
            interests: [], 
            roleModels: [],
            traits: existingProfile ? {
                discipline: existingProfile.trait_discipline || 50,
                resilience: existingProfile.trait_resilience || 50,
                risk: existingProfile.trait_risk_taker || 50,
                leadership: existingProfile.trait_ambitious || 50,
                creativity: existingProfile.trait_creative || 50,
                empathy: existingProfile.trait_social || 50,
                vision: existingProfile.trait_vision || 50
            } : { discipline: 50, resilience: 50, risk: 50, leadership: 50, creativity: 50, empathy: 50, vision: 50 },
            assessmentCompleted: !!existingProfile || (userData.total_xp > 0 || userData.stories_completed > 0 || userData.level > 1),
            total_xp: userData.total_xp || 0,
            level: userData.level || 1,
            stories_completed: userData.stories_completed || 0,
            current_streak: userData.current_streak || 0,
            longest_streak: userData.longest_streak || 0,
            last_active_date: userData.last_active_date || new Date().toISOString().split('T')[0],
            daily_challenge_completed: userData.daily_challenge_completed || false
        });
    };

    const handleComplete = async () => {
        if (!mobile.trim() || age < 13) return;
        if (isSubmitting.current) return; // hard block double-tap
        isSubmitting.current = true;

        audioSynth.playClick();
        setIsLoading(true);
        setError("");

        const cleanMobile = mobile.trim().replace(/\s+/g, '');

        // 20s escape hatch
        const fallback = setTimeout(() => {
            setIsLoading(false);
            isSubmitting.current = false;
            setError('Connection failed. Please check your internet and try again.');
        }, 20000);

        try {
            // Check if they are existing user logging in
            const isExistingGoogle = sessionStorage.getItem('aya_temp_existing_user') === 'true';
            if (isExistingGoogle) {
                const userDataRaw = sessionStorage.getItem('aya_temp_user_data');
                if (userDataRaw) {
                    try {
                        const userData = JSON.parse(userDataRaw);
                        const cleanMobile = mobile.trim().replace(/\s+/g, '');
                        // Update details if changed
                        if (userData.name !== name.trim() || userData.age !== age || userData.mobile !== cleanMobile) {
                            const { error: updateError } = await supabase
                                .from('users')
                                .update({
                                    name: name.trim(),
                                    age: age,
                                    mobile: cleanMobile
                                })
                                .eq('id', userData.id);
                            if (updateError) console.warn("Failed to update user details on login", updateError);
                            userData.name = name.trim();
                            userData.age = age;
                            userData.mobile = cleanMobile;
                        }
                        clearTimeout(fallback);
                        await performLogin(userData, googleAuthId, true);
                        
                        // Clean up
                        sessionStorage.removeItem('aya_temp_google_id');
                        sessionStorage.removeItem('aya_temp_google_name');
                        sessionStorage.removeItem('aya_temp_google_age');
                        sessionStorage.removeItem('aya_temp_google_mobile');
                        sessionStorage.removeItem('aya_temp_existing_user');
                        sessionStorage.removeItem('aya_temp_user_data');
                        return;
                    } catch (e: any) {
                        console.error("Failed to process existing Google user", e);
                    }
                }
            }

            // Check if user exists by mobile
            const { data: existingUser, error: searchError } = await supabase
                .from('users')
                .select('*')
                .eq('mobile', cleanMobile)
                .maybeSingle();

            if (searchError) throw searchError;

            if (existingUser) {
                clearTimeout(fallback);
                await performLogin(existingUser, googleAuthId, true);
            } else {
                if (!name.trim()) {
                    clearTimeout(fallback);
                    setIsLoading(false);
                    isSubmitting.current = false;
                    setError("Please enter your name to create a new account.");
                    return;
                }
                
                // Insert new user
                const insertPayload: any = {
                    mobile: cleanMobile,
                    name: name.trim(),
                    age: age,
                    access_type: 'open',
                    access_start_date: new Date().toISOString().split('T')[0],
                    preferred_theme: 'city_dark',
                    total_xp: 0,
                    level: 1,
                    stories_completed: 0
                };
                if (googleAuthId) insertPayload.google_id = googleAuthId;

                const { data: newUser, error: insertError } = await supabase
                    .from('users')
                    .insert(insertPayload)
                    .select()
                    .single();

                if (insertError) {
                    console.warn('[Register] Supabase insert failed (likely RLS). Falling back to local-only mode:', insertError);
                    clearTimeout(fallback);
                    const localUser = { ...insertPayload, id: crypto.randomUUID() };
                    await performLogin(localUser, googleAuthId, false);
                } else {
                    clearTimeout(fallback);
                    await performLogin(newUser, googleAuthId, false);
                }
            }
        } catch (err: any) {
            clearTimeout(fallback);
            setIsLoading(false);
            isSubmitting.current = false;
            setError(err.message || 'An error occurred during sign in.');
        }
    };

    const handleGoogleSignIn = async () => {
        audioSynth.playClick();
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/game/welcome'
            }
        });

        if (error) {
            console.error("OAuth Init Error:", error);
            setError(`Failed to launch Google Sign-In: ${error.message}. Ensure Google Auth is enabled in your Supabase Dashboard.`);
            setIsLoading(false);
        }
    };

    // Derived style classes
    const baseInputClasses = "w-full bg-black/40 border border-[#2b2b38] rounded-2xl px-6 py-4 text-white placeholder-[#76747f] font-medium outline-none transition-all duration-300";

    const cinematicBackground = useMemo(() => (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[#0f0f18] opacity-90 mix-blend-multiply" />
            <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-[#9333ea] opacity-20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow" />
            <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] bg-[#00f1fe] opacity-10 blur-[100px] rounded-full mix-blend-screen" />
            <div className="absolute -bottom-[10%] left-[20%] w-[80%] h-[50%] bg-[#ff00ff] opacity-10 blur-[150px] rounded-full mix-blend-screen" />
        </div>
    ), []);

    return (
        <div className="relative min-h-[100dvh] w-full bg-[#0a0a0f] flex flex-col justify-center px-4 md:px-8 py-12 overflow-hidden selection:bg-[#00f1fe] selection:text-black">
            
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{
                backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
                backgroundPosition: 'center center'
            }}>
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-transparent to-[#0a0a0f]" />
            </div>

            {/* Cinematic Background */}
            {cinematicBackground}

            <div className="relative z-10 mx-auto w-full" style={{ maxWidth: '450px' }}>
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#0f0f18] text-white drop-shadow-[0_0_20px_rgba(0,241,254,0.4)] text-center mb-10 leading-tight">
                        {isRegisterMode ? (googleAuthId ? "Link Your Account" : "Let's get to \n know you!") : "Welcome to AYA"}
                    </h2>
                    
                    {!isRegisterMode && (
                        <div className="flex flex-col gap-6 mt-10">
                            <motion.button
                                initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                disabled={isLoading}
                                onClick={handleGoogleSignIn}
                                className="w-full py-5 bg-white text-black font-black text-xl rounded-full shadow-lg flex items-center justify-center space-x-3 transition-all hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <span>INITIALIZING...</span>
                                ) : (
                                    <>
                                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-8 h-8" />
                                        <span>SIGN IN WITH GOOGLE</span>
                                    </>
                                )}
                            </motion.button>

                            {!isLoading && (
                                <>
                                    <div className="flex items-center gap-4 my-2 opacity-50">
                                        <div className="h-px bg-white flex-1" />
                                        <span className="text-white text-sm font-bold uppercase tracking-widest">OR</span>
                                        <div className="h-px bg-white flex-1" />
                                    </div>

                                    <motion.button
                                        initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                                        onClick={() => { audioSynth.playClick(); navigate('/game/setup'); }}
                                        className="w-full py-5 bg-transparent border-2 border-[#2b2b38] text-white font-bold text-lg rounded-full hover:bg-white/10 transition-all shadow-lg"
                                    >
                                        USE MOBILE NUMBER
                                    </motion.button>
                                </>
                            )}
                        </div>
                    )}

                    {isRegisterMode && (
                        <>
                            {googleAuthId && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                    className="mb-8 p-6 bg-emerald-900/40 text-emerald-100 rounded-3xl border border-emerald-500/50 backdrop-blur-md text-center shadow-xl relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
                                    <h3 className="font-black text-xl text-emerald-400 mb-2">Google Authenticated!</h3>
                                    <p className="text-sm font-medium">To restore your previous progress, enter your existing mobile number below. Otherwise, enter a new number to start a fresh journey.</p>
                                </motion.div>
                            )}

                            <div className="space-y-6">
                                <motion.div 
                                    initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                    className="bg-[#191923]/60 backdrop-blur-xl p-6 rounded-3xl border border-[#2b2b38] shadow-2xl relative"
                                >
                                    <label className="block text-sm font-bold text-[#f2effb] mb-3 uppercase tracking-wider">Identity</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={`${baseInputClasses} focus:ring-4 focus:ring-[#9333ea]/30 focus:border-[#9333ea] focus:shadow-[0_0_20px_rgba(147,51,234,0.3)]`}
                                        placeholder="Enter your full name"
                                        disabled={isLoading}
                                    />
                                </motion.div>

                                <motion.div 
                                    initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                                    className="bg-[#191923]/60 backdrop-blur-xl p-6 pt-8 rounded-3xl border border-[#2b2b38] shadow-2xl relative flex flex-col items-center"
                                >
                                    <AgeDial value={age} onChange={setAge} />
                                </motion.div>

                                <motion.div 
                                    initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                                    className="bg-[#191923]/60 backdrop-blur-xl p-6 rounded-3xl border border-[#2b2b38] shadow-2xl relative"
                                >
                                    <label className="block text-sm font-bold text-[#f2effb] mb-3 uppercase tracking-wider">Access Code (Mobile)</label>
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        autoComplete="tel"
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value)}
                                        className={`${baseInputClasses} focus:ring-4 focus:ring-[#00f1fe]/30 focus:border-[#00f1fe] focus:shadow-[0_0_20px_rgba(0,241,254,0.3)]`}
                                        placeholder="E.g. 9876543210"
                                        disabled={isLoading}
                                    />
                                </motion.div>
                            </div>

                            <AnimatePresence>
                                {error && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 p-4 bg-red-900/40 text-red-100 rounded-xl border border-red-500/50 backdrop-blur-md text-center font-bold"
                                    >
                                        <p>{error}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex flex-col gap-4 mt-10">
                                <motion.button
                                    initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                                    disabled={!mobile.trim() || isLoading}
                                    onClick={handleComplete}
                                    className="w-full py-5 bg-[#00f1fe] text-[#004145] font-black text-xl rounded-full shadow-[0_0_30px_rgba(0,241,254,0.4)] flex items-center justify-center space-x-2 relative group overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#99f7ff] transition-all"
                                >
                                    <motion.div 
                                        className="absolute inset-0 bg-white"
                                        animate={{ opacity: [0, 0.4, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    <span className="relative z-10">{isLoading ? 'INITIALIZING...' : (sessionStorage.getItem('aya_temp_existing_user') === 'true' ? 'CONFIRM & ENTER GAME' : (googleAuthId ? 'LINK ACCOUNT' : 'START MY JOURNEY'))}</span>
                                    {!isLoading && <Check size={28} className="relative z-10 stroke-[4]" />}
                                </motion.button>
                                
                                <motion.button
                                    initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
                                    disabled={isLoading}
                                    onClick={() => { 
                                        audioSynth.playClick(); 
                                        sessionStorage.removeItem('aya_temp_google_id');
                                        sessionStorage.removeItem('aya_temp_google_name');
                                        sessionStorage.removeItem('aya_temp_google_age');
                                        sessionStorage.removeItem('aya_temp_google_mobile');
                                        sessionStorage.removeItem('aya_temp_existing_user');
                                        sessionStorage.removeItem('aya_temp_user_data');
                                        navigate('/game/welcome'); 
                                    }}
                                    className="w-full py-4 bg-transparent text-white/70 font-bold text-sm rounded-full transition-all hover:text-white mt-2"
                                >
                                    BACK
                                </motion.button>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
