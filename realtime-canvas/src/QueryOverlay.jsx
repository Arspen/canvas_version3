/* ----------------------------------------------
   QueryOverlay – shows ghost + bubble.
   – Tap the bubble ➜ opens centred answer box.
   – “Answer”   : calls onClose(answerText, false)
   – “Decline”  : calls onClose(null,        true)
   ------------------------------------------------ */
   import { useState } from 'react';
   import './queryOverlay.css';   // keep the same stylesheet!
   
   export default function QueryOverlay({ q, onClose }) {
     const [showModal, setShowModal] = useState(false);
     const [text,      setText]      = useState('');
   
     /* ----- helpers ----- */
     const close = (ans, declined) => {
       setShowModal(false);
       setText('');
       onClose(ans, declined);          // notify parent
     };
   
     return (
       <div className="q-cover">
         {/* ghost top-left */}
         <img className="ghost" src="/icons/Shadow.png" alt="" />
   
         {/* speech bubble – tap to answer */}
         <div
           className="bubble"
           onClick={() => setShowModal(true)}
         >
           {q.question}
         </div>
   
         {/* modal opens only after tap */}
         {showModal && (
           <div className="modal" onClick={e => e.stopPropagation()}>
             <textarea
               autoFocus
               rows={3}
               value={text}
               placeholder="Type your reply…"
               onChange={e => setText(e.target.value)}
             />
   
             <div className="btn-row">
               <button
                 disabled={!text.trim()}
                 onClick={() => close(text.trim(), false)}
               >
                 Answer
               </button>
   
               <button onClick={() => close(null, true)}>
                 Decline
               </button>
             </div>
           </div>
         )}
       </div>
     );
   }
   