import { useEffect, useState } from 'react';
import socket from '../../socket';
import './autoQueryList.css';

export default function AutoQueryList() {
  const [items, setItems] = useState([]);

  /* pull once + live updates */
  useEffect(() => {
    socket.emit('requestAllQueries');
    socket.on('allQueries', qs =>
      setItems(qs.filter(q => q.isAuto || q.ruleId).sort((a, b) => new Date(b.askedAt) - new Date(a.askedAt))) // Sort by date
    );
    socket.on('newQuery', q =>
        (q.isAuto || q.ruleId) && setItems(prev => [q, ...prev].sort((a, b) => new Date(b.askedAt) - new Date(a.askedAt))));
    socket.on('queryAnswered', q =>
        (q.isAuto || q.ruleId) && setItems(prev =>
        prev.map(p => p._id === q._id ? q : p).sort((a, b) => new Date(b.askedAt) - new Date(a.askedAt))));

    return () => {
      socket.off('allQueries');
      socket.off('newQuery');
      socket.off('queryAnswered');
    };
  }, []);

  return (
    <div className="auto-card">
      <h4>Automatic queries</h4>
      <ul className="scroll">
        {items.map(q => (
          <li key={q._id}>
            <span className="tag">{q.target}</span>
            {q.question}
            {q.answered && (
              <span className="badge">
                answered: {q.answer}
              </span>
            )}
          </li>
        ))}
        {items.length === 0 && <li>No automatic queries yet.</li>}
      </ul>
    </div>
  );
}
