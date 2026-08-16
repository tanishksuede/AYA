import { Outlet, useLocation } from 'react-router-dom';
import { PwaHeader } from '../components/ui/PwaHeader';

export function AppLayout() {
    const location = useLocation();
    
    // Hide header on immersive game routes (e.g., when playing a story)
    const hideHeader = location.pathname.includes('/game/play') || 
                       location.pathname.includes('/game/intro') || 
                       location.pathname.includes('/game/report');

    return (
        <div className="flex flex-col min-h-screen bg-slate-950 text-white overflow-x-hidden">
            {/* Premium Neon PWA Header */}
            {!hideHeader && <PwaHeader />}
            {/* Main Content Area */}
            <main className="flex-1 relative">
                <Outlet />
            </main>
        </div>
    );
}
