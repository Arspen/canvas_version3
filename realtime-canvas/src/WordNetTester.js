import React, { useState } from 'react';

const WordNetTester = () => {
  const [input, setInput] = useState('');
  const [labels, setLabels] = useState([]);
  const [error, setError] = useState(null);

  const fetchLabels = async () => {
    if (!input.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/labels?word=${input.trim()}`);
      const data = await response.json();
      if (data.labels) {
        setLabels(data.labels);
        setError(null);
      } else {
        setLabels([]);
        setError('No labels found.');
      }
    } catch (err) {
      console.error(err);
      setError('Error fetching labels.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchLabels();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto' }}>
      <h2>WordNet Label Tester</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          placeholder="Enter a word (e.g. dog, apple, oak)"
          onChange={(e) => setInput(e.target.value)}
          style={{ padding: '10px', fontSize: '16px', width: '70%' }}
        />
        <button type="submit" style={{ padding: '10px', marginLeft: '10px' }}>
          Get Labels
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {labels.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4>Labels:</h4>
          <ul>
            {labels.map((label, idx) => (
              <li key={idx}>{label}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default WordNetTester;
