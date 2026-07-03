import os
import re

file_path = r"c:\AYA-master\src\components\game\SolarMap.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';", "import { motion, useScroll, useSpring, useTransform } from 'framer-motion';")

new_top = '''import { supabase } from '../../utils/supabase';

// Using Canvas with preloaded JPEG sequence (optimized to 60 frames)
const FRAME_CACHE: HTMLImageElement[] = [];
let framesLoadedCount = 0;
'''
content = content.replace("import { supabase } from '../../utils/supabase';\n\n// Using HTML5 Video scrubbing for map background\n", new_top)

old_state = '''    // Scroll refs and values
    const containerRef = useRef<HTMLDivElement>(null);
    const backgroundVideoRef = useRef<HTMLVideoElement>(null);
    const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
    
    // Scroll container height = lastNodePosition + viewport height
    const lastNodePosition = ageLevels.length > 0 ? getPosition(ageLevels.length - 1).y : 0;
    const totalHeight = lastNodePosition + windowHeight;

    const [canvasReady, setCanvasReady] = useState(false);
    const [framesLoaded, setFramesLoaded] = useState(0);
    const currentFrameIdx = useRef<number>(0);'''

new_state = '''    // Scroll refs and values
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
    
    // Scroll container height = lastNodePosition + viewport height
    const lastNodePosition = ageLevels.length > 0 ? getPosition(ageLevels.length - 1).y : 0;
    const totalHeight = lastNodePosition + windowHeight;

    const [canvasReady, setCanvasReady] = useState(framesLoadedCount === 60);'''

content = content.replace(old_state, new_state)

old_scroll = '''    const scrollYProgress = useMotionValue(0);'''
new_scroll = '''    const { scrollYProgress } = useScroll({ container: containerRef });'''
content = content.replace(old_scroll, new_scroll)

old_effects = '''    // Video scrubbing initialization (no frames to load anymore)
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
    }, [canvasReady, isVideoFinished, setIntroVideoCompleted]);'''

new_effects = '''    // Preload 60 JPEG frames
    useEffect(() => {
        if (FRAME_CACHE.length === 60) {
            setCanvasReady(true);
            return;
        }

        let loaded = 0;
        for (let i = 0; i < 60; i++) {
            const frameIndex = 1 + (i * 4); // 001, 005, 009...
            const src = /assets/map_frames_dark/ezgif-frame-.jpg;
            const img = new Image();
            img.src = src;
            img.onload = () => {
                loaded++;
                if (loaded === 60) {
                    framesLoadedCount = 60;
                    setCanvasReady(true);
                }
            };
            FRAME_CACHE.push(img);
        }
    }, []);

    // Effect to handle total readiness
    useEffect(() => {
        if (canvasReady && isVideoFinished) {
            setIsReady(true);
            setIntroVideoCompleted(true);
            audioSynth.playStartup();
        }
    }, [canvasReady, isVideoFinished, setIntroVideoCompleted]);'''

content = content.replace(old_effects, new_effects)

old_parallax_start = content[content.find('    // Custom Scroll Parallax Effect (Native Wheel/Touch with Lerp)'):content.find('    useEffect(() => {\n        audioSynth.playStartup();\n    }, [ageLevels.length]);')]

new_parallax = '''    // Canvas Drawing rAF Loop
    useEffect(() => {
        if (!canvasReady) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let animationFrameId: number;
        let lastProgress = -1;
        let lastWidth = -1;
        let lastHeight = -1;
        let soundTimeout: any;

        const tick = () => {
            if (document.hidden) {
                animationFrameId = requestAnimationFrame(tick);
                return;
            }

            const current = scrollYProgress.get();
            const w = window.innerWidth;
            const h = window.innerHeight;
            
            if (current !== lastProgress || w !== lastWidth || h !== lastHeight) {
                // Audio glide
                if (lastProgress !== -1) {
                    const delta = Math.abs((current - lastProgress) * 480);
                    if (delta > 0.5) {
                        audioSynth.startGlide();
                        audioSynth.updateGlide(delta * 5);
                        clearTimeout(soundTimeout);
                        soundTimeout = setTimeout(() => {
                            audioSynth.stopGlide();
                        }, 100);
                    }
                }
                
                const index = Math.min(59, Math.max(0, Math.floor(current * 59)));
                const img = FRAME_CACHE[index];
                
                if (img) {
                    if (canvas.width !== w) canvas.width = w;
                    if (canvas.height !== h) canvas.height = h;
                    
                    const scale = Math.max(w / img.width, h / img.height);
                    const x = (w / 2) - (img.width / 2) * scale;
                    const y = (h / 2) - (img.height / 2) * scale;
                    
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                    
                    lastProgress = current;
                    lastWidth = w;
                    lastHeight = h;
                }
            }
            
            animationFrameId = requestAnimationFrame(tick);
        };

        animationFrameId = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(animationFrameId);
            clearTimeout(soundTimeout);
        };
    }, [canvasReady, scrollYProgress]);

'''

content = content.replace(old_parallax_start, new_parallax)

old_markup = '''            {/* Scrollable Map */}
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
                <div className="fixed inset-0 bg-gradient-to-t from-[#0a0510]/80 via-transparent to-slate-900/50 mix-blend-overlay pointer-events-none z-10" />'''

new_markup = '''            {/* Scrollable Map */}
            <div 
                ref={containerRef} 
                className="relative h-[100dvh] w-full bg-[#0a0510] text-white overflow-y-auto overflow-x-hidden selection:bg-[#FFB347] selection:text-[#4a2e00] font-sans"
                style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'auto' }}
            >
                {/* Dummy div to enforce native scroll height */}
                <div style={{ height: totalHeight, width: '100%' }} />
            
                {/* LAYER 1: Canvas Background */}
                <div className="fixed inset-0 z-0 pointer-events-none bg-black">
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full object-cover"
                    />
                </div>
                
                <div className="fixed inset-0 bg-gradient-to-t from-[#0a0510]/80 via-transparent to-slate-900/50 mix-blend-overlay pointer-events-none z-10" />'''

content = content.replace(old_markup, new_markup)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
