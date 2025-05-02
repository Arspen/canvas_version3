/*

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
*/

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import DashboardApp from './dashboard/DashboardApp';
import './index.css';

const isDashboard = window.location.pathname.startsWith('/dashboard');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {isDashboard ? <DashboardApp /> : <App />}
  </React.StrictMode>
);
