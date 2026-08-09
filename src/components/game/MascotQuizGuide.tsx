import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export const MASCOT_ASSETS = {
    WAVING: '/assets/Macot/waving mascot.lottie',
    WATCHING_LEFT: '/assets/Macot/watching left mascot.lottie',
    WATCHING_RIGHT: '/assets/Macot/watching right  mascot.lottie',
    BIRD: '/assets/Macot/mascot with bird.lottie',
    HAPPY: '/assets/Macot/happy mascot.lottie',
    CHAIR_CELEBRATE: '/assets/Macot/chair celebrate mascot.lottie',
    VERIFIED: '/assets/Macot/verified mascot.lottie',
    SAD: '/assets/Macot/sad mascot.lottie',
    WINNER: '/assets/Macot/Winner mascot.lottie',
} as const;

export type MascotAction = 'none' | 'select' | 'deselect' | 'q5_complete' | 'q9_complete';

export interface MascotQuizGuideProps {
    currentStep: number; // 0-indexed (0 to 8 for Q1 to Q9)
    lastAction?: MascotAction;
    actionTimestamp?: number;
    isSaving?: boolean;
    className?: string;
}

const IDLE_MASCOTS = [
    MASCOT_ASSETS.WATCHING_LEFT,
    MASCOT_ASSETS.WATCHING_RIGHT,
    MASCOT_ASSETS.BIRD,
];

export const MascotQuizGuide: React.FC<MascotQuizGuideProps> = ({
    currentStep,
    lastAction = 'none',
    actionTimestamp = 0,
    isSaving = false,
    className = '',
}) => {
    const [idleIndex, setIdleIndex] = useState(0);
    const [overrideMascot, setOverrideMascot] = useState<string | null>(null);
    const overrideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Preload all dotLottie files into browser cache on mount to eliminate flashing
    useEffect(() => {
        Object.values(MASCOT_ASSETS).forEach((assetUrl) => {
            fetch(encodeURI(assetUrl)).catch(() => {});
        });
    }, []);

    // Idle cycling timer for questions 2-4 and 6
    useEffect(() => {
        if ([1, 2, 3, 5].includes(currentStep)) {
            const interval = setInterval(() => {
                setIdleIndex((prev) => (prev + 1) % IDLE_MASCOTS.length);
            }, 4500);
            return () => clearInterval(interval);
        }
    }, [currentStep]);

    // Action reaction triggers (Happy on click, Sad on deselect, Celebrate on Q5, Winner on Q9)
    useEffect(() => {
        if (actionTimestamp <= 0) return;

        if (overrideTimerRef.current) {
            clearTimeout(overrideTimerRef.current);
            overrideTimerRef.current = null;
        }

        if (isSaving || lastAction === 'q9_complete') {
            setOverrideMascot(MASCOT_ASSETS.WINNER);
            return;
        }

        if (lastAction === 'q5_complete' || (currentStep === 4 && lastAction === 'select')) {
            setOverrideMascot(MASCOT_ASSETS.CHAIR_CELEBRATE);
            overrideTimerRef.current = setTimeout(() => {
                setOverrideMascot(null);
            }, 2500);
            return;
        }

        if (lastAction === 'select') {
            setOverrideMascot(MASCOT_ASSETS.HAPPY);
            overrideTimerRef.current = setTimeout(() => {
                setOverrideMascot(null);
            }, 1500);
            return;
        }

        if (lastAction === 'deselect') {
            setOverrideMascot(MASCOT_ASSETS.SAD);
            overrideTimerRef.current = setTimeout(() => {
                setOverrideMascot(null);
            }, 1000);
            return;
        }
    }, [actionTimestamp, lastAction, isSaving, currentStep]);

    // Compute current active mascot
    const getActiveMascot = (): string => {
        if (isSaving || lastAction === 'q9_complete') {
            return MASCOT_ASSETS.WINNER;
        }
        if (overrideMascot) {
            return overrideMascot;
        }

        switch (currentStep) {
            case 0: // Q1
                return MASCOT_ASSETS.WAVING;
            case 1: // Q2
            case 2: // Q3
            case 3: // Q4
                return IDLE_MASCOTS[idleIndex % IDLE_MASCOTS.length];
            case 4: // Q5 Milestone
                return MASCOT_ASSETS.CHAIR_CELEBRATE;
            case 5: // Q6
                return IDLE_MASCOTS[idleIndex % IDLE_MASCOTS.length];
            case 6: // Q7 Verified
            case 7: // Q8 Verified
                return MASCOT_ASSETS.VERIFIED;
            case 8: // Q9 Final
                return MASCOT_ASSETS.WINNER;
            default:
                return MASCOT_ASSETS.WAVING;
        }
    };

    const activeMascot = getActiveMascot();
    const encodedMascotSrc = encodeURI(activeMascot);
    const isWinner = activeMascot === MASCOT_ASSETS.WINNER;

    return (
        <div className={`pointer-events-none relative flex flex-col items-center justify-center select-none ${className}`}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeMascot}
                    initial={{ opacity: 0, scale: isWinner ? 0.7 : 0.95 }}
                    animate={{ opacity: 1, scale: isWinner ? 1.15 : 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={
                        isWinner
                            ? { type: 'spring', stiffness: 200, damping: 12 }
                            : { opacity: { duration: 0.3 }, scale: { duration: 0.3 } }
                    }
                    className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center"
                >
                    {/* Glowing background aura */}
                    <div
                        className={`absolute inset-0 rounded-full blur-2xl opacity-40 transition-colors duration-500 ${
                            isWinner
                                ? 'bg-amber-400 opacity-80 animate-pulse'
                                : currentStep >= 6
                                ? 'bg-[#00f1fe]'
                                : 'bg-[#c084fc]'
                        }`}
                    />

                    <DotLottieReact
                        src={encodedMascotSrc}
                        loop
                        autoplay
                        style={{ width: '100%', height: '100%' }}
                        className="w-full h-full object-contain relative z-10"
                    />
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
