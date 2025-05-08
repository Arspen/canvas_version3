import { useEffect, useState } from 'react';
import socket from '../../socket';
import './queryPanel.css';   // tiny styles (below)

export default function QueryPanel(){
  const [qs,      setQs]     = useState([]);
  const [filter,  setFilter] = useState('All');
  const [text,    setText]   = useState('');

  /* -------- live sockets -------- */
  useEffect(()=>{
    socket.emit('requestAllQueries');
    socket.on('allQueries',      setQs);
    socket.on('newQuery',   q  => setQs(p=>[q, ...p]));
    socket.on('queryAnswered',q => setQs(p=>p.map(x=>x._id===q._id?q:x)));
    return ()=>{ socket.off('allQueries'); socket.off('newQuery'); socket.off('queryAnswered');};
  },[]);

  const send = ()=>{
    const t = text.trim();
    if(!t) return;
    socket.emit('createQuery',{ target: filter==='All'?'all':filter, question:t});
    setText('');
  };

  const shown = qs.filter(q => filter==='All' || q.target===filter);

  return(
    <div className="query-card">
      {/* header pills */}
      <div className="pill-row">
        {['All','P1','P2','P3','P4','P5','P6'].map(p=>
          <button key={p}
            className={`pill ${filter===p?'active':''}`}
            onClick={()=>setFilter(p)}
          >{p==='All'?'All participants':p}</button>)}
      </div>

      {/* manual question */}
      <textarea
        value={text} onChange={e=>setText(e.target.value)}
        placeholder="Ask a question…"
      />
      <button className="send-btn" onClick={send}>Send</button>

      {/* list */}
      <ul className="q-list">
        {shown.map(q=>(
          <li key={q._id} className={q.answered?'done':''}>
            <b>{q.target}</b> — {q.question}
            {q.answered && <span className="tick">✔︎</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
