import { useEffect } from 'react';
import './introOverlay.css';

/** Speech bubble that shows once, then fades. */
export default function IntroOverlay({ onDone }) {
  /* auto-dismiss after 4 s */
  useEffect(() => {
    const id = setTimeout(onDone, 12000);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    /* just the bubble – no full-screen shim */
    <div className="intro-bubble" onClick={onDone}>
      Start creating your world with one word …
    </div>
  );
}
