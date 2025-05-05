import { useEffect } from 'react';
import './introOverlay.css';

/**
 * Speech bubble that appears once after the user has entered an ID.
 * It auto-dismisses after 4 s (or tap) and then notifies the parent
 * via onDone.   (The ghost itself now lives in <GhostIcon/>)
 */
export default function IntroOverlay({ onDone }) {
  /* auto-dismiss */
  useEffect(() => {
    const id = setTimeout(onDone, 8000);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div className="intro-cover" onClick={onDone}>
      <div className="bubble">Start creating your world with one word …</div>
    </div>
  );
}
