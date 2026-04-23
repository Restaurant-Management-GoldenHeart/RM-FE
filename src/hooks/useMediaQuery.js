import { useState, useEffect } from 'react';

/**
 * useMediaQuery Hook
 * 
 * @param {string} query CSS media query (e.g., '(max-width: 768px)')
 * @returns {boolean} Whether the query matches the current viewport
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}
