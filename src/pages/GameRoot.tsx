import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { getSession, clearSession, markQuizDone, isQuizDone } from '../utils/session';
import { withTimeout } from '../utils/withTimeout';
import { useUserStore } from '../store/userStore';
import { safeStorage } from '../utils/storage';

export function GameRoot() {
    const profile = useUserStore((state) => state.profile);
    const syncLevels = useUserStore((state) => state.syncLevels);
    const mapTheme = useUserStore((state) => state.mapTheme);
    const setMapTheme = useUserStore((state) => state.setMapTheme);
    const pendingStreakData = useUserStore((state) => state.pendingStreakData);
    const location = useLocation();
    const navigate = useNavigate();

    // Sync theme from localStorage on mount; reset 'solar' → 'city_dark'
    useEffect(() => {
        const raw = safeStorage.get('aya_map_theme') as any;
        const storedTheme = (!raw || raw === 'solar') ? 'city_dark' : raw;
        if (storedTheme !== mapTheme) {
            setMapTheme(storedTheme);
        }
    }, []);

    useEffect(() => {
        syncLevels();
    }, [syncLevels]);

    const [sessionStatus, setSessionStatus] = useState<'checking' | 'found' | 'not_found'>('checking');
    const [connectionError, setConnectionError] = useState<string | null>(null);

    useEffect(() => {
        if (sessionStatus === 'found') {
            // we could store the last path, but simple last view is fine
            if (location.pathname === '/game' || location.pathname === '/game/dna') {
                localStorage.setItem('aya_last_view', location.pathname);
            }
        }
    }, [location.pathname, sessionStatus]);

    useEffect(() => {
        const restoreSession = async () => {
            console.log('[Session] Checking for existing session...')

            const maxWait = setTimeout(() => {
                setSessionStatus(prev => prev === 'checking' ? 'not_found' : prev);
            }, 20000);

            try {
                const session = getSession();
                if (!session.userId || !session.mobile) {
                    clearTimeout(maxWait);
                    setSessionStatus('not_found');
                    return;
                }

                let user: any = null;
                const store = useUserStore.getState();
                const isJeeNeet = store.profile?.access_type === 'jee15' || store.profile?.access_type === 'neet15';

                if (isJeeNeet) {
                    let attempt = 0;
                    while (attempt < 3 && !user) {
                        attempt++;
                        try {
                            const { data, error } = await withTimeout(
                                supabase.from('users').select('*').eq('id', session.userId).maybeSingle()
                            );
                            if (error) throw error;
                            user = data;
                        } catch (e) {
                            if (attempt < 3) {
                                await new Promise(r => setTimeout(r, 5000));
                            } else {
                                clearTimeout(maxWait);
                                setConnectionError("Having trouble connecting. Please check your internet and try again.");
                                return;
                            }
                        }
                    }
                } else {
                    try {
                        const { data, error } = await withTimeout(
                            supabase.from('users').select('*').eq('id', session.userId).maybeSingle()
                        );
                        if (error) throw error;
                        user = data;
                    } catch (dbErr) {
                        if (!store.profile) {
                            store.setProfile({
                                id: session.userId,
                                name: session.name || 'Player',
                                age: session.age || 18,
                                mobile: session.mobile,
                                total_xp: 0, level: 1,
                                current_streak: 0, longest_streak: 0,
                                stories_completed: 0,
                                daily_challenge_completed: false,
                                preferred_theme: 'city_dark',
                                access_type: 'free',
                                access_start_date: null,
                                preferred_map: null,
                                assessmentCompleted: isQuizDone(),
                            } as any);
                            if (isQuizDone()) {
                                store.completeAssessment(
                                    { discipline: 50, resilience: 50, risk: 50, leadership: 50, creativity: 50, empathy: 50, vision: 50 },
                                    { motivation: 'Stability', risk: 'Balanced', emotional: 'Resilient', social: 'Supporter', passion: 'Creative', coreValue: 'Success' }
                                );
                            }
                        }
                        clearTimeout(maxWait);
                        setSessionStatus('found');
                        return;
                    }
                }

                if (!user) {
                    clearSession();
                    clearTimeout(maxWait);
                    setSessionStatus('not_found');
                    return;
                }

                let profileData: any = null;
                try {
                    const { data } = await withTimeout(
                        supabase.from('personality_profiles').select('*').eq('user_id', session.userId).maybeSingle()
                    );
                    profileData = data;
                } catch { }

                let quizCompleted = isQuizDone() || !!profileData;
                if (!quizCompleted) {
                    try {
                        const { data: qr } = await withTimeout(
                            supabase.from('quiz_responses').select('id').eq('user_id', session.userId).limit(1)
                        );
                        quizCompleted = !!(qr && qr.length > 0);
                        if (quizCompleted) markQuizDone();
                    } catch { }
                }

                store.setProfile({
                    id: user.id,
                    name: user.name,
                    age: user.age,
                    mobile: user.mobile,
                    total_xp: user.total_xp || 0,
                    level: user.level || 1,
                    current_streak: user.current_streak || 0,
                    longest_streak: user.longest_streak || 0,
                    stories_completed: user.stories_completed || 0,
                    daily_challenge_completed: user.daily_challenge_completed || false,
                    preferred_theme: user.preferred_theme || 'city_dark',
                    access_type: user.access_type,
                    access_start_date: user.access_start_date,
                    preferred_map: user.preferred_map,
                    ...(profileData ? {
                        trait_risk_taker: profileData.trait_risk_taker,
                        trait_creative: profileData.trait_creative,
                        trait_analytical: profileData.trait_analytical,
                        trait_social: profileData.trait_social,
                        trait_ambitious: profileData.trait_ambitious,
                        future_archetype: profileData.future_archetype,
                        interest_goal: profileData.interest_goal,
                        interest_struggle: profileData.interest_struggle,
                        interest_domain: profileData.interest_domain,
                    } : {})
                } as any);

                if (quizCompleted && profileData) {
                    store.completeAssessment(
                        {
                            discipline: 50, resilience: 50,
                            risk: profileData.trait_risk_taker || 50,
                            leadership: profileData.trait_ambitious || 50,
                            creativity: profileData.trait_creative || 50,
                            empathy: profileData.trait_social || 50, vision: 50
                        },
                        {
                            motivation: 'Stability', risk: 'Balanced', emotional: 'Resilient',
                            social: 'Supporter', passion: 'Creative', coreValue: 'Success'
                        }
                    );
                } else if (quizCompleted && !profileData) {
                    store.completeAssessment(
                        { discipline: 50, resilience: 50, risk: 50, leadership: 50, creativity: 50, empathy: 50, vision: 50 },
                        { motivation: 'Stability', risk: 'Balanced', emotional: 'Resilient', social: 'Supporter', passion: 'Creative', coreValue: 'Success' }
                    );
                }

                const savedTheme = user.preferred_theme || 'city_dark';
                store.setMapTheme(savedTheme as any);

                clearTimeout(maxWait);
                setSessionStatus('found');

            } catch (err) {
                clearTimeout(maxWait);
                setSessionStatus('not_found');
            }
        };

        restoreSession();
    }, [])

    const prevLevelRef = useRef(profile?.level || 1);
    const onboardingComplete = localStorage.getItem('onboarding_done') === 'true';

    useEffect(() => {
        if (profile?.level && profile.level > prevLevelRef.current) {
            navigate('/game/level-up');
            prevLevelRef.current = profile.level;
        }
    }, [profile?.level, navigate]);

    useEffect(() => {
        if (pendingStreakData) {
            navigate('/game/streak');
        }
    }, [pendingStreakData, navigate]);

    if (sessionStatus === 'checking') {
        return (
            <div className="w-full h-screen bg-[#0d0d16] flex flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-cyan-400 text-lg font-bold tracking-widest animate-pulse">
                    LOADING YOUR UNIVERSE...
                </p>
                {connectionError && (
                    <div className="mt-4 p-4 bg-red-900/40 border border-red-500/50 rounded-xl text-red-200 text-sm max-w-sm animate-fade-in">
                        {connectionError}
                    </div>
                )}
            </div>
        )
    }

    if (!profile && location.pathname !== '/game/welcome') {
        return <Navigate to="/game/welcome" replace />;
    }

    if (profile && !profile.assessmentCompleted && !onboardingComplete && !location.pathname.startsWith('/game/onboarding')) {
        return <Navigate to="/game/onboarding/1" replace />;
    }

    if (profile && !profile.assessmentCompleted && onboardingComplete && !location.pathname.startsWith('/game/assessment')) {
        return <Navigate to="/game/assessment/1" replace />;
    }

    return (
        <div className="w-full h-screen bg-slate-950 overflow-hidden relative">
            <Outlet />
        </div>
    );
}
