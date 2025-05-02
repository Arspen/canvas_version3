import { useEffect } from 'react';
import './introOverlay.css';

/**
 * Appears once (after the user ID dialog), shows a ghost and a
 * speech-bubble, then fades away automatically (or on tap).
 *
 * props:
 *   onDone()  – called when the overlay disappears
 */
export default function IntroOverlay({ onDone }) {
  // auto-dismiss after 4 s
  useEffect(() => {
    const id = setTimeout(onDone, 4000);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div className="intro-cover" onClick={onDone}>
      <img className="ghost" src="/icons/Shadow.png" alt="" />
      <div className="bubble">It starts with a word …</div>
    </div>
  );
}
