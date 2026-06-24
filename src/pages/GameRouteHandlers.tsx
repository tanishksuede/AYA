import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { LevelMap } from '../components/game/LevelMap';
import { PersonalityIntro } from '../components/game/PersonalityIntro';
import { ScenarioGame } from '../components/game/ScenarioGame';
import { MatchReport } from '../components/game/MatchReport';
import { DnaProfile } from '../components/game/DnaProfile';
import { CharacterSelection } from '../components/game/CharacterSelection';

export function MapRouteHandler() {
    const navigate = useNavigate();
    return (
        <LevelMap 
            onPlayLevel={(level) => navigate(`/game/intro/${level.id}`)} 
            onOpenDnaProfile={() => navigate('/game/dna')}
        />
    );
}

export function IntroRouteHandler() {
    const { id } = useParams();
    const navigate = useNavigate();
    const levels = useUserStore((state) => state.levels);
    
    const level = levels.find((l) => l.id === id);
    if (!level) return <Navigate to="/game" replace />;

    return (
        <PersonalityIntro 
            level={level} 
            onStart={() => navigate(`/game/play/${level.id}`)} 
            onBack={() => navigate('/game')} 
        />
    );
}

export function PlayRouteHandler() {
    const { id } = useParams();
    const navigate = useNavigate();
    const levels = useUserStore((state) => state.levels);
    const completeLevel = useUserStore((state) => state.completeLevel);
    const unlockLevel = useUserStore((state) => state.unlockLevel);
    const setPendingStreakData = useUserStore((state) => state.setPendingStreakData);
    
    const level = levels.find((l) => l.id === id);
    if (!level) return <Navigate to="/game" replace />;

    const handleComplete = (stars: number) => {
        completeLevel(level.id, stars);
        const currentIndex = levels.findIndex(l => l.id === level.id);
        if (currentIndex !== -1 && currentIndex < levels.length - 1) {
            unlockLevel(levels[currentIndex + 1].id);
        }
        navigate(`/game/report/${level.id}`);
    };

    return (
        <ScenarioGame 
            level={level} 
            onComplete={handleComplete} 
            onBack={() => navigate('/game')} 
            onDailyChallengeComplete={setPendingStreakData} 
        />
    );
}

export function ReportRouteHandler() {
    const { id } = useParams();
    const navigate = useNavigate();
    const levels = useUserStore((state) => state.levels);
    const profile = useUserStore((state) => state.profile);
    
    const level = levels.find((l) => l.id === id);
    if (!level || !profile) return <Navigate to="/game" replace />;

    return (
        <MatchReport
            userTraits={profile.traits}
            userProfile={profile.psychologicalProfile}
            idolTraits={level.idolTraits || { discipline: 50, resilience: 50, risk: 50, leadership: 50, creativity: 50, empathy: 50, vision: 50 }}
            idolName={level.personality || level.archetype}
            onClose={() => navigate('/game')}
        />
    );
}

export function DnaRouteHandler() {
    const navigate = useNavigate();
    const profile = useUserStore((state) => state.profile);
    if (!profile) return <Navigate to="/game" replace />;

    return <DnaProfile onBack={() => navigate('/game')} />;
}

export function SelectionRouteHandler() {
    const { age } = useParams();
    const navigate = useNavigate();
    const levels = useUserStore((state) => state.levels);
    
    if (!age) return <Navigate to="/game" replace />;
    const activeAge = parseInt(age, 10);
    
    return (
        <CharacterSelection 
            age={activeAge}
            options={levels.filter(l => l.age === activeAge)}
            onSelect={(level) => navigate(`/game/intro/${level.id}`)}
            onBack={() => navigate('/game')}
        />
    );
}
