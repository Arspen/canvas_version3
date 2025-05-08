import { useState } from 'react';
import './queryOverlay.css';     // bubble + modal

export default function QueryOverlay({ q, onClose }){
  const [answer,setAnswer]=useState('');

  const reply = declined => {
    onClose(declined? null : answer, declined);
    setAnswer('');
  };

  return(
    <div className="q-cover" onClick={()=>reply(false)}>
      <img className="ghost" src="/icons/Shadow.png" alt=""/>
      <div className="bubble">{q.question}</div>

      {/* modal when tapping the bubble */}
      <div className="modal">
        <textarea value={answer} onChange={e=>setAnswer(e.target.value)}
                  placeholder="Your answer…"/>
        <button onClick={()=>reply(false)}>Answer</button>
        <button onClick={()=>reply(true)}>Decline</button>
      </div>
    </div>
  );
}
