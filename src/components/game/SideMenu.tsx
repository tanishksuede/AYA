import { useState } from 'react';
import { Menu, X, Settings, Sun, Moon, Volume2, VolumeX, BookOpen } from 'lucide-react';
import clsx from 'clsx';
import { VibeSpinnerButton } from '../MoodWheel/VibeSpinnerButton';

interface SideMenuProps {
    isCandyMode: boolean;
    isAdmin: boolean;
    isBgmEnabled: boolean;
    profile: any;
    audioSynth: any;
    bgmManager: any;
    navigate: (path: string) => void;
    setIsBgmEnabled: (enabled: boolean) => void;
    onOpenDnaProfile: () => void;
}

export function SideMenu({
    isCandyMode,
    isAdmin,
    isBgmEnabled,
    profile,
    audioSynth,
    bgmManager,
    navigate,
    setIsBgmEnabled,
    onOpenDnaProfile
}: SideMenuProps) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => {
        audioSynth.playClick();
        setIsOpen(!isOpen);
    };

    return (
        <div className="absolute top-20 right-4 md:top-24 md:right-6 z-[110] flex flex-col items-end pointer-events-none">
            {/* Hamburger Button */}
            <button
                onClick={toggleMenu}
                className={clsx(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg pointer-events-auto",
                    isCandyMode
                        ? "bg-amber-400 text-slate-900 border-2 border-amber-300 hover:scale-105 active:scale-95"
                        : "bg-slate-800 text-[#00f2ff] border-2 border-[#00f2ff]/30 hover:shadow-[0_0_15px_rgba(0,242,255,0.4)] hover:scale-105 active:scale-95"
                )}
                aria-label="Toggle Menu"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sliding Panel */}
            <div
                className={clsx(
                    "fixed top-0 right-0 h-[100dvh] w-72 sm:w-80 transition-transform duration-300 ease-in-out pointer-events-auto flex flex-col pt-24 px-6 gap-6 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]",
                    isOpen ? "translate-x-0" : "translate-x-full",
                    isCandyMode 
                        ? "bg-white/95 backdrop-blur-xl border-l border-white/40 text-slate-800"
                        : "bg-slate-900/95 backdrop-blur-xl border-l border-[#00f2ff]/20 text-white"
                )}
            >
                {/* Vibe Spinner */}
                <div className="w-full flex justify-center origin-top mt-10">
                    <VibeSpinnerButton
                        streak={profile?.current_streak || 0}
                        completed={!!profile?.daily_challenge_completed}
                        userId={profile?.id || ''}
                        onClick={() => {
                            audioSynth.playClick();
                            navigate('/game/mood');
                            setIsOpen(false);
                        }}
                    />
                </div>

                <div className="flex flex-col gap-4 mt-2">
                    {/* Journal */}
                    <button
                        onClick={() => {
                            audioSynth.playClick();
                            navigate('/game/journal');
                            setIsOpen(false);
                        }}
                        className={clsx(
                            "flex items-center gap-4 p-3 rounded-2xl transition-all border shadow-md",
                            isCandyMode
                                ? "bg-pink-50 border-pink-200 hover:border-pink-400"
                                : "bg-slate-800/80 border-amber-600/30 hover:border-amber-400/80"
                        )}
                    >
                        <div className={clsx(
                            "p-2 rounded-xl text-white shadow-inner",
                            isCandyMode ? "bg-pink-500" : "bg-gradient-to-br from-amber-400 to-amber-600"
                        )}>
                            <BookOpen size={20} className="stroke-[2.5]" />
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                            <span className={clsx("text-[10px] font-bold uppercase tracking-wider", isCandyMode ? "text-pink-400" : "text-amber-500/80")}>My Wisdom</span>
                            <span className={clsx("text-base font-black uppercase tracking-wide", isCandyMode ? "text-pink-600" : "text-amber-400")}>Journal</span>
                        </div>
                    </button>

                    {/* DNA Data */}
                    <button
                        onClick={() => {
                            audioSynth.playClick();
                            onOpenDnaProfile();
                            setIsOpen(false);
                        }}
                        className={clsx(
                            "flex items-center gap-4 p-3 rounded-2xl transition-all border shadow-md",
                            isCandyMode
                                ? "bg-purple-50 border-purple-200 hover:border-purple-400"
                                : "bg-slate-800/80 border-[#00f2ff]/30 hover:border-[#00f2ff]/70"
                        )}
                    >
                        <div className={clsx(
                            "p-2 rounded-xl text-white shadow-inner text-xl leading-none flex items-center justify-center",
                            isCandyMode ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-gradient-to-r from-[#00f2ff] to-[#d575ff]"
                        )}>
                            🧬
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                            <span className={clsx("text-[10px] font-bold uppercase tracking-wider", isCandyMode ? "text-purple-400" : "text-[#00f2ff]/80")}>Profile</span>
                            <span className={clsx("text-base font-black uppercase tracking-wide", isCandyMode ? "text-purple-600" : "text-[#99f7ff]")}>DNA Data</span>
                        </div>
                    </button>
                </div>

                {/* Grid for Smaller Settings */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                    {/* BGM Toggle */}
                    <button
                        onClick={() => {
                            audioSynth.playClick();
                            bgmManager.toggle();
                            setIsBgmEnabled(bgmManager.enabled);
                        }}
                        className={clsx(
                            "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all border shadow-sm",
                            isCandyMode
                                ? "bg-white/60 border-slate-200 hover:bg-white"
                                : "bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 text-indigo-200"
                        )}
                    >
                        {isBgmEnabled ? <Volume2 size={24} className={isCandyMode ? "text-slate-600" : "text-indigo-400"} /> : <VolumeX size={24} className="text-slate-400" />}
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">BGM</span>
                    </button>

                    {/* Theme Toggle */}
                    <button
                        onClick={() => {
                            audioSynth.playClick();
                            navigate('/game/theme');
                            setIsOpen(false);
                        }}
                        className={clsx(
                            "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all border shadow-sm",
                            isCandyMode
                                ? "bg-white/60 border-slate-200 hover:bg-white"
                                : "bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 text-indigo-200"
                        )}
                    >
                        {isCandyMode ? <Sun size={24} className="text-amber-500" /> : <Moon size={24} className="text-indigo-400" />}
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Theme</span>
                    </button>
                    
                    {/* Settings */}
                    <button
                        onClick={() => {
                            audioSynth.playClick();
                            navigate('/game/settings');
                            setIsOpen(false);
                        }}
                        className={clsx(
                            "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all border shadow-sm",
                            isCandyMode
                                ? "bg-white/60 border-slate-200 hover:bg-white"
                                : "bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 text-indigo-200"
                        )}
                    >
                        <Settings size={24} className="opacity-80" />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Settings</span>
                    </button>

                    {/* Admin */}
                    {isAdmin && (
                        <button
                            onClick={() => {
                                audioSynth.playClick();
                                navigate('/game/admin');
                                setIsOpen(false);
                            }}
                            className={clsx(
                                "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all border shadow-sm",
                                isCandyMode
                                    ? "bg-fuchsia-100 border-fuchsia-200 hover:bg-fuchsia-200 text-fuchsia-700"
                                    : "bg-fuchsia-900/30 border-fuchsia-500/30 hover:bg-fuchsia-900/60 text-fuchsia-300"
                            )}
                        >
                            <span className="text-xl">👑</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Admin</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
