import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { audioManager as audioSynth } from "../utils/audioManager";
import { bgmManager } from '../utils/bgmManager';
import { Volume2, VolumeX, Bell } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../utils/supabase';
import { subscribeUserToPush } from '../utils/pushNotifications';

export function SettingsPage() {
    const navigate = useNavigate();
    const [newAge, setNewAge] = useState(18);

    const profile = useUserStore((state) => state.profile);
    const setProfile = useUserStore((state) => state.setProfile);
    const resetProgress = useUserStore((state) => state.resetProgress);

    const musicVolume = useUserStore((state) => state.musicVolume);
    const sfxVolume = useUserStore((state) => state.sfxVolume);
    const isMusicMuted = useUserStore((state) => state.isMusicMuted);
    const isSfxMuted = useUserStore((state) => state.isSfxMuted);
    const isNarrationMuted = useUserStore((state) => state.isNarrationMuted);
    const setMusicVolume = useUserStore((state) => state.setMusicVolume);
    const setSfxVolume = useUserStore((state) => state.setSfxVolume);
    const toggleMusicMute = useUserStore((state) => state.toggleMusicMute);
    const toggleSfxMute = useUserStore((state) => state.toggleSfxMute);
    const toggleNarrationMute = useUserStore((state) => state.toggleNarrationMute);

    useEffect(() => {
        if (profile?.age) {
            setNewAge(profile.age);
        }
    }, [profile]);

    // Live sync audio while in settings
    useEffect(() => {
        bgmManager.setVolume(isMusicMuted ? 0 : musicVolume);
        audioSynth.setMusicVolume(isMusicMuted ? 0 : musicVolume);
    }, [musicVolume, isMusicMuted]);

    useEffect(() => {
        audioSynth.setSfxVolume(isSfxMuted ? 0 : sfxVolume);
    }, [sfxVolume, isSfxMuted]);

    const handleAgeSave = async () => {
        if (profile) {
            setProfile({ ...profile, age: newAge });
            try {
                const { supabase } = await import('../utils/supabase');
                await supabase.from('users').update({ age: newAge }).eq('id', profile.id);
            } catch (err) {
                console.error("Failed to update age in Supabase", err);
            }
            useUserStore.getState().syncLevels();
            navigate('/game');
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950 p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-sm w-full shadow-2xl relative">
                <h2 className="text-xl font-bold text-white mb-4 text-center">Settings</h2>
                <div className="space-y-6">
                    <div className="space-y-4 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-400 uppercase">Music</span>
                                <button
                                    onClick={() => { audioSynth.playClick(); toggleMusicMute(); }}
                                    className={clsx("p-1 rounded transition-colors", isMusicMuted ? "text-red-400 bg-red-900/30" : "text-green-400 bg-green-900/30")}
                                >
                                    {isMusicMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </button>
                            </div>
                            <input
                                type="range"
                                min="0" max="1" step="0.1"
                                value={musicVolume}
                                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-400 uppercase">Sound FX</span>
                                <button
                                    onClick={() => { audioSynth.playClick(); toggleSfxMute(); }}
                                    className={clsx("p-1 rounded transition-colors", isSfxMuted ? "text-red-400 bg-red-900/30" : "text-green-400 bg-green-900/30")}
                                >
                                    {isSfxMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </button>
                            </div>
                            <input
                                type="range"
                                min="0" max="1" step="0.1"
                                value={sfxVolume}
                                onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>
                        <div className="pt-2 border-t border-slate-700">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase">Voice Narration</span>
                                <button
                                    onClick={() => { audioSynth.playClick(); toggleNarrationMute(); }}
                                    className={clsx("p-1 px-3 text-xs font-bold rounded transition-colors uppercase tracking-widest", isNarrationMuted ? "text-red-400 bg-red-900/30" : "text-[#00f1fe] bg-[#00f1fe]/20")}
                                >
                                    {isNarrationMuted ? 'Muted' : 'Enabled'}
                                </button>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-slate-700">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase">Push Notifications</span>
                                <button
                                    id="test-push-btn"
                                    onClick={async () => {
                                        audioSynth.playClick();
                                        const btn = document.getElementById('test-push-btn');
                                        const statusEl = document.getElementById('push-status');
                                        if (btn) btn.textContent = '⏳ Registering...';
                                        
                                        const sub = await subscribeUserToPush();
                                        
                                        if (sub) {
                                            if (btn) btn.textContent = '✅ Registered!';
                                            if (statusEl) {
                                                statusEl.textContent = '✅ Device registered & notification sent!';
                                                statusEl.className = 'text-xs text-emerald-400 mt-2 font-bold';
                                            }
                                        } else {
                                            if (btn) btn.textContent = '❌ Failed';
                                            if (statusEl) {
                                                statusEl.textContent = '❌ Registration failed. Check browser permissions.';
                                                statusEl.className = 'text-xs text-red-400 mt-2 font-bold';
                                            }
                                        }
                                        
                                        setTimeout(() => {
                                            if (btn) btn.textContent = '🔔 Test Push';
                                        }, 3000);
                                    }}
                                    className="p-1 px-3 text-xs font-bold rounded transition-colors uppercase tracking-widest bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 flex items-center gap-1"
                                >
                                    <Bell size={12} /> Test Push
                                </button>
                            </div>
                            <p id="push-status" className="text-xs text-slate-500 mt-2">Tap "Test Push" to register this device for broadcasts.</p>
                        </div>
                    </div>

                    <hr className="border-slate-700" />

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Age</label>
                        <input
                            type="number"
                            value={newAge}
                            onChange={(e) => setNewAge(parseInt(e.target.value))}
                            className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 border border-slate-700 font-mono"
                        />
                    </div>
                    <button onClick={() => { audioSynth.playClick(); handleAgeSave(); }} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all">
                        UPDATE TIMELINE
                    </button>

                    <hr className="border-slate-700 my-2" />

                    <button
                        onClick={() => { audioSynth.playClick(); resetProgress(); }}
                        className="w-full bg-slate-800 hover:bg-red-900/50 text-red-400 hover:text-red-200 border border-slate-700 hover:border-red-800 font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all uppercase tracking-wider text-xs"
                    >
                        Restart Journey (Reset)
                    </button>

                    <button
                        onClick={async () => {
                            audioSynth.playClick();
                            await supabase.auth.signOut();
                            localStorage.clear();
                            sessionStorage.clear();
                            window.location.href = '/';
                        }}
                        className="w-full bg-slate-800 hover:bg-orange-900/50 text-orange-400 hover:text-orange-200 border border-slate-700 hover:border-orange-800 font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all uppercase tracking-wider text-xs"
                    >
                        Sign Out
                    </button>

                    <button onClick={() => { audioSynth.playBack(); navigate(-1); }} className="w-full text-slate-500 text-sm py-2 hover:text-white transition-colors">
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
}
