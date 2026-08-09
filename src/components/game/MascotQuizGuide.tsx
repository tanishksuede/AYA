import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export const MASCOT_ASSETS = {
    WATCHING_LEFT: '/assets/Macot/watching left mascot.lottie',
    BIRD: '/assets/Macot/mascot with bird.lottie',
    HAPPY: '/assets/Macot/happy mascot.lottie',
    WINNER: '/assets/Macot/Winner mascot.lottie',
} as const;

export type MascotAction = 'none' | 'select' | 'deselect' | 'next' | 'complete';

export interface MascotQuizGuideProps {
    currentStep: number; // 0-indexed (0 to 8 for Q1 to Q9)
    lastAction?: MascotAction;
    actionTimestamp?: number;
    isSaving?: boolean;
    className?: string;
}

export const MascotQuizGuide: React.FC<MascotQuizGuideProps> = ({
    currentStep,
    lastAction = 'none',
    actionTimestamp = 0,
    isSaving = false,
    className = '',
}) => {
    const [overrideMascot, setOverrideMascot] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Preload the 4 core lottie files into browser cache on mount
    useEffect(() => {
        Object.values(MASCOT_ASSETS).forEach((assetUrl) => {
            fetch(encodeURI(assetUrl)).catch(() => {});
        });
    }, []);

    // Handle Option Click reaction (Happy celebration for 1.5 seconds)
    useEffect(() => {
        if (actionTimestamp <= 0) return;

        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        // On Option Click: play happy mascot for 1.5s then revert to current Phase Idle
        if (lastAction === 'select') {
            setOverrideMascot(MASCOT_ASSETS.HAPPY);
            timerRef.current = setTimeout(() => {
                setOverrideMascot(null);
            }, 1500);
        }
        // Note: 'next' action does NOT trigger celebration (retains current Phase Idle)
    }, [actionTimestamp, lastAction]);

    // Compute active mascot asset based on the refined state machine
    const getActiveMascot = (): string => {
        // 1. Quiz Completion (Q9 final submission or saving)
        if (isSaving || lastAction === 'complete') {
            return MASCOT_ASSETS.WINNER;
        }

        // 2. Option Click Celebration (Temporary 1.5s override)
        if (overrideMascot) {
            return overrideMascot;
        }

        // 3. Phase 2 (Q6 to Q8 - steps 5..7): Advanced Idle (mascot with bird looking left)
        if (currentStep >= 5) {
            return MASCOT_ASSETS.BIRD;
        }

        // 4. Phase 1 (Q1 to Q5 - steps 0..4): Default Idle (watching left mascot looking left)
        return MASCOT_ASSETS.WATCHING_LEFT;
    };

    const activeMascot = getActiveMascot();
    const encodedMascotSrc = encodeURI(activeMascot);
    const isWinner = activeMascot === MASCOT_ASSETS.WINNER;

    return (
        <div className={`pointer-events-none relative flex flex-col items-center justify-center select-none ${className}`}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeMascot}
                    initial={{ opacity: 0, scale: isWinner ? 0.8 : 0.95 }}
                    animate={{ opacity: 1, scale: isWinner ? 1.1 : 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={
                        isWinner
                            ? { type: 'spring', stiffness: 200, damping: 14 }
                            : { opacity: { duration: 0.3 }, scale: { duration: 0.3 } }
                    }
                    className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-64 md:h-64 lg:w-[380px] lg:h-[380px] flex items-center justify-center drop-shadow-2xl"
                >
                    {/* Glowing background aura */}
                    <div
                        className={`absolute inset-4 rounded-full blur-3xl opacity-30 transition-colors duration-500 ${
                            isWinner
                                ? 'bg-amber-400 opacity-70 animate-pulse'
                                : currentStep >= 5
                                ? 'bg-cyan-400 opacity-40'
                                : 'bg-purple-500 opacity-30'
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
