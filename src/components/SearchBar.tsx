import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { getSessionId } from '../utils/session';
import clsx from 'clsx';

interface SearchBarProps {
  personalities: string[];
  onMatch: (name: string) => void;
}

export function SearchBar({ personalities, onMatch }: SearchBarProps) {
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

      // Log to Supabase
      try {
        await supabase.from('search_logs').insert({
          query: lowerQuery,
          query_original: query.trim(),
          matched: false,
          session_id: getSessionId()
        });
      } catch (err) {
        console.error('Failed to log search:', err);
      }
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
    <div className="absolute top-[80px] left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 z-50 flex flex-col items-center pointer-events-auto">
      <div 
        className={clsx(
          "w-full flex items-center bg-[#0d0d17] border rounded-full px-4 py-3 transition-all duration-300",
          isFocused 
            ? "border-[#00f2ff]/80 shadow-[0_0_15px_rgba(0,242,255,0.4)] bg-[#0d0d17]/90" 
            : "border-white/20 shadow-lg bg-[#0d0d17]/80 backdrop-blur-md"
        )}
      >
        <Search size={18} className={isFocused ? "text-[#00f2ff]" : "text-white/50"} />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search a person or situation..."
          className="bg-transparent border-none outline-none text-white w-full ml-3 placeholder:text-white/30 text-sm font-medium"
        />
      </div>
      
      {/* Noted Message */}
      <div 
        className={clsx(
          "mt-3 text-center px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-[#00f2ff]/20 text-[#00f2ff] text-xs font-medium tracking-wide transition-all duration-300",
          notedMessage ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        )}
      >
        {notedMessage}
      </div>
    </div>
  );
}
