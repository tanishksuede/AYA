import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { getSessionId } from '../utils/session';
import clsx from 'clsx';

interface SearchBarProps {
  personalities: string[];
  onMatch: (name: string) => void;
  onClose?: () => void;
}

export function SearchBar({ personalities, onMatch, onClose }: SearchBarProps) {
  const [inputValue, setInputValue] = useState('');
  const [notedMessage, setNotedMessage] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processSearch = async (query: string) => {
    if (!query.trim()) return;

    const lowerQuery = query.toLowerCase().trim();
    
    // Fuzzy match: case-insensitive partial match
    const matchedPersonality = personalities.find(p => 
      p.toLowerCase().includes(lowerQuery)
    );

    if (matchedPersonality) {
      onMatch(matchedPersonality);
      setNotedMessage(null);
    } else {
      // No match found
      setNotedMessage(`We don't have ${query.trim()} yet — but we've noted your request 👀`);
      
      // Clear message after 4 seconds
      if (messageTimer.current) clearTimeout(messageTimer.current);
      messageTimer.current = setTimeout(() => {
        setNotedMessage(null);
      }, 4000);
    }

    // Log to Supabase for ALL searches (matches and non-matches)
    try {
      await supabase.from('search_queries').insert({
        query_text: query.trim(),
        is_match: !!matchedPersonality,
        matched_personality: matchedPersonality || null,
        session_id: getSessionId()
      });
    } catch (err) {
      console.error('Failed to log search:', err);
    }
  };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    if (inputValue.trim()) {
      debounceTimer.current = setTimeout(() => {
        processSearch(inputValue);
      }, 800);
    } else {
      setNotedMessage(null);
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (messageTimer.current) clearTimeout(messageTimer.current);
    };
  }, [inputValue, personalities]); // Run effect when input changes

  return (
    <div className="w-full relative z-50 flex flex-col items-start pointer-events-auto animate-fade-in">
      <div 
        className={clsx(
          "w-full flex items-center px-2 py-1.5 transition-all duration-300 rounded-md border",
          isFocused 
            ? "bg-black/30 border-[#00f2ff]/30 shadow-inner" 
            : "bg-transparent border-transparent hover:bg-white/5"
        )}
      >
        <Search size={16} className={isFocused ? "text-[#00f2ff]" : "text-white/50"} />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search..."
          className="bg-transparent border-none outline-none text-white w-full ml-2 placeholder:text-white/30 text-xs font-medium"
        />
        {onClose && (
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white ml-2 transition-colors focus:outline-none"
            aria-label="Close search"
          >
            <X size={16} />
          </button>
        )}
      </div>
      
      {/* Noted Message */}
      <div 
        className={clsx(
          "absolute top-full mt-2 left-0 w-full text-center px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-[#00f2ff]/20 text-[#00f2ff] text-xs font-medium tracking-wide transition-all duration-300",
          notedMessage ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        )}
      >
        {notedMessage}
      </div>
    </div>
  );
}
