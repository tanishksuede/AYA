import { useUserStore } from '../../store/userStore';
import { Lock, Star, Settings, BookOpen, Volume2, VolumeX } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DISCLAIMER_TEXT } from './AntiGravityCanvas';
import { LessonJournal } from './LessonJournal';
import clsx from 'clsx';
import { AudioController } from '../shared/AudioController';
import { audioSynth } from '../../utils/audioSynth';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { DailyChallengeModal } from './DailyChallengeModal';
import { useNavigate } from 'react-router-dom';
import { ThemeSwitcherModal } from './ThemeSwitcherModal';
import { supabase } from '../../utils/supabase';

// Using HTML5 Video scrubbing for map background

interface SolarMapProps {
    onPlayLevel: (level: any) => void;
    onOpenDnaProfile: () => void;
    isMapActive?: boolean;
}

export function SolarMap({ onPlayLevel, onOpenDnaProfile, isMapActive = true }: SolarMapProps) {
    const navigate = useNavigate();
    const levels = useUserStore((state) => state.levels);
    const profile = useUserStore((state) => state.profile);
    const activeAge = profile?.age || 18;
    let processedLevels = levels.filter(l => l.age === activeAge);

    // New stories that should be visible to ALL users regardless of interests.
    const alwaysShowPersonalities = new Set([
        'Billie Eilish', 'MrBeast', 'Ritesh Agarwal', 'Muhammad Ali',
        'Dhruv Rathee', 'Falguni Nayar', 'Nikola Tesla',
        'Zendaya', 'Neeraj Chopra', 'Prajakta Koli', 'Selena Gomez', 'Shah Rukh Khan'
    ]);

    if (profile?.psychologicalProfile) {
        const { interest_goal = '', interest_domain = '' } = profile.psychologicalProfile as any;

        let allowedNames = new Set<string>();
        let bypassFilter = false;

        const goals = interest_goal.split(',').map((s: string) => s.trim());
        const domains = interest_domain.split(',').map((s: string) => s.trim());
        const interests = [...goals, ...domains];

        if (interests.some((i: string) => i.includes('Success') || i.includes('Leadership'))) {
            bypassFilter = true;
        }

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
                processedLevels = processedLevels.filter(l => {
                    const p = l.personality || '';
                    if (Array.from(alwaysShowPersonalities).some(n => p.includes(n))) return true;
                    return Array.from(allowedNames).some(name => p.includes(name));
                });
            }
        }
    }

    const ageLevels = processedLevels;

    // Streaks
    const checkStreak = useUserStore((state) => state.checkStreak);
    
    useEffect(() => {
        checkStreak(); // evaluate streaks on mount
    }, [checkStreak]);

    // Modals
    const [showSettings, setShowSettings] = useState(false);
    const [showJournal, setShowJournal] = useState(false);
    const [showChallengeModal, setShowChallengeModal] = useState(false);
    const [showThemeSwitcher, setShowThemeSwitcher] = useState(false);

    // Mobile Detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Configuration
    const NODE_SPACING_DESKTOP = 220;
    const NODE_SPACING_MOBILE = 180;
    const NODE_SPACING = isMobile ? NODE_SPACING_MOBILE : NODE_SPACING_DESKTOP;

    const DESKTOP_NODE_OFFSETS = [0, -60, 50, -50, 20, 60, -40, 30, -60, 0];
    const MOBILE_NODE_OFFSETS = [0, -20, 20, -20, 10, 25, -15, 10, -20, 0];

    const NODE_OFFSETS = isMobile ? MOBILE_NODE_OFFSETS : DESKTOP_NODE_OFFSETS;

    const totalFrames = 480; // Virtual frames for scroll math

    const getPosition = (index: number) => {
        const y = index * NODE_SPACING + (isMobile ? 120 : 150);
        // xOffset used on desktop; mobile centers nodes unconditionally
        const xOffset = index < NODE_OFFSETS.length
            ? NODE_OFFSETS[index]
            : Math.sin(index) * (isMobile ? 30 : 60);

        return { x: xOffset, y };
    };

    // Scroll refs and values
    const containerRef = useRef<HTMLDivElement>(null);
    const backgroundVideoRef = useRef<HTMLVideoElement>(null);
    const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
    
    // Scroll container height = lastNodePosition + viewport height
    const lastNodePosition = ageLevels.length > 0 ? getPosition(ageLevels.length - 1).y : 0;
    const totalHeight = lastNodePosition + windowHeight;

    const [canvasReady, setCanvasReady] = useState(false);
    const [framesLoaded, setFramesLoaded] = useState(0);
    const currentFrameIdx = useRef<number>(0);

    // Intro Video & Disclaimer State
    const [isReady, setIsReady] = useState(false);
    const [isVideoFinished, setIsVideoFinished] = useState(false);
    const [showPlayButton, setShowPlayButton] = useState(false);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const setIntroVideoCompleted = useUserStore((state) => state.setIntroVideoCompleted);

    useEffect(() => {
        const handleResize = () => setWindowHeight(window.innerHeight);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const scrollYProgress = useMotionValue(0);

    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 400,
        damping: 40,
        mass: 0.5,
        restDelta: 0.001
    });

    const scrollableDistance = Math.max(0, totalHeight - windowHeight);
    const hudY = useTransform(smoothProgress, [0, 1], [0, -scrollableDistance]);

    // Video scrubbing initialization (no frames to load anymore)
    useEffect(() => {
        // We consider it "ready" once the video data loads, but to not break the intro we simulate framesLoaded
        setFramesLoaded(totalFrames);
    }, [totalFrames]);

    // Effect to handle total readiness (Video + Images)
    useEffect(() => {
        if (canvasReady && isVideoFinished) {
            setIsReady(true);
            setIntroVideoCompleted(true);
            audioSynth.playStartup();
        }
    }, [canvasReady, isVideoFinished, setIntroVideoCompleted]);

    // Handle video auto-play and mute policy
    useEffect(() => {
        if (!isReady && videoRef.current) {
            const timer = setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.play().catch(err => {
                        if (err.name === 'NotAllowedError' || err.name === 'NotSupportedError') {
                            navigate('/game/mood');
                        }
                    });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isReady]);

    const handleManualPlay = () => {
        if (videoRef.current) {
            videoRef.current.play().then(() => {
                setShowPlayButton(false);
            }).catch(console.error);
        }
    };

    // Custom Scroll Parallax Effect (Native Wheel/Touch with Lerp)
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.style.willChange = 'transform';

        const targetFrameRef = { current: currentFrameIdx.current || 0 };
        const currentFrameRef = { current: currentFrameIdx.current || 0 };
        let touchStartY = 0;
        let ticking = false;
        let animationFrameId: number;

        let lastDrawnIndex = -1;

        const drawFrame = (frameIndex: number) => {
            if (frameIndex === lastDrawnIndex) return;
            lastDrawnIndex = frameIndex;

            const img = idleFramesRef.current[frameIndex];
            if (!img) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Only set width/height if it changed to prevent DOM thrashing
            if (canvas.width !== window.innerWidth) canvas.width = window.innerWidth;
            if (canvas.height !== window.innerHeight) canvas.height = window.innerHeight;
            
            const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width / 2) - (img.width / 2) * scale;
            const y = (canvas.height / 2) - (img.height / 2) * scale;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        };

        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

        let lastProgress = -1;
        let soundTimeout: any;
        const updateFrame = () => {
            if (Math.abs(currentFrameRef.current - targetFrameRef.current) > 0.001) {
                const prevFrame = currentFrameRef.current;
                currentFrameRef.current = lerp(currentFrameRef.current, targetFrameRef.current, 0.1);
                const frameIndex = Math.round(currentFrameRef.current);
                currentFrameIdx.current = frameIndex;
                
                // Scrub video based on progress
                const progress = currentFrameRef.current / Math.max(1, totalFrames - 1);
                if (backgroundVideoRef.current && backgroundVideoRef.current.duration) {
                    // Update video time for smooth scrubbing
                    backgroundVideoRef.current.currentTime = progress * backgroundVideoRef.current.duration;
                }
                
                // Audio glide
                const delta = Math.abs(currentFrameRef.current - prevFrame);
                if (delta > 0.5) {
                    audioSynth.startGlide();
                    audioSynth.updateGlide(delta * 5); // Scale delta to match LevelMap's range
                    
                    clearTimeout(soundTimeout);
                    soundTimeout = setTimeout(() => {
                        audioSynth.stopGlide();
                    }, 100);
                }
                
                // Sync HUD nodes using continuous values for extreme smoothness
                if (Math.abs(progress - lastProgress) > 0.0001) {
                    scrollYProgress.set(progress);
                    lastProgress = progress;
                }
            }


            animationFrameId = requestAnimationFrame(updateFrame);
        };

        // Start infinite animation loop
        animationFrameId = requestAnimationFrame(updateFrame);

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (!ticking) {
                requestAnimationFrame(() => {
                    const delta = e.deltaY * 0.3; // Desktop sensitivity 0.3
                    targetFrameRef.current = Math.max(0, Math.min(totalFrames - 1, targetFrameRef.current + delta));
                    ticking = false;
                });
                ticking = true;
            }
        };

        const handleTouchStart = (e: TouchEvent) => {
            touchStartY = e.touches[0].clientY;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const touchDelta = touchStartY - e.touches[0].clientY;
                    touchStartY = e.touches[0].clientY;
                    
                    const delta = touchDelta * 1.5; // Increased touch sensitivity for mobile
                    targetFrameRef.current = Math.max(0, Math.min(totalFrames - 1, targetFrameRef.current + delta));
                    ticking = false;
                });
                ticking = true;
            }
        };

        // Attach to BOTH window and container to ensure it always fires
                    targetProgressRef.current = Math.max(0, Math.min(1, targetProgressRef.current + touchDelta));
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        
        container?.addEventListener('wheel', handleWheel, { passive: false });
        container?.addEventListener('touchmove', handleTouchMove, { passive: true });

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            container?.removeEventListener('wheel', handleWheel);
            container?.removeEventListener('touchmove', handleTouchMove);
        };
    }, [canvasReady, scrollYProgress]);

    useEffect(() => {
        audioSynth.playStartup();
    }, [ageLevels.length]);

    return (
        <div className="fixed inset-0 w-full h-[100dvh] bg-slate-950 overflow-hidden text-white">
            <AudioController isMapActive={isMapActive} />

            {/* Daily Challenge Button */}
            <div className="absolute top-[70px] left-0 w-full flex justify-center z-[100] pointer-events-none px-2">
                <div className="relative group w-full max-w-[250px]">
                    {!profile?.daily_challenge_completed && (
                        <div className="absolute -inset-1 bg-orange-500/20 blur-md rounded-full animate-pulse pointer-events-none" style={{ animationDuration: '4s' }} />
                    )}
                    <button
                        onClick={() => { audioSynth.playClick(); setShowChallengeModal(true); }}
                        disabled={profile?.daily_challenge_completed}
                        className={clsx(
                            "pointer-events-auto relative w-full py-2.5 px-4 rounded-full flex flex-row items-center justify-center gap-3 transition-all duration-500",
                            profile?.daily_challenge_completed 
                                ? "bg-[rgba(20,10,5,0.8)] border border-slate-700 text-slate-500 opacity-90 cursor-default backdrop-blur-md" 
                                : "bg-[rgba(20,10,5,0.9)] backdrop-blur-md border border-[#FFB347]/50 shadow-[0_0_15px_rgba(255,179,71,0.3)] hover:shadow-[0_0_25px_rgba(255,179,71,0.6)] hover:bg-[rgba(30,15,10,0.9)] hover:border-[#FFB347] hover:scale-105 active:scale-95"
                        )}
                    >
                        <span className={clsx("text-lg", profile?.daily_challenge_completed ? "grayscale opacity-30" : "drop-shadow-[0_0_8px_rgba(255,179,71,0.8)]")}>☀️</span>
                        <div className="flex flex-col items-start leading-tight">
                            <span className={clsx("text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em]", profile?.daily_challenge_completed ? "text-slate-500" : "text-white drop-shadow-md")}>
                                {profile?.daily_challenge_completed ? "COMPLETED" : "TODAY'S CHALLENGE"}
                            </span>
                            <span className={clsx("text-[9px] font-bold tracking-widest uppercase", profile?.daily_challenge_completed ? "text-slate-600" : "text-[#FFB347] drop-shadow-[0_0_5px_rgba(255,179,71,0.5)]")}>
                                {profile?.current_streak || 0} DAY STREAK
                            </span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Settings & Theme Buttons */}
            <div className="absolute top-20 left-4 md:top-24 md:left-6 z-[100] flex flex-col gap-2">
                <button
                    onClick={() => { audioSynth.playClick(); setShowSettings(true); }}
                    className="w-8 h-8 md:w-10 md:h-10 bg-white/5 hover:bg-white/10 active:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-[#FFB347] transition-all border border-[#FFB347]/30 shadow-[0_0_10px_rgba(255,179,71,0.2)] hover:rotate-12 active:scale-90"
                    aria-label="Settings"
                >
                    <Settings size={18} className="md:w-5 md:h-5" />
                </button>
                <button
                    onClick={() => { audioSynth.playClick(); setShowThemeSwitcher(true); }}
                    className="w-8 h-8 md:w-10 md:h-10 bg-[#FFB347]/10 hover:bg-[#FFB347]/20 border border-[#FFB347]/50 backdrop-blur-md rounded-full flex items-center justify-center text-[#FFB347] transition-all shadow-[0_0_15px_rgba(255,179,71,0.3)] hover:-rotate-12 active:scale-90"
                    aria-label="Theme Switcher"
                >
                    <span className="text-sm">☀️</span>
                </button>
            </div>

            {/* Journal Toggle & DNA Profile */}
            <div className="absolute top-20 right-4 md:top-24 md:right-6 z-[100] flex flex-col gap-2 items-end map-right-buttons">
                <button
                    onClick={() => { audioSynth.playClick(); setShowJournal(true); }}
                    className="group flex items-center gap-1.5 md:gap-3 pr-3 md:pr-6 pl-1.5 py-1 md:py-2 rounded-full shadow-2xl transition-all border-2 bg-slate-900 border-[#FFB347]/50 hover:border-[#FFB347] hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,179,71,0.2)]"
                >
                    <div className="text-[#0a0510] p-1 md:p-2 rounded-full shadow-md group-hover:rotate-12 transition-transform bg-gradient-to-br from-[#FFB347] to-[#ff6b35]">
                        <BookOpen size={14} className="stroke-[3] md:w-5 md:h-5" />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                        <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider hidden xs:block text-[#FFB347]/80">MY WISDOM</span>
                        <span className="text-xs md:text-sm font-black transition-colors text-[#FFB347] group-hover:text-white">JOURNAL</span>
                    </div>
                </button>

                 <button
                    onClick={() => { audioSynth.playClick(); onOpenDnaProfile(); }}
                    className="group flex items-center gap-1.5 pr-2 md:pr-4 pl-1.5 py-1 md:py-1.5 border hover:scale-105 active:scale-95 transition-all shadow-lg rounded-full pointer-events-auto bg-[#0a0510] border-[#FFB347]/30 backdrop-blur-md"
                >
                    <div className="text-xs font-black rounded-full flex items-center justify-center p-1 drop-shadow-md text-[#0a0510] border border-white/20 bg-gradient-to-r from-[#FFB347] to-[#ff9100]">
                        🧬
                    </div>
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest leading-none border-l pl-2 text-[#FFB347] border-[#FFB347]/30">DNA DATA</span>
                </button>
            </div>

            {/* Cinematic Intro & Disclaimer Portal */}
            {!isReady && createPortal(
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0510]">
                    <div 
                        onClick={showPlayButton ? handleManualPlay : undefined}
                        className={`absolute inset-0 z-20 flex flex-col p-6 sm:p-10 bg-[#0a0510] text-[#FFB347]/60 font-mono text-[10px] sm:text-xs overflow-y-auto leading-relaxed whitespace-pre-wrap transition-opacity duration-1000 ease-in-out ${(!isVideoPlaying && !isVideoFinished) ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${showPlayButton ? 'cursor-pointer' : ''}`}
                    >
                        <h2 className="text-[#FFB347] text-lg sm:text-xl font-bold mb-4 uppercase tracking-widest border-b border-[#FFB347]/30 pb-2 text-center">Solar Realm — Legal Disclaimer</h2>
                        <div className="opacity-80">
                            {DISCLAIMER_TEXT}
                        </div>
                        
                        {showPlayButton && (
                            <div className="mt-8 mb-12 text-center text-[#FFB347] font-black tracking-[0.2em] animate-pulse text-xs sm:text-sm border border-[#FFB347]/30 py-4 rounded-lg bg-[#FFB347]/5 shadow-[0_0_15px_rgba(255,179,71,0.1)]">
                                TAP ANYWHERE TO AGREE & ENTER THE SUN
                            </div>
                        )}
                    </div>

                    <video
                        ref={videoRef}
                        src="/assets/intro.mp4"
                        autoPlay
                        playsInline
                        preload="auto"
                        onPlaying={() => setIsVideoPlaying(true)}
                        onTimeUpdate={(e) => {
                            const vid = e.target as HTMLVideoElement;
                            if (vid.duration && vid.duration - vid.currentTime < 0.5) {
                                setIsFadingOut(true);
                            }
                        }}
                        onEnded={() => setIsVideoFinished(true)}
                        className={`w-full h-full object-cover md:object-contain relative z-10 transition-opacity duration-500 ease-in-out ${isVideoPlaying && !isFadingOut ? 'opacity-100' : 'opacity-0'}`}
                    />
                </div>,
                document.body
            )}

            {/* Scrollable Map */}
            <div ref={containerRef} className="relative h-[100dvh] w-full bg-[#0a0510] text-white overflow-hidden touch-none selection:bg-[#FFB347] selection:text-[#4a2e00] font-sans">
            
            {/* LAYER 1: Full HD Background Video Scrubbing */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-black">
                <video
                    ref={backgroundVideoRef}
                    src="/assets/map_frames_dark.mp4"
                    preload="auto"
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    onLoadedData={() => {
                        setCanvasReady(true);
                    }}
                />
            </div>
                <div className="fixed inset-0 bg-gradient-to-t from-[#0a0510]/80 via-transparent to-slate-900/50 mix-blend-overlay pointer-events-none z-10" />

                {/* LAYER 2: NODES */}
                <motion.div
                    className="fixed top-0 left-0 w-full layer-mid pb-32 pointer-events-none z-20"
                    style={{ height: totalHeight, y: hudY, opacity: canvasReady ? 1 : 0 }}
                >
                    <div className="relative w-full max-w-md mx-auto mt-24 md:mt-32 pointer-events-none h-full">
                        {/* Nodes */}

                        {/* Nodes */}
                        {ageLevels.map((level, i) => {
                            const pos = getPosition(i);
                            const isUnlocked = level.status !== 'locked';
                            const isCompleted = level.status === 'completed';
                            const isCurrent = isUnlocked && !isCompleted;

                            return (
                                <motion.div
                                    key={level.id}
                                    className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center transition-all duration-500 z-10 pointer-events-auto personality-node-container"
                                    style={isMobile
                                        ? { top: pos.y, left: '50%', transform: 'translateX(-50%)', zIndex: 20 + i }
                                        : { top: pos.y, transform: `translate(calc(-50% + ${pos.x}px), -50%)`, zIndex: 20 + i }
                                    }
                                    whileHover={{ scale: 1.1, y: -5 }}
                                >
                                    <div
                                        className={clsx(
                                            "relative cursor-pointer transition-transform group animate-float",
                                            isCurrent && "animate-breath",
                                            !isUnlocked && "grayscale opacity-70"
                                        )}
                                        onTouchStart={() => { if (isUnlocked) audioSynth.playHover(); }}
                                        onClick={() => {
                                            if (isUnlocked) {
                                                audioSynth.playClick();
                                                onPlayLevel(level);
                                            }
                                        }}
                                    >
                                        {/* Avatar Ring */}
                                        <div className={clsx(
                                            "relative rounded-full overflow-hidden flex items-center justify-center bg-black transition-all duration-300",
                                            "w-16 h-16 md:w-24 md:h-24",
                                            isCurrent 
                                                ? "border-4 border-[#FFB347] ring-4 ring-[#FFB347]/30 shadow-[0_0_30px_rgba(255,179,71,0.8),0_10px_20px_rgba(0,0,0,0.8)]"
                                                : "border-transparent ring-2 ring-[#FFB347]/50 shadow-[0_5px_15px_rgba(0,0,0,0.6)]"
                                        )}>
                                            <img src={level.avatarUrl || '/assets/avatar_business.png'} alt={level.archetype} className="w-full h-full object-cover" />
                                            {!isUnlocked && (
                                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                                                    <Lock size={20} className="text-slate-400 opacity-80 md:w-6 md:h-6" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Glow under node */}
                                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-10 bg-black/50 blur-xl -z-10 rounded-full" />

                                        {/* Labels */}
                                        <div className={clsx(
                                            "absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap z-30 transition-all duration-300 transform flex flex-col items-center",
                                            "md:-bottom-14",
                                            isUnlocked ? "scale-100" : "scale-90"
                                        )}>
                                            {level.personality && (
                                                <div className={clsx(
                                                    "relative -mb-2 px-3 py-0.5 rounded-full border shadow-sm flex items-center justify-center z-40",
                                                    "md:-mb-3 md:px-4 md:py-1 md:border-2",
                                                    isUnlocked 
                                                        ? (isCurrent ? "bg-[#FFB347] border-[#fff0d4] text-[#4a2e00] shadow-[0_0_15px_rgba(255,179,71,0.6)]" : "bg-[rgba(15,10,5,0.8)] border-[#FFB347]/50 text-[#FFB347] backdrop-blur-md shadow-[0_0_10px_rgba(255,179,71,0.2)]")
                                                        : "bg-slate-900 border-slate-700 text-slate-500"
                                                )}>
                                                    <span className="text-[10px] md:text-sm font-black uppercase drop-shadow-sm tracking-widest personality-name-label">
                                                        {level.personality}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={clsx(
                                                "px-4 py-1 pt-3 pb-1 md:px-6 md:py-2 md:pt-4 md:pb-2 rounded-xl shadow-2xl flex items-center justify-center min-w-[100px] md:min-w-[140px]",
                                                isUnlocked
                                                    ? (isCurrent 
                                                        ? "bg-gradient-to-r from-[#FFB347] to-[#ff7b00] border-b-[3px] md:border-b-4 border-[#803d00]"
                                                        : "bg-[rgba(15,10,5,0.85)] backdrop-blur-md border border-[#FFB347]/40 shadow-[0_0_20px_rgba(0,0,0,0.8)]")
                                                    : "bg-slate-900/90 border-b-[3px] md:border-b-4 border-slate-950"
                                            )}>
                                                <span className={clsx(
                                                    "text-[10px] md:text-xs font-bold uppercase tracking-wider leading-none text-center story-title-label",
                                                    isUnlocked 
                                                        ? (isCurrent ? "text-white drop-shadow-md" : "text-[#fff0d4] drop-shadow-[0_0_5px_rgba(255,179,71,0.5)]")
                                                        : "text-slate-500"
                                                )}>
                                                    {level.title}
                                                </span>
                                            </div>
                                        </div>

                                        {isCompleted && (
                                            <div className="absolute -top-4 md:-top-6 flex gap-1 justify-center w-full">
                                                {[1, 2, 3].map(s => (
                                                    <Star key={s} size={16} className="fill-[#FFB347] text-[#ffdd99] drop-shadow-[0_0_8px_rgba(255,179,71,0.8)] animate-bounce md:w-5 md:h-5" style={{ animationDelay: `${s * 100}ms` }} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>
        </div >
    );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
    const [newAge, setNewAge] = useState(18);
    const profile = useUserStore((state) => state.profile);
    const setProfile = useUserStore((state) => state.setProfile);
    const resetProgress = useUserStore((state) => state.resetProgress);

    const musicVolume = useUserStore((state) => state.musicVolume);
    const sfxVolume = useUserStore((state) => state.sfxVolume);
    const isMusicMuted = useUserStore((state) => state.isMusicMuted);
    const isSfxMuted = useUserStore((state) => state.isSfxMuted);
    const setMusicVolume = useUserStore((state) => state.setMusicVolume);
    const setSfxVolume = useUserStore((state) => state.setSfxVolume);
    const toggleMusicMute = useUserStore((state) => state.toggleMusicMute);
    const toggleSfxMute = useUserStore((state) => state.toggleSfxMute);

    useEffect(() => {
        if (profile?.age) setNewAge(profile.age);
    }, [profile]);

    const handleAgeSave = () => {
        if (profile) {
            setProfile({ ...profile, age: newAge });
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[#0a0510] border border-[#FFB347]/30 p-6 rounded-3xl max-w-sm w-full shadow-[0_0_50px_rgba(255,179,71,0.15)] relative">
                <h2 className="text-xl font-bold text-white mb-4 text-center tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Settings</h2>
                <div className="space-y-6">
                    <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-[#FFB347]/70 uppercase tracking-widest">Music</span>
                                <button
                                    onClick={toggleMusicMute}
                                    className={clsx("p-1.5 rounded-lg transition-colors", isMusicMuted ? "text-red-400 bg-red-400/10" : "text-[#FFB347] bg-[#FFB347]/10")}
                                >
                                    {isMusicMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </button>
                            </div>
                            <input
                                type="range"
                                min="0" max="1" step="0.1"
                                value={musicVolume}
                                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#FFB347]"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-[#FFB347]/70 uppercase tracking-widest">Sound FX</span>
                                <button
                                    onClick={toggleSfxMute}
                                    className={clsx("p-1.5 rounded-lg transition-colors", isSfxMuted ? "text-red-400 bg-red-400/10" : "text-[#FFB347] bg-[#FFB347]/10")}
                                >
                                    {isSfxMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </button>
                            </div>
                            <input
                                type="range"
                                min="0" max="1" step="0.1"
                                value={sfxVolume}
                                onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#FFB347]"
                            />
                        </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <label className="block text-xs font-bold text-[#FFB347]/70 uppercase tracking-widest mb-2">Current Age</label>
                        <input
                            type="number"
                            value={newAge}
                            onChange={(e) => setNewAge(parseInt(e.target.value))}
                            className="w-full bg-[#05020a] text-white rounded-xl px-4 py-3 border border-[#FFB347]/20 font-mono focus:border-[#FFB347] outline-none transition-colors"
                        />
                    </div>
                    
                    <button onClick={handleAgeSave} className="w-full bg-gradient-to-r from-[#FFB347] to-[#ff7b00] text-[#1a0f00] font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(255,179,71,0.3)] hover:shadow-[0_0_30px_rgba(255,179,71,0.5)] transform active:scale-95 transition-all tracking-wider text-sm uppercase">
                        UPDATE TIMELINE
                    </button>

                    <button
                        onClick={() => resetProgress()}
                        className="w-full bg-[#1a0a05] hover:bg-red-950/40 text-red-400/80 hover:text-red-400 border border-red-900/50 hover:border-red-500/50 font-bold py-3.5 rounded-xl transform active:scale-95 transition-all uppercase tracking-widest text-xs"
                    >
                        Reset Progress
                    </button>

                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            localStorage.clear();
                            sessionStorage.clear();
                            window.location.href = '/';
                        }}
                        className="w-full bg-slate-800 hover:bg-orange-900/50 text-orange-400 hover:text-orange-200 border border-slate-700 hover:border-orange-800 font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all uppercase tracking-wider text-xs"
                    >
                        Sign Out
                    </button>

                    <button onClick={onClose} className="w-full text-slate-500 text-xs font-bold tracking-widest py-2 hover:text-white transition-colors uppercase">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
