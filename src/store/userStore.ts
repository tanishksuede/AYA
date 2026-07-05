import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, Level, Lesson, PersonalityTraits, PsychologicalProfile } from '../types/gameTypes';
import { calculateLevelInfo } from '../utils/levelSystem';
import { safeStorage } from '../utils/storage';
import { supabase } from '../utils/supabase';

export type MapTheme = 'city_dark' | 'solar' | 'light';

interface UserState {
    profile: UserProfile | null;
    completedOnboarding: boolean;
    levels: Level[]; // Dynamic levels
    levelScores: Record<string, number>;
    xp: number; // Global Wisdom XP

    setProfile: (profile: UserProfile) => void;
    unlockLevel: (levelId: string) => void;
    completeLevel: (levelId: string, stars: number) => void;
    
    // New Gamified XP Setup
    addXp: (amount: number) => void;
    addSessionProgression: (sessionXp: number) => void;
    updateXpLocally: (amount: number) => void;
    
    syncLevels: () => Promise<void>;

    // Daily Challenge & Streak Actions
    checkStreak: () => void;
    completeDailyChallenge: () => { xpEarned: number, oldStreak: number, newStreak: number, isMilestone: boolean };

    // Personality System Actions
    updateTraits: (modifiers: Partial<PersonalityTraits>) => void;
    completeAssessment: (initialTraits: PersonalityTraits, profile: PsychologicalProfile) => void;

    // ── Theme State (3-way) ──────────────────────────────────────────────────
    mapTheme: MapTheme;
    setMapTheme: (theme: MapTheme) => void;
    cycleMapTheme: () => void;
    /** @deprecated use mapTheme === 'light' */
    isCandyMode: boolean;
    /** @deprecated use cycleMapTheme */
    toggleCandyMode: () => void;

    // Audio State
    musicVolume: number; // 0 to 1
    sfxVolume: number;   // 0 to 1
    isMusicMuted: boolean;
    isSfxMuted: boolean;
    isNarrationMuted: boolean;

    setMusicVolume: (vol: number) => void;
    setSfxVolume: (vol: number) => void;
    toggleMusicMute: () => void;
    toggleSfxMute: () => void;
    toggleNarrationMute: () => void;

    // Lesson Journal State
    collectedLessons: Lesson[];
    collectLesson: (lesson: Lesson) => void;

    // Cinematic Intro State
    isIntroVideoCompleted: boolean;
    setIntroVideoCompleted: (val: boolean) => void;

    // Interaction State
    hasInteracted: boolean;
    setHasInteracted: (val: boolean) => void;

    // Solar Load Tracking
    hasSolarLoadedThisSession: boolean;
    setSolarLoadedThisSession: (val: boolean) => void;

    // Cross-route communication state
    activeLevel: string | null;
    setActiveLevel: (levelId: string | null) => void;
    pendingStreakData: { xpEarned: number, oldStreak: number, newStreak: number, isMilestone: boolean } | null;
    setPendingStreakData: (data: { xpEarned: number, oldStreak: number, newStreak: number, isMilestone: boolean } | null) => void;

    resetProgress: () => void;
}
const syncStoreToBackend = async (profile: any, currentLevelScores: Record<string, number>) => {
    if (!profile || !profile.id || profile.id.startsWith('offline-')) return;
    try {
        const { error: userError } = await supabase.from('users').update({
            total_xp: profile.total_xp,
            level: profile.level,
            stories_completed: profile.stories_completed,
            current_streak: profile.current_streak,
            longest_streak: profile.longest_streak,
            last_active_date: profile.last_active_date,
            daily_challenge_completed: profile.daily_challenge_completed,
            level_scores: currentLevelScores,
        }).eq('id', profile.id);

        if (userError) {
            console.error('[Store] Supabase users update error:', userError);
            // Fallback: Try updating without level_scores in case the column hasn't been created yet
            const { error: fallbackError } = await supabase.from('users').update({
                total_xp: profile.total_xp,
                level: profile.level,
                stories_completed: profile.stories_completed,
                current_streak: profile.current_streak,
                longest_streak: profile.longest_streak,
                last_active_date: profile.last_active_date,
                daily_challenge_completed: profile.daily_challenge_completed,
            }).eq('id', profile.id);
            if (fallbackError) {
                 console.error('[Store] Fallback users update also failed:', fallbackError);
            } else {
                 console.log('[Store] ✓ Successfully saved profile to backend (fallback, without level_scores)');
            }
        } else {
            console.log('[Store] ✓ Successfully saved profile to backend');
        }

        if (profile.traits) {
            const { error: traitError } = await supabase.from('personality_profiles').update({
                total_xp: profile.total_xp,
                level: profile.level,
                stories_completed: profile.stories_completed,
                trait_risk_taker: profile.traits.risk,
                trait_creative: profile.traits.creativity,
                trait_analytical: profile.traits.analytical,
                trait_social: profile.traits.empathy,
                trait_ambitious: profile.traits.leadership
            }).eq('user_id', profile.id);

            if (traitError) {
                console.error('[Store] Supabase traits update error:', traitError);
            }
        }
    } catch (err) {
        console.error('[Store] Failed to sync to backend', err);
    }
};

export const useUserStore = create<UserState>()(
    persist(
        (set, get) => ({
            profile: null,
            completedOnboarding: false,
            levels: [], // Start empty
            levelScores: {},
            xp: 0, // Legacy fallback. New stats live on profile

            addXp: (amount) => set((state) => ({ xp: state.xp + amount })),

            addSessionProgression: (sessionXp) => {
                set((state) => {
                    if (!state.profile) return state;

                    const currentXp = state.profile.total_xp || 0;
                    const newXp = currentXp + sessionXp;
                    const levelInfo = calculateLevelInfo(newXp);
                    const currentStories = state.profile.stories_completed || 0;

                    return {
                        profile: {
                            ...state.profile,
                            total_xp: newXp,
                            level: levelInfo.level,
                            stories_completed: currentStories + 1
                        }
                    };
                });
                const { profile, levelScores } = get();
                if (profile) syncStoreToBackend(profile, levelScores);
            },

            updateXpLocally: (amount) => {
                set((state) => {
                    if (!state.profile) return state;
                    const newXp = (state.profile.total_xp || 0) + amount;
                    const levelInfo = calculateLevelInfo(newXp);
                    return {
                        profile: {
                            ...state.profile,
                            total_xp: newXp,
                            level: levelInfo.level
                        }
                    };
                });
                const { profile, levelScores } = get();
                if (profile) syncStoreToBackend(profile, levelScores);
            },

            // ── Theme (2-way: city_dark | light) ─────────────────────────────
            // 'solar' is preserved in the type but hidden from UI until re-enabled.
            // On app load, any stored 'solar' value is silently reset to 'city_dark'.
            mapTheme: (() => {
                const stored = safeStorage.get('aya_map_theme') as MapTheme | null;
                if (!stored || stored === 'solar') {
                    safeStorage.set('aya_map_theme', 'city_dark');
                    return 'city_dark';
                }
                return stored;
            })(),
            setMapTheme: (theme) => {
                // Guard: if someone tries to set solar programmatically, silently redirect to city_dark
                const safeTheme: MapTheme = theme === 'solar' ? 'city_dark' : theme;
                safeStorage.set('aya_map_theme', safeTheme);
                set({ mapTheme: safeTheme });
            },
            cycleMapTheme: () => set((state) => {
                const order: MapTheme[] = ['city_dark', 'light']; // solar removed from cycle
                const safeCurrentIndex = order.indexOf(state.mapTheme) === -1 ? 0 : order.indexOf(state.mapTheme);
                const next = order[(safeCurrentIndex + 1) % order.length];
                safeStorage.set('aya_map_theme', next);
                return { mapTheme: next };
            }),
            // Deprecated shims — kept for backward compatibility
            get isCandyMode(): boolean { return ((get() || {}).mapTheme === 'light'); },
            toggleCandyMode: () => set((state) => {
                const order: MapTheme[] = ['city_dark', 'light']; // solar removed
                const safeCurrentIndex = order.indexOf(state.mapTheme) === -1 ? 0 : order.indexOf(state.mapTheme);
                const next = order[(safeCurrentIndex + 1) % order.length];
                safeStorage.set('aya_map_theme', next);
                return { mapTheme: next };
            }),

            // Audio Defaults
            musicVolume: 0.5,
            sfxVolume: 0.5,
            isMusicMuted: false,
            isSfxMuted: false,
            isNarrationMuted: false,

            setMusicVolume: (vol) => set({ musicVolume: vol }),
            setSfxVolume: (vol) => set({ sfxVolume: vol }),
            toggleMusicMute: () => set((state) => ({ isMusicMuted: !state.isMusicMuted })),
            toggleSfxMute: () => set((state) => ({ isSfxMuted: !state.isSfxMuted })),
            toggleNarrationMute: () => set((state) => ({ isNarrationMuted: !state.isNarrationMuted })),

            collectedLessons: [],
            collectLesson: (lesson) => set((state) => {
                // Prevent duplicates
                if (state.collectedLessons.some(l => l.id === lesson.id)) return state;
                return { collectedLessons: [...state.collectedLessons, lesson] };
            }),

            isIntroVideoCompleted: false,
            setIntroVideoCompleted: (val) => set({ isIntroVideoCompleted: val }),

            hasInteracted: false,
            setHasInteracted: (val) => set({ hasInteracted: val }),

            hasSolarLoadedThisSession: false,
            setSolarLoadedThisSession: (val) => set({ hasSolarLoadedThisSession: val }),

            activeLevel: null,
            setActiveLevel: (levelId) => set({ activeLevel: levelId }),
            
            pendingStreakData: null,
            setPendingStreakData: (data) => set({ pendingStreakData: data }),

            setProfile: (profile) => {
                console.log('[Store] Setting profile:', profile);
                set({ profile: { ...get().profile, ...profile } as UserProfile, completedOnboarding: true });
                // If it's a completely new profile and we have an ID, do a backend sync
                // The caller (e.g. restoreSession in GameRoot) must call it explicitly
                // so scores can be applied AFTER levels are loaded.
            },

            syncLevels: async () => {
                const { data, error } = await supabase.from('levels').select('*');
                if (error || !data || data.length === 0) {
                    console.warn('[Store] Failed to fetch levels from Supabase or table empty. Using local fallback.');
                    const store = get();
                    if (store.profile) {
                        try {
                            const { generateLevels } = await import('../utils/levelGenerator');
                            const fallbackLevels = generateLevels(store.profile!.age);
                            set({ levels: fallbackLevels });
                            console.log('[Store] Fallback levels generated:', fallbackLevels.length);
                        } catch (err) {
                            console.error("Failed to load local fallback levels", err);
                        }
                    }
                    return;
                }

                const latestMasterLevels: Level[] = data.map((row: any) => ({
                    id: row.id,
                    day_number: row.day_number,
                    title: row.title,
                    description: row.description,
                    personality: row.personality,
                    requiredStars: row.required_stars,
                    year: row.year,
                    age: row.age,
                    theme: row.theme,
                    archetype: row.archetype,
                    bio: row.bio,
                    fame: row.fame,
                    achievements: row.achievements,
                    lesson: row.lesson,
                    avatarUrl: row.avatar_url,
                    scenarioId: row.scenario_id,
                    idolTraits: row.idol_traits,
                    status: row.status,
                    isLocked: row.is_locked,
                    stars: row.stars,
                    part1: row.part1,
                    part2: row.part2,
                    placeholder: row.placeholder
                }));

                set((state) => {
                    // Re-read levelScores from current state (avoids stale closure from async gap)
                    const currentScores = state.levelScores;
                    const mergedLevels = latestMasterLevels.map(latestLevel => {
                        const cachedLevel = (state.levels || []).find(l => String(l.id) === String(latestLevel.id));
                        const score = currentScores[latestLevel.id];
                        
                        let computedStatus = latestLevel.status;
                        if (score !== undefined && score > 0) {
                            computedStatus = 'completed';
                        } else if (cachedLevel && cachedLevel.status) {
                            computedStatus = cachedLevel.status;
                        }

                        return {
                            ...latestLevel,
                            status: computedStatus,
                            isLocked: cachedLevel?.isLocked !== undefined ? cachedLevel.isLocked : latestLevel.isLocked,
                            stars: score !== undefined ? score : (cachedLevel?.stars !== undefined ? cachedLevel.stars : latestLevel.stars)
                        };
                    });

                    return { levels: mergedLevels };
                });
            },

            // Daily Challenge & Streak Logic
            checkStreak: () => {
                set((state) => {
                    if (!state.profile) return state;

                    const now = new Date();
                    let lastActiveStr = state.profile.last_active_date;
                    let current = state.profile.current_streak || 0;
                    let completedToday = state.profile.daily_challenge_completed || false;
                    
                    if (lastActiveStr) {
                        const lastActive = new Date(lastActiveStr);
                        lastActive.setHours(0,0,0,0);
                        
                        const today = new Date(now);
                        today.setHours(0,0,0,0);
                        
                        const diffTime = Math.abs(today.getTime() - lastActive.getTime());
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays === 0) {
                            // Same day, no change to streak length, just maintain flags
                        } else if (diffDays === 1) {
                            // Active yesterday, reset daily challenge flag
                            completedToday = false;
                        } else if (diffDays > 1) {
                            // Missed a day or more, streak broken!
                            current = 0;
                            completedToday = false;
                        }
                    } else {
                        completedToday = false;
                    }

                    return {
                        profile: {
                            ...state.profile,
                            current_streak: current,
                            daily_challenge_completed: completedToday
                        }
                    };
                });
                const { profile, levelScores } = get();
                if (profile) syncStoreToBackend(profile, levelScores);
            },

            completeDailyChallenge: () => {
                let result = { xpEarned: 0, oldStreak: 0, newStreak: 0, isMilestone: false };
                
                set((state) => {
                    if (!state.profile || state.profile.daily_challenge_completed) return state;

                    const currentStreak = state.profile.current_streak || 0;
                    const newStreak = currentStreak + 1;
                    const longestStreak = Math.max(state.profile.longest_streak || 0, newStreak);
                    const todayStr = new Date().toISOString().split('T')[0];

                    let bonusXp = 0;
                    let milestone = false;

                    // Standard daily completion gets standard session XP usually, but let's give default 10 XP for daily
                    let baseDailyXp = 20;

                    // Award Streak Bonus XP
                    if (newStreak === 3) { bonusXp = 30; milestone = true; }
                    else if (newStreak === 7) { bonusXp = 100; milestone = true; }
                    else if (newStreak === 30) { bonusXp = 500; milestone = true; }
                    else if (newStreak > 30 && newStreak % 10 === 0) { bonusXp = 100; } // Recurring bonus

                    const totalAward = baseDailyXp + bonusXp;

                    result = {
                        xpEarned: totalAward,
                        oldStreak: currentStreak,
                        newStreak: newStreak,
                        isMilestone: milestone
                    };

                    const newTotalXp = (state.profile.total_xp || 0) + totalAward;
                    const levelInfo = calculateLevelInfo(newTotalXp);

                    return {
                        profile: {
                            ...state.profile,
                            current_streak: newStreak,
                            longest_streak: longestStreak,
                            last_active_date: todayStr,
                            daily_challenge_completed: true,
                            total_xp: newTotalXp,
                            level: levelInfo.level
                        }
                    };
                });
                const { profile, levelScores } = get();
                if (profile) syncStoreToBackend(profile, levelScores);
                return result;
            },

            // Personality Actions
            updateTraits: (modifiers) => {
                set((state) => {
                    if (!state.profile) return state;

                    const currentTraits = state.profile.traits;
                    const newTraits = { ...currentTraits };

                    // Update and Clamp values 0-100
                    (Object.keys(modifiers) as Array<keyof PersonalityTraits>).forEach((key) => {
                        const change = modifiers[key] || 0;
                        newTraits[key] = Math.max(0, Math.min(100, (newTraits[key] || 50) + change));
                    });

                    return {
                        profile: {
                            ...state.profile,
                            traits: newTraits
                        }
                    };
                });
                const { profile, levelScores } = get();
                if (profile) syncStoreToBackend(profile, levelScores);
            },

            completeAssessment: (initialTraits, profileData) => {
                set((state) => {
                    if (!state.profile) return state;
                    return {
                        profile: {
                            ...state.profile,
                            traits: initialTraits,
                            psychologicalProfile: profileData,
                            assessmentCompleted: true
                        }
                    };
                });
                const { profile, levelScores } = get();
                if (profile) syncStoreToBackend(profile, levelScores);
            },

            // The original `unlockedLevels` state and its usage in `unlockLevel` were removed
            // as per the instruction's updated UserState interface and initial state.
            // If level unlocking logic is still needed, it should be re-evaluated
            // in the context of the new `levels` array.
            unlockLevel: (levelId) => set((state) => ({
                levels: state.levels.map(l =>
                    l.id === levelId ? { ...l, status: 'unlocked' } : l
                )
            })),

            completeLevel: (levelId, stars) => {
                set((state) => ({
                    levelScores: { ...state.levelScores, [levelId]: Math.max(state.levelScores[levelId] || 0, stars) },
                    levels: state.levels.map(l => String(l.id) === String(levelId) ? { ...l, status: 'completed', stars: Math.max(l.stars || 0, stars) } : l)
                }));
                const { profile, levelScores } = get();
                if (profile) syncStoreToBackend(profile, levelScores);
            },

            resetProgress: () => set({
                profile: null,
                completedOnboarding: false,
                levels: [],
                levelScores: {},
                collectedLessons: []
                // We keep 'isCandyMode' and audio settings as user preference
            })
        }),
        {
            name: 'aya-user-store', // renamed for consistency with boot logs
            partialize: (state) => ({
                profile: state.profile,
                completedOnboarding: state.completedOnboarding,
                levels: state.levels,
                levelScores: state.levelScores,
                mapTheme: state.mapTheme,
                musicVolume: state.musicVolume,
                sfxVolume: state.sfxVolume,
                isMusicMuted: state.isMusicMuted,
                isSfxMuted: state.isSfxMuted,
                collectedLessons: state.collectedLessons
            }),
            onRehydrateStorage: () => {
                console.log('[Store] Hydration starting...');
                return (rehydratedState, error) => {
                    if (error) {
                        console.error('[Store] Hydration failed:', error);
                    } else {
                        console.log('[Store] Hydration complete. Profile:', rehydratedState?.profile?.name || 'none');
                    }
                };
            },
            storage: {
                getItem: (name) => {
                    try {
                        return JSON.parse(
                            localStorage.getItem(name) || 
                            sessionStorage.getItem(name) || 
                            'null'
                        );
                    } catch { return null; }
                },
                setItem: (name, value) => {
                    try {
                        localStorage.setItem(name, JSON.stringify(value));
                        sessionStorage.setItem(name, JSON.stringify(value));
                    } catch (e) {
                        try {
                            sessionStorage.setItem(name, JSON.stringify(value));
                        } catch {}
                    }
                },
                removeItem: (name) => {
                    try { localStorage.removeItem(name); } catch {}
                    try { sessionStorage.removeItem(name); } catch {}
                }
            }
        }
    ));
