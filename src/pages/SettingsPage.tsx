import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { audioManager as audioSynth } from "../utils/audioManager";
import { bgmManager } from '../utils/bgmManager';
import { Volume2, VolumeX } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../utils/supabase';
import { useUsernameAvailability } from '../hooks/useUsernameAvailability';
import { UsernameField } from '../components/game/UsernameField';

export function SettingsPage() {
    const navigate = useNavigate();
    const [newAge, setNewAge] = useState(18);
    const [newPreferredMap, setNewPreferredMap] = useState('standard');
    const [usernameInput, setUsernameInput] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [usernameSuccess, setUsernameSuccess] = useState('');
    const [isSavingUsername, setIsSavingUsername] = useState(false);

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

    const appLanguage = useUserStore((state) => state.appLanguage);
    const setAppLanguage = useUserStore((state) => state.setAppLanguage);

    // Username availability — pass profile.id so the user's own current name
    // is not reported as "taken" when they re-type it.
    const usernameAvailability = useUsernameAvailability(
        usernameInput,
        profile?.id ?? null
    );

    useEffect(() => {
        if (profile) {
            if (profile.age) setNewAge(profile.age);
            if (profile.preferred_map) setNewPreferredMap(profile.preferred_map);
            // Initialise the username field with the stored value, if any.
            setUsernameInput(profile.username ?? '');
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

    const handleSave = async () => {
        if (profile) {
            setProfile({ ...profile, age: newAge, preferred_map: newPreferredMap });
            try {
                await supabase.from('users').update({ 
                    age: newAge,
                    preferred_map: newPreferredMap
                }).eq('id', profile.id);
            } catch (err) {
                console.error("Failed to update profile in Supabase", err);
            }
            useUserStore.getState().syncLevels();
            navigate('/game');
        }
    };

    const handleSaveUsername = async () => {
        if (!profile?.id) return;
        const trimmed = usernameInput.trim();

        if (!trimmed) {
            setUsernameError('Please enter a username.');
            return;
        }

        if (trimmed === (profile.username ?? '')) {
            return;
        }

        if (usernameAvailability.status !== 'available') {
            setUsernameError(
                usernameAvailability.errorMessage ||
                'Please wait for the availability check to finish, or choose a different username.'
            );
            return;
        }

        setIsSavingUsername(true);
        setUsernameError('');
        setUsernameSuccess('');

        try {
            const { data: updatedRows, error: updateError } = await supabase
                .from('users')
                .update({ username: trimmed })
                .eq('id', profile.id)
                .select();

            if (updateError) {
                // Race condition / unique constraint violation
                if (updateError.code === '23505') {
                    setUsernameError('Username is already taken. Please choose another.');
                } else {
                    setUsernameError(`Failed to save username: ${updateError.message}`);
                }
                return;
            }

            // If 0 rows updated, user ID was not found in Supabase (local-only account)
            if (!updatedRows || updatedRows.length === 0) {
                const { data: upsertRows, error: upsertError } = await supabase
                    .from('users')
                    .upsert({
                        id: profile.id,
                        name: profile.name || 'User',
                        age: profile.age || 20,
                        mobile: profile.mobile || `local_${profile.id.slice(0, 8)}`,
                        username: trimmed,
                        access_type: profile.access_type || 'open',
                        access_start_date: profile.access_start_date || new Date().toISOString().split('T')[0],
                    })
                    .select();

                if (upsertError) {
                    if (upsertError.code === '23505') {
                        setUsernameError('Username is already taken. Please choose another.');
                    } else {
                        setUsernameError(`Database error: ${upsertError.message}`);
                    }
                    return;
                }

                if (!upsertRows || upsertRows.length === 0) {
                    setUsernameError('Unable to persist username to database.');
                    return;
                }
            }

            // Success — update local store so DnaProfile, PwaHeader, SideMenu reflect change immediately
            setProfile({ ...profile, username: trimmed });
            setUsernameSuccess('Username updated successfully!');
            setTimeout(() => setUsernameSuccess(''), 3000);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unexpected error';
            setUsernameError(`Error: ${message}`);
        } finally {
            setIsSavingUsername(false);
        }
    };

    // Whether the username save button should be active
    const isUsernameChanged = usernameInput.trim() !== (profile?.username ?? '');
    const canSaveUsername =
        !!profile?.id &&
        isUsernameChanged &&
        usernameInput.trim() !== '' &&
        usernameAvailability.status === 'available' &&
        !isSavingUsername;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950 p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-sm w-full shadow-2xl relative max-h-[90vh] overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`::-webkit-scrollbar { display: none; }`}</style>
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
                    </div>

                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase">Language</span>
                            <div className="flex bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                                <button
                                    onClick={() => { audioSynth.playClick(); setAppLanguage('en'); }}
                                    className={clsx("px-3 py-1 text-xs font-bold uppercase transition-colors", appLanguage === 'en' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white")}
                                >
                                    English
                                </button>
                                <button
                                    onClick={() => { audioSynth.playClick(); setAppLanguage('hi'); }}
                                    className={clsx("px-3 py-1 text-xs font-bold uppercase transition-colors", appLanguage === 'hi' ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white")}
                                >
                                    हिंदी
                                </button>
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-700" />

                    {/* Username Management Section */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">USERNAME</span>
                            <span className="text-xs text-[#00f1fe] font-mono font-bold">
                                {profile?.username ? `@${profile.username}` : '@choose_username'}
                            </span>
                        </div>

                        <UsernameField
                            label=""
                            value={usernameInput}
                            onChange={setUsernameInput}
                            status={isUsernameChanged ? usernameAvailability.status : 'idle'}
                            errorMessage={isUsernameChanged ? usernameAvailability.errorMessage : null}
                            disabled={isSavingUsername}
                        />

                        {usernameError && (
                            <p className="text-xs text-red-400 font-medium">{usernameError}</p>
                        )}

                        {usernameSuccess && (
                            <p className="text-xs text-emerald-400 font-bold">{usernameSuccess}</p>
                        )}

                        <button
                            onClick={handleSaveUsername}
                            disabled={!canSaveUsername}
                            className="w-full bg-[#00f1fe]/20 hover:bg-[#00f1fe]/30 text-[#00f1fe] border border-[#00f1fe]/40 font-bold py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                        >
                            {isSavingUsername ? 'Saving…' : (profile?.username ? 'Update Username' : 'Set Username')}
                        </button>
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
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preferred Exam Focus</label>
                        <select
                            value={newPreferredMap}
                            onChange={(e) => setNewPreferredMap(e.target.value)}
                            className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 border border-slate-700 focus:outline-none focus:border-[#00f1fe]"
                        >
                            <option value="standard">None (Standard)</option>
                            <option value="neet">NEET</option>
                            <option value="jee">JEE</option>
                            <option value="upsc">UPSC</option>
                        </select>
                    </div>
                    <button onClick={() => { audioSynth.playClick(); handleSave(); }} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all mt-4">
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
