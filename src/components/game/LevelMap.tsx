import { useUserStore } from '../../store/userStore';
import { Lock, Star, Settings, BookOpen, Volume2, VolumeX, Sun, Moon } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

import clsx from 'clsx';
import { AudioController } from '../shared/AudioController';
import { audioSynth } from '../../utils/audioSynth';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { AntiGravityCanvas } from './AntiGravityCanvas';
import { useNavigate } from 'react-router-dom';
import { bgmManager } from '../../utils/bgmManager';
import { MapAmbience } from './MapAmbience';
import { VibeSpinnerButton } from '../MoodWheel/VibeSpinnerButton';
import { getUnlockedDayCount } from '../../utils/storyUnlock';

interface LevelMapProps {
    onPlayLevel: (level: any) => void;
    onOpenDnaProfile: () => void;
}


export function LevelMap({ onPlayLevel, onOpenDnaProfile }: LevelMapProps) {
    const navigate = useNavigate();
    const levels = useUserStore((state) => state.levels);
    const levelScores = useUserStore((state) => state.levelScores);
    const profile = useUserStore((state) => state.profile);
    const activeAge = profile?.age || 18;
    
    let ageLevels: any[] = [];
    
    // Process levels and forcefully sync with levelScores to guarantee perfect UI reactivity
    let processedLevels = (levels || []).map(l => {
        const localScore = levelScores[l.id];
        if (localScore !== undefined && localScore > 0) {
            return { ...l, status: 'completed', stars: Math.max(l.stars || 0, localScore) };
        }
        return l;
    });

    if (profile?.preferred_map === 'jee') {
        ageLevels = processedLevels.filter(l => l.theme === 'JEE').sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
    } else if (profile?.preferred_map === 'neet') {
        ageLevels = processedLevels.filter(l => l.theme === 'NEET').sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
    } else {
        // Standard Map Flow
        // 1. Filter by age
        let ageFiltered = processedLevels.filter(l => Number(l.age) === Number(activeAge));
        
        // Fallback: If no levels for their exact age, fallback to age 18, or just all non-JEE/NEET levels
        if (ageFiltered.length === 0) {
            ageFiltered = processedLevels.filter(l => Number(l.age) === 18);
        }
        if (ageFiltered.length === 0) {
            ageFiltered = processedLevels.filter(l => l.theme !== 'JEE' && l.theme !== 'NEET');
        }

        // 2. Apply Interest Filtering
        const alwaysShowPersonalities = new Set([
            'Billie Eilish', 'Justin Bieber', 'MrBeast', 'Ritesh Agarwal', 'Muhammad Ali',
            'Dhruv Rathee', 'Falguni Nayar', 'Nikola Tesla',
            'Zendaya', 'Neeraj Chopra', 'Prajakta Koli', 'Selena Gomez', 'Shah Rukh Khan'
        ]);

        let interestFiltered = ageFiltered;
        if (profile?.psychologicalProfile) {
            const { interest_goal = '', interest_domain = '' } = profile.psychologicalProfile as any;
            let allowedNames = new Set<string>();
            let bypassFilter = false;

            const goals = interest_goal.split(',').map((s: string) => s.trim());
            const domains = interest_domain.split(',').map((s: string) => s.trim());
            const interests = [...goals, ...domains];

            if (interests.some((i: string) => i.includes('Success') || i.includes('Leadership'))) bypassFilter = true;

            if (!bypassFilter && interests.length > 0) {
                if (interests.some((i: string) => i.includes('Money') || i.includes('Business'))) {
                    ['Bill Gates', 'Ratan Tata', 'Indra Nooyi', 'Walt Disney'].forEach(n => allowedNames.add(n));
                }
                if (interests.some((i: string) => i.includes('Tech'))) {
                    ['Bill Gates', 'Steve Jobs', 'Sundar Pichai'].forEach(n => allowedNames.add(n));
                }
                if (interests.some((i: string) => i.includes('Creativity') || i.includes('Love'))) {
                    ['Taylor Swift', 'Shah Rukh Khan', 'Frida Kahlo', 'A.R. Rahman', 'Steven Spielberg', 'J.K. Rowling', 'Mary Shelley'].forEach(n => allowedNames.add(n));
                }
                if (interests.some((i: string) => i.includes('Discipline'))) {
                    ['Sachin Tendulkar', 'Virat Kohli', 'Kobe Bryant', 'P.V. Sindhu', 'Arnold'].forEach(n => allowedNames.add(n));
                }

                if (allowedNames.size > 0) {
                    const tempFiltered = ageFiltered.filter(l => {
                        const p = l.personality || '';
                        if (Array.from(alwaysShowPersonalities).some(n => p.includes(n))) return true;
                        return Array.from(allowedNames).some(name => p.includes(name));
                    });
                    
                    // SAFETY NET: If interest filter wiped out ALL nodes, ignore the filter
                    if (tempFiltered.length > 0) {
                        interestFiltered = tempFiltered;
                    }
                }
            }
        }
        
        ageLevels = interestFiltered;
    }
    
    const unlockedDays = getUnlockedDayCount(profile?.access_type, profile?.access_start_date);

    const mapTheme = useUserStore((state) => state.mapTheme);
    const isCandyMode = mapTheme === 'light';
    
    // Streaks
    const checkStreak = useUserStore((state) => state.checkStreak);
    
    useEffect(() => {
        checkStreak(); // evaluate streaks on mount
    }, [checkStreak]);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isBgmEnabled, setIsBgmEnabled] = useState(bgmManager.enabled);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);

        // Play neon-map BGM on initial mount
        bgmManager.setMapReady();
        bgmManager.play('neon-map');

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Play neon-map BGM on mount
    useEffect(() => {
        bgmManager.play('neon-map');
    }, []);

    // Configuration
    const NODE_SPACING_DESKTOP = 220;
    const NODE_SPACING_MOBILE = 180;
    const NODE_SPACING = isMobile ? NODE_SPACING_MOBILE : NODE_SPACING_DESKTOP;

    // Manual Offsets to align with the "River" background image
    // Manual Offsets to align with the "River" background image
    const DESKTOP_NODE_OFFSETS = [0, -60, 50, -50, 20, 60, -40, 30, -60, 0];
    const MOBILE_NODE_OFFSETS = [0, -20, 20, -20, 10, 25, -15, 10, -20, 0]; // Tighter zig-zag for mobile

    const NODE_OFFSETS = isMobile ? MOBILE_NODE_OFFSETS : DESKTOP_NODE_OFFSETS;

    const totalHeight = (ageLevels.length * NODE_SPACING) + (isMobile ? 300 : 400);

    // Helper to calculate X/Y for a node based on index
    const getPosition = (index: number) => {
        // TOP-DOWN: Start from Top
        const y = index * NODE_SPACING + (isMobile ? 120 : 150);

        // xOffset is used on desktop only; mobile always centers nodes
        const xOffset = index < NODE_OFFSETS.length
            ? NODE_OFFSETS[index]
            : Math.sin(index) * (isMobile ? 30 : 60);

        return { x: xOffset, y };
    };

    // Scroll refs and values
    const containerRef = useRef<HTMLDivElement>(null);
    const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
    const [canvasReady, setCanvasReady] = useState(false);

    const handleCanvasReady = useCallback(() => {
        setCanvasReady(true);
    }, []);

    useEffect(() => {
        const handleResize = () => setWindowHeight(window.innerHeight);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { scrollYProgress, scrollY: motionScrollY } = useScroll({ container: containerRef });

    // The "Liquid Scroll" feel
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 400, // Increased for sharper response
        damping: 40,    // Increased to prevent wobble
        mass: 0.5,      // Lighter mass for immediate start
        restDelta: 0.001
    });

    const scrollableDistance = Math.max(0, totalHeight - windowHeight);
    const hudY = useTransform(smoothProgress, [0, 1], [0, -scrollableDistance]);

    // --- STARTUP SOUND & AUTO-SCROLL ---
    useEffect(() => {
        // Startup Sound
        audioSynth.playStartup();

        const scrollToTop = () => {
            if (containerRef.current) {
                containerRef.current.scrollTop = 0;
                containerRef.current.dispatchEvent(new Event('scroll'));
            }
        };

        requestAnimationFrame(scrollToTop);
        const timer = setTimeout(scrollToTop, 150);
        return () => clearTimeout(timer);
    }, [ageLevels.length]);

    // --- SCROLL AUDIO GLIDE ---
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let lastScrollTop = container.scrollTop;
        let scrollTimeout: any;

        const handleScroll = () => {
            const currentScrollTop = container.scrollTop;
            const delta = Math.abs(currentScrollTop - lastScrollTop);
            
            if (delta > 2) {
                audioSynth.startGlide();
                audioSynth.updateGlide(delta);
                
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    audioSynth.stopGlide();
                }, 150);
            }
            
            lastScrollTop = currentScrollTop;
        };

        container.addEventListener('scroll', handleScroll);
        return () => {
            container.removeEventListener('scroll', handleScroll);
            clearTimeout(scrollTimeout);
            audioSynth.stopGlide();
        };
    }, []);

    return (
        <div className="fixed inset-0 w-full h-[100dvh] bg-slate-900 overflow-hidden">
            <AudioController />
            {/* --- FIXED UI LAYER (Stays on Top) --- */}

            {/* Vibe Spinner Button (Top Center below Navbar) */}
            <div className="absolute top-[70px] left-0 w-full flex justify-center z-[100] pointer-events-none px-2">
                <div className="pointer-events-auto">
                    <VibeSpinnerButton
                        streak={profile?.current_streak || 0}
                        completed={!!profile?.daily_challenge_completed}
                        userId={profile?.id || ''}
                        onClick={() => {
                            audioSynth.playClick();
                            navigate('/game/mood');
                        }}
                    />
                </div>
            </div>


            {/* Settings & Theme Buttons */}
            <div className="absolute top-20 left-4 md:top-24 md:left-6 z-[100] flex flex-col gap-2">
                <button
                    onClick={() => {
                        audioSynth.playClick();
                        navigate('/game/settings');
                    }}
                    className="w-8 h-8 md:w-10 md:h-10 bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all border border-white/20 shadow-lg hover:rotate-12 active:scale-90"
                    aria-label="Settings"
                >
                    <Settings size={18} className="md:w-5 md:h-5" />
                </button>
                <button
                    onClick={() => {
                        audioSynth.playClick();
                        navigate('/game/theme');
                    }}
                    className={clsx(
                        "w-8 h-8 md:w-10 md:h-10 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all shadow-lg border hover:-rotate-12 active:scale-90",
                        isCandyMode
                            ? "bg-amber-400/20 hover:bg-amber-400/40 border-amber-300/50"
                            : "bg-indigo-500/20 hover:bg-indigo-500/40 border-indigo-400/50"
                    )}
                    aria-label="Toggle Theme"
                >
                    {isCandyMode ? <Sun size={18} className="md:w-5 md:h-5 text-amber-300 animate-pulse" /> : <Moon size={18} className="md:w-5 md:h-5 text-indigo-300 animate-breath" />}
                </button>
            </div>

            {/* Top Right Controls */}
            <div className="absolute top-20 right-4 md:top-24 md:right-6 z-[100] animate-fade-in-delayed flex flex-col gap-2 items-end map-right-buttons">
                
                {/* BGM Toggle Button */}
                <button
                    onClick={() => {
                        audioSynth.playClick();
                        bgmManager.toggle();
                        setIsBgmEnabled(bgmManager.enabled);
                    }}
                    className={clsx(
                        "group flex items-center justify-center gap-2 px-3 py-1.5 md:py-2 rounded-full shadow-lg border transition-all pointer-events-auto hover:scale-105 active:scale-95",
                        isCandyMode
                            ? "bg-white/90 border-pink-200 text-pink-500"
                            : "bg-slate-900 border-indigo-500/50 text-indigo-400"
                    )}
                >
                    {isBgmEnabled ? <Volume2 size={16} className="md:w-5 md:h-5" /> : <VolumeX size={16} className="md:w-5 md:h-5 text-slate-500" />}
                    <span className={clsx(
                        "text-[10px] md:text-xs font-bold uppercase tracking-widest",
                        !isBgmEnabled && "text-slate-500"
                    )}>
                        BGM
                    </span>
                </button>
                <button
                    onClick={() => {
                        audioSynth.playClick();
                        navigate('/game/journal');
                    }}
                    className={clsx(
                        "group flex items-center gap-1.5 md:gap-3 pr-3 md:pr-6 pl-1.5 py-1 md:py-2 rounded-full shadow-2xl transition-all border-2 animate-float",
                        isCandyMode
                            ? "bg-white/90 border-pink-200 hover:border-pink-400 hover:scale-105 active:scale-95 animate-pulse-glow-amber"
                            : "bg-slate-900 border-amber-600/50 hover:border-amber-400 hover:scale-105 active:scale-95 animate-pulse-glow-amber"
                    )}
                >
                    <div className={clsx(
                        "text-white p-1 md:p-2 rounded-full shadow-md group-hover:rotate-12 transition-transform",
                        isCandyMode ? "bg-pink-500" : "bg-gradient-to-br from-amber-400 to-amber-600"
                    )}>
                        <BookOpen size={14} className="stroke-[3] md:w-5 md:h-5" />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                        <span className={clsx(
                            "text-[8px] md:text-[10px] font-bold uppercase tracking-wider hidden xs:block",
                            isCandyMode ? "text-pink-400" : "text-amber-500/80"
                        )}>MY WISDOM</span>
                        <span className={clsx(
                            "text-xs md:text-sm font-black transition-colors",
                            isCandyMode ? "text-slate-800 group-hover:text-pink-600" : "text-amber-400 group-hover:text-amber-300"
                        )}>JOURNAL</span>
                    </div>
                </button>

                {/* DNA Profile Button - Isolated to prevent disappearing */}
                 <button
                    onClick={() => {
                        console.log('DNA button clicked');
                        audioSynth.playClick();
                        onOpenDnaProfile();
                    }}
                    className={clsx(
                        "group flex items-center gap-1.5 pr-2 md:pr-4 pl-1.5 py-1 md:py-1.5 border hover:scale-105 active:scale-95 transition-all shadow-lg rounded-full pointer-events-auto animate-float-delayed",
                        isCandyMode
                            ? "bg-purple-900/40 border-purple-400/50 backdrop-blur-md"
                            : "bg-[#0d0d16] border-[#00f2ff]/30 backdrop-blur-md animate-pulse-glow-cyan"
                    )}
                >
                    <div className={clsx(
                        "text-xs font-black rounded-full flex items-center justify-center p-1 drop-shadow-md text-white border border-white/20",
                        isCandyMode ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-gradient-to-r from-[#00f2ff] to-[#d575ff]"
                    )}>
                        🧬
                    </div>
                    <span className={clsx(
                        "text-[10px] md:text-xs font-black uppercase tracking-widest leading-none border-l pl-2",
                        isCandyMode ? "text-pink-100 border-pink-400/50" : "text-[#99f7ff] border-[#00f2ff]/30"
                    )}>DNA DATA</span>
                </button>
            </div>

            {/* Modals moved to routes */}
            {/* --- SCROLLABLE MAP CONTENT --- */}
            <div
                ref={containerRef}
                className="w-full h-full overflow-y-auto overflow-x-hidden relative scroll-smooth"
            >
                {/* Dummy div to enforce native scroll height */}
                <div style={{ height: totalHeight, width: '100%' }} />

                {/* --- LAYER 1: BACKDROP (AntiGravityCanvas) --- */}
                <AntiGravityCanvas
                    progress={smoothProgress}
                    onReady={handleCanvasReady}
                />

                <MapAmbience scrollY={motionScrollY} />

                {!isMobile && canvasReady && (
                    <div className="fixed inset-0 bg-gradient-to-t from-pink-200/20 via-transparent to-slate-900/50 mix-blend-overlay pointer-events-none z-10" />
                )}

                {/* --- LAYER 2: MIDGROUND HUD (Interactive & Smooth Synced) --- */}
                <motion.div
                    className="fixed top-0 left-0 w-full layer-mid pb-32 pointer-events-none z-20"
                    style={{ 
                        height: totalHeight, 
                        y: hudY, 
                        willChange: "transform" // Force GPU acceleration on mobile
                    }}
                >
                    <div className="relative w-full max-w-md mx-auto mt-24 md:mt-32 pointer-events-none h-full map-content">
                        {/* NODES */}

                        {/* LEVEL NODES */}
                        {ageLevels.map((level, i) => {
                            const pos = getPosition(i);
                            let isUnlocked = level.status !== 'locked';
                            if (level.day_number !== undefined) {
                                isUnlocked = level.day_number <= unlockedDays;
                            }
                            const isCompleted = level.status === 'completed';
                            const isCurrent = isUnlocked && !isCompleted;

                            return (
                                <div
                                    key={level.id}
                                    className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center transition-all duration-500 z-10 pointer-events-auto personality-node-container"
                                    style={isMobile
                                        ? { top: pos.y, left: '50%', transform: 'translateX(-50%)', zIndex: 20 + i }
                                        : { top: pos.y, transform: `translate(calc(-50% + ${pos.x}px), -50%)`, zIndex: 20 + i }
                                    }
                                >
                                    <div
                                        className={clsx(
                                            "candy-node-container group cursor-pointer hover:scale-110 transition-transform animate-float",
                                            isCurrent && "candy-node-active animate-breath",
                                            !isUnlocked && "candy-node-locked grayscale opacity-80",
                                            isCompleted && "candy-node-completed"
                                        )}
                                        // Touch start for mobile responsiveness
                                        onTouchStart={() => {
                                            if (isUnlocked) audioSynth.playHover();
                                        }}
                                        onClick={() => {
                                            if (isUnlocked) {
                                                audioSynth.playClick();
                                                onPlayLevel(level);
                                            }
                                        }}
                                    >
                                        <div className="lollipop-stick" />
                                        {/* Responsive Halo */}
                                        <div className={clsx(
                                            "absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full transition-colors node-base",
                                            // Mobile: w-20 h-20, Desktop: w-28 h-28
                                            "w-20 h-20 md:w-28 md:h-28",
                                            isCandyMode 
                                                ? (isCurrent ? "bg-pink-100/50" : "bg-white/10")
                                                : (isCurrent ? "bg-amber-400/20" : "bg-[#4DD9FF]/10")
                                        )} />

                                        {/* Responsive Avatar Ring */}
                                        <div className={clsx(
                                            "relative rounded-full overflow-hidden flex items-center justify-center bg-white node-ring transition-all duration-300",
                                            // Mobile: w-16 h-16, Desktop: w-24 h-24
                                            "w-16 h-16 md:w-24 md:h-24",
                                            isCandyMode
                                                ? (isCurrent ? "border-4 border-pink-400 ring-4 ring-pink-200 shadow-[0_0_20px_rgba(236,72,153,0.6)]" : "border-4 border-slate-300 shadow-[0_8px_0_rgba(0,0,0,0.2)]")
                                                : (isCurrent 
                                                    ? "border-4 border-amber-400 ring-4 ring-amber-400/30 shadow-[0_0_25px_rgba(245,158,11,0.8)]"
                                                    : "border-transparent ring-2 ring-[#4DD9FF]/80 shadow-[0_0_15px_rgba(77,217,255,0.6)]")
                                        )}>
                                            <img 
                                                src={level.portrait ? `/portraits/${level.portrait}` : (level.avatarUrl || '/assets/avatar_business.png')} 
                                                alt={level.archetype} 
                                                className="w-full h-full object-cover node-content" 
                                                onError={(e) => { e.currentTarget.src = '/assets/avatar_business.png'; }}
                                            />
                                            {!isUnlocked && (
                                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-200/50 backdrop-blur-[1px]">
                                                    <Lock size={20} className="text-slate-500 drop-shadow-md opacity-80 md:w-6 md:h-6" />
                                                </div>
                                            )}
                                            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-full" />
                                        </div>

                                        {/* Lock Tooltip */}
                                        {!isUnlocked && level.day_number !== undefined && (
                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
                                                <div className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded shadow-xl border border-slate-700 whitespace-nowrap">
                                                    🔒 Unlocks on Day {level.day_number}
                                                </div>
                                            </div>
                                        )}

                                        {/* Labels */}
                                        <div className={clsx(
                                            "absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap z-30 transition-all duration-300 transform flex flex-col items-center",
                                            "md:-bottom-14", // Lower overlap on desktop
                                            isUnlocked ? "scale-100 hover:scale-110" : "scale-90 opacity-70 grayscale"
                                        )}>
                                            {/* Personality Badge */}
                                            {level.personality && (
                                                <div className={clsx(
                                                    "relative -mb-2 px-3 py-0.5 rounded-full border shadow-sm flex items-center justify-center z-40 animate-float min-w-max",
                                                    "md:-mb-3 md:px-4 md:py-1 md:border-2",
                                                    isCandyMode
                                                        ? (isUnlocked ? "bg-gradient-to-r from-yellow-300 to-yellow-500 border-white text-yellow-900" : "bg-slate-700 border-slate-600 text-slate-400")
                                                        : (isUnlocked 
                                                            ? (isCurrent ? "bg-amber-500 border-amber-300 text-amber-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-[rgba(10,15,40,0.95)] border-[#4DD9FF]/70 text-[#E8E0FF] shadow-[0_0_8px_rgba(77,217,255,0.3)]")
                                                            : "bg-slate-800 border-slate-700 text-slate-500")
                                                )}>
                                                    <span className="text-[10px] md:text-sm font-black uppercase tracking-blacker drop-shadow-sm personality-name-label">
                                                        {level.personality}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Story Title */}
                                            <div className={clsx(
                                                "px-4 py-1 pt-3 pb-1 md:px-6 md:py-2 md:pt-4 md:pb-2 rounded-xl shadow-xl flex items-center justify-center min-w-[100px] md:min-w-[140px] transition-all duration-300",
                                                isCandyMode
                                                    ? (isUnlocked ? "bg-gradient-to-r from-pink-500 to-rose-500 border-b-[3px] md:border-b-4 border-rose-800" : "border-b-[3px] md:border-b-4 bg-slate-800 border-slate-900")
                                                    : (isUnlocked
                                                        ? (isCurrent 
                                                            ? "bg-gradient-to-r from-amber-500 to-amber-600 border-b-[3px] md:border-b-4 border-amber-800 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                                                            : "bg-[rgba(10,15,40,0.95)] border border-[#4DD9FF]/60 shadow-[0_0_15px_rgba(77,217,255,0.15)]")
                                                        : "bg-slate-800/80 border-b-[3px] md:border-b-4 border-slate-900")
                                            )}>
                                                <span className={clsx(
                                                    "text-[10px] md:text-xs font-bold uppercase tracking-wider leading-none text-center story-title-label",
                                                    isCandyMode
                                                        ? (isUnlocked ? "text-white drop-shadow-md" : "text-slate-500")
                                                        : (isUnlocked 
                                                            ? (isCurrent ? "text-white drop-shadow-md" : "text-[#F0EEFF] drop-shadow-[0_0_4px_rgba(240,238,255,0.3)]")
                                                            : "text-slate-500")
                                                )}>
                                                    {level.title}
                                                </span>
                                            </div>
                                        </div>

                                        {isCompleted && (
                                            <div className="absolute -top-4 md:-top-6 flex gap-1 justify-center w-full">
                                                {[1, 2, 3].map(s => {
                                                    const isEarned = s <= (level.stars || 1);
                                                    return (
                                                        <Star 
                                                            key={s} 
                                                            size={16} 
                                                            className={clsx(
                                                                "drop-shadow-sm md:w-5 md:h-5",
                                                                isEarned 
                                                                    ? "fill-yellow-400 text-yellow-600 animate-bounce" 
                                                                    : "fill-slate-400/50 text-slate-500/50"
                                                            )} 
                                                            style={isEarned ? { animationDelay: `${s * 100}ms` } : {}} 
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>

        </div >
    );
}
