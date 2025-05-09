import { useEffect, useState } from 'react';
import socket from '../../socket';
import './queryPanel.css';

export default function QueryPanel(){
  const [qs,      setQs]     = useState([]);
  const [filter,  setFilter] = useState('All');
  const [text,    setText]   = useState('');

  /* -------- live sockets -------- */
  useEffect(()=>{
    socket.emit('requestAllQueries');
    socket.on('allQueries', qs => setQs(qs.sort((a,b) => new Date(b.askedAt) - new Date(a.askedAt))));
    socket.on('newQuery',   q  => setQs(p=>[q, ...p].sort((a,b) => new Date(b.askedAt) - new Date(a.askedAt))));
    socket.on('queryAnswered',q => setQs(p=>p.map(x=>x._id===q._id?q:x).sort((a,b) => new Date(b.askedAt) - new Date(a.askedAt))));
    return ()=>{ socket.off('allQueries'); socket.off('newQuery'); socket.off('queryAnswered');};
  },[]);

  const send = ()=>{
    const t = text.trim();
    if(!t) return;
    socket.emit('createQuery',{ target: filter==='All'?'all':filter, question:t});
    setText('');
  };

  // Filter shown queries based on the selected participant filter
  // AND ensure that we only show non-automatic queries in this panel
  const shown = qs.filter(q => {
    const targetMatch = filter === 'All' || q.target === filter || (filter !== 'All' && q.target === 'all');
    return targetMatch && !q.isAuto && !q.ruleId; // Exclude automatic queries
  });

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
            <b>{q.target === 'all' ? 'All' : q.target}</b> — {q.question}
            {q.answered && (
              <span className="answer-section">
                <span className="tick">✔︎</span>
                <span className="answer-text">{q.answer}</span>
              </span>
            )}
          </li>
        ))}
        {shown.length === 0 && <li>No manual queries for this filter yet.</li>}
      </ul>
    </div>
  );
}
