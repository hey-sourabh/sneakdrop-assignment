const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function getStatus(userId) {
  const res = await fetch(`${API_BASE}/status/${userId}`);
  return res.json();
}

export async function placeHold(userId) {
  const res = await fetch(`${API_BASE}/hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export async function joinWaitlist(userId) {
  const res = await fetch(`${API_BASE}/waitlist/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export async function leaveWaitlist(userId) {
  const res = await fetch(`${API_BASE}/waitlist/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export async function initiatePayment(userId) {
  const res = await fetch(`${API_BASE}/payment/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export async function resetSystem() {
  const res = await fetch(`${API_BASE}/reset`, {
    method: 'POST',
  });
  return res.json();
}
