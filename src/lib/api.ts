import type { Tournament } from '@/types';

// In production, Caddy strips /tennis prefix via handle_path, so we need /tennis/api
// In dev, Vite proxy handles /api directly
const API_BASE = import.meta.env.DEV ? '/api' : '/tennis/api';
const TOKEN_KEY = 'tennis-auth-token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.hash = '#/login';
    throw new Error('認証が切れました。再ログインしてください');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `エラー (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Auth ---

export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function register(username: string, password: string, displayName?: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, displayName }),
  });
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function getMe(): Promise<AuthUser> {
  return request<AuthUser>('/auth/me');
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasToken(): boolean {
  return !!getToken();
}

// --- Tournaments ---

export async function fetchTournaments(): Promise<Tournament[]> {
  const summaries = await request<Array<{ id: string }>>('/tournaments');
  const full = await Promise.all(summaries.map((s) => request<Tournament>(`/tournaments/${s.id}`)));
  return full;
}

export async function createTournamentApi(tournament: Tournament): Promise<void> {
  await request('/tournaments', {
    method: 'POST',
    body: JSON.stringify(tournament),
  });
}

export async function saveTournamentApi(tournament: Tournament): Promise<void> {
  await request(`/tournaments/${tournament.id}`, {
    method: 'PUT',
    body: JSON.stringify(tournament),
  });
}

export async function deleteTournamentApi(id: string): Promise<void> {
  await request(`/tournaments/${id}`, { method: 'DELETE' });
}

// --- AI ---

export interface ParsedTournament {
  name: string | null;
  type: 'singles' | 'doubles' | 'team' | null;
  format: 'swiss' | 'single_elimination' | 'round_robin_knockout' | null;
  totalRounds: number | null;
  setsPerMatch: number | null;
  gamesPerSet: number | null;
  maxParticipants: number | null;
  participants: string[] | null;
  thirdPlaceMatch: boolean | null;
  hasConsolation: boolean | null;
  groupSize: number | null;
  advancingPerGroup: number | null;
}

export async function parseWithAI(text: string): Promise<{ parsed: ParsedTournament; raw: string }> {
  return request('/ai/parse-tournament', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}
