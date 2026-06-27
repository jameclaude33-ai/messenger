const API_URL = 'http://localhost:8000';

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  return res.json();
}

export async function register(username: string, email: string, password: string) {
  return request('/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

export async function login(username: string, password: string) {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  return request(`/token?${params.toString()}`, { method: 'POST' });
}

export async function getMe() {
  return request('/users/me');
}

export async function getRooms() {
  return request('/rooms');
}

export async function createRoom(name: string) {
  return request('/rooms', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function getMessages(roomId: number) {
  return request(`/rooms/${roomId}/messages`);
}

export function getWebSocket(roomId: number, token: string) {
  return new WebSocket(`ws://localhost:8000/ws/${roomId}?token=${token}`);
}
