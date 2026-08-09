import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export const STREAMLINED_MASCOT_ASSETS = {
    IDLE: '/assets/Macot/watching left mascot.lottie',
    THINKING: '/assets/Macot/mascot with bird.lottie',
    ADVANCING: '/assets/Macot/happy mascot.lottie',
    COMPLETION: '/assets/Macot/Winner mascot.lottie',
} as const;

export type MascotAction = 'none' | 'select' | 'deselect' | 'next' | 'complete';

export interface MascotQuizGuideProps {
    currentStep: number; // 0-indexed (0 to 8 for Q1 to Q9)
    lastAction?: MascotAction;
    actionTimestamp?: number;
    hasSelection?: boolean;
    isSaving?: boolean;
    className?: string;
}

export const MascotQuizGuide: React.FC<MascotQuizGuideProps> = ({
    currentStep,
    lastAction = 'none',
    actionTimestamp = 0,
    hasSelection = false,
    isSaving = false,
    className = '',
}) => {
    const [overrideMascot, setOverrideMascot] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Preload the 4 streamlined dotLottie files into browser cache on mount
    useEffect(() => {
        Object.values(STREAMLINED_MASCOT_ASSETS).forEach((assetUrl) => {
            fetch(encodeURI(assetUrl)).catch(() => {});
        });
    }, []);

    // Handle "NEXT" button click reaction (Advancing for 1.5 seconds)
    useEffect(() => {
        if (actionTimestamp <= 0) return;

        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (lastAction === 'next') {
            setOverrideMascot(STREAMLINED_MASCOT_ASSETS.ADVANCING);
            timerRef.current = setTimeout(() => {
                setOverrideMascot(null);
            }, 1500);
        }
    }, [actionTimestamp, lastAction]);

    // Compute active mascot asset based on the 4 core states
    const getActiveMascot = (): string => {
        // 1. Completion State (Q9 final submission or saving)
        if (isSaving || lastAction === 'complete' || (currentStep === 8 && lastAction === 'next')) {
            return STREAMLINED_MASCOT_ASSETS.COMPLETION;
        }

        // 2. Advancing State (Triggered for 1.5s on NEXT click)
        if (overrideMascot) {
            return overrideMascot;
        }

        // 3. Thinking / Interacting State (Option selected)
        if (hasSelection) {
            return STREAMLINED_MASCOT_ASSETS.THINKING;
        }

        // 4. Default / Idle State (Looking left at quiz card)
        return STREAMLINED_MASCOT_ASSETS.IDLE;
    };

    const activeMascot = getActiveMascot();
    const encodedMascotSrc = encodeURI(activeMascot);
    const isWinner = activeMascot === STREAMLINED_MASCOT_ASSETS.COMPLETION;

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
                    className="relative w-64 h-64 md:w-80 md:h-80 lg:w-[380px] lg:h-[380px] flex items-center justify-center drop-shadow-2xl"
                >
                    {/* Glowing background aura */}
                    <div
                        className={`absolute inset-4 rounded-full blur-3xl opacity-30 transition-colors duration-500 ${
                            isWinner
                                ? 'bg-amber-400 opacity-70 animate-pulse'
                                : hasSelection
                                ? 'bg-cyan-400 opacity-50'
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
