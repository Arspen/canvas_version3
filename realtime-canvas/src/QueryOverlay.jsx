/*  src/components/QueryOverlay.jsx
    ---------------------------------------------------------------
    Full component that shows the “ghost” with the query, then
    (on tap) opens a centred modal to answer or decline.
------------------------------------------------------------------ */
import { useState } from 'react';
import './queryOverlay.css';

/**
 * @param {Object}   q        { _id, question }
 * @param {Function} onClose  (answerText|null, declined:boolean) → void
 */
export default function QueryOverlay({ q, onClose }) {
  const [open,   setOpen]   = useState(false);  // textarea modal open?
  const [answer, setAnswer] = useState('');

  /** helper to send result & close */
  const submit = (ans, declined = false) => {
    onClose(declined ? null : ans, declined);
  };

  return (
    /* cover fills viewport, darkens BG, Ghost + bubble inside */
    <div className="q-cover" onClick={() => setOpen(true)}>
      {/* ghost icon (top-left) */}
      <img className="ghost" src="/icons/Shadow.png" alt="" />

      {/* speech bubble with the question */}
      <div
        className="bubble"
        onClick={e => {
          e.stopPropagation();       // don’t close by bubbling
          setOpen(true);
        }}
      >
        {q.question}
      </div>

      {/* answer modal – only when ‘open’ */}
      {open && (
        <div
          className="modal"
          onClick={e => e.stopPropagation()}     /* stay open */
        >
          <textarea
            autoFocus
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Your answer…"
          />
          <div className="btn-row">
            <button onClick={() => submit(answer, false)}>Answer</button>
            <button onClick={() => submit(null,   true)}>Decline</button>
          </div>
        </div>
      )}
    </div>
  );
}
