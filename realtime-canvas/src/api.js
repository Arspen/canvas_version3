// src/api.js
const API = process.env.REACT_APP_API_URL || 'https://canvas-version3.onrender.com';

export async function apiGet(path){
  const res = await fetch(`${API}${path}`);
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}
