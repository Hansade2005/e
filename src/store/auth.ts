import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { storage } from '@/lib/storage';

export type Role = 'rider' | 'driver';

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  rating: number;
  trips: number;
  avatarColor: string;
  isGuest?: boolean;
};

type AuthState = {
  user: Profile | null;
  status: 'loading' | 'authed' | 'anon';
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }) => Promise<void>;
  continueAsGuest: (role: Role) => Promise<void>;
  switchRole: (role: Role) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
};

const LOCAL_KEY = 'ez2go.profile';

// Distinguishes a genuine auth rejection (bad credentials, user already exists)
// from the backend simply being unreachable. Supabase returns BOTH as error
// objects tagged __isAuthError, so we key off the HTTP status: real rejections
// are 4xx (AuthApiError); network/retryable failures are status 0/undefined
// (AuthRetryableFetchError) or a bare "Failed to fetch" — those fall back to an
// offline session instead of surfacing.
function isAuthError(e: unknown): boolean {
  const err = e as { status?: number } | null;
  return typeof err?.status === 'number' && err.status >= 400 && err.status < 500;
}

const COLORS = ['#00C2A8', '#FF8A3D', '#5B6472', '#1FB57A', '#7A5BD6', '#E5484D'];

function makeProfile(partial: Partial<Profile> & { email: string; name: string }): Profile {
  return {
    id: partial.id ?? 'u_' + Math.random().toString(36).slice(2, 10),
    email: partial.email,
    name: partial.name,
    role: partial.role ?? 'rider',
    phone: partial.phone,
    rating: partial.rating ?? 4.9,
    trips: partial.trips ?? 0,
    avatarColor: partial.avatarColor ?? COLORS[Math.floor(Math.random() * COLORS.length)],
    isGuest: partial.isGuest,
  };
}

async function persist(p: Profile | null) {
  if (p) await storage.setItem(LOCAL_KEY, JSON.stringify(p));
  else await storage.removeItem(LOCAL_KEY);
}

// Best-effort sync to Supabase `profiles` table (no-op if table/network absent).
async function syncProfile(p: Profile) {
  if (p.isGuest) return;
  try {
    await supabase.from('profiles').upsert(
      {
        id: p.id,
        email: p.email,
        full_name: p.name,
        role: p.role,
        phone: p.phone,
        rating: p.rating,
      },
      { onConflict: 'id' },
    );
  } catch {
    /* offline-friendly: ignore */
  }
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: 'loading',

  async init() {
    // Prefer a live Supabase session; fall back to the locally cached profile.
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session?.user) {
        const cached = await storage.getItem(LOCAL_KEY);
        const base = cached ? (JSON.parse(cached) as Profile) : null;
        const profile = makeProfile({
          id: session.user.id,
          email: session.user.email ?? base?.email ?? 'rider@ez2go.app',
          name: base?.name ?? (session.user.user_metadata?.name as string) ?? 'Rider',
          role: base?.role ?? 'rider',
          rating: base?.rating,
          trips: base?.trips,
          avatarColor: base?.avatarColor,
        });
        await persist(profile);
        set({ user: profile, status: 'authed' });
        return;
      }
    } catch {
      /* ignore — use local */
    }
    const cached = await storage.getItem(LOCAL_KEY);
    if (cached) {
      set({ user: JSON.parse(cached) as Profile, status: 'authed' });
    } else {
      set({ user: null, status: 'anon' });
    }
  },

  async signIn(email, password) {
    let id: string | undefined;
    let name: string | undefined;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error; // surface invalid credentials to the UI
      id = data.user?.id;
      name = (data.user?.user_metadata?.name as string) ?? undefined;
    } catch (e) {
      // A genuine auth rejection must reach the UI; only an unreachable backend
      // falls through to an offline session (demo / poor-connectivity support).
      if (isAuthError(e)) throw e;
    }
    const profile = makeProfile({
      id,
      email,
      name: name ?? (email.split('@')[0].replace(/[._]/g, ' ') || 'Rider'),
      role: 'rider',
    });
    await persist(profile);
    void syncProfile(profile);
    set({ user: profile, status: 'authed' });
  },

  async signUp({ name, email, password, role }) {
    let id: string | undefined;
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } },
      });
      if (error) throw error; // surface "already registered", weak password, etc.
      id = data.user?.id;
    } catch (e) {
      // Email-confirmation projects return no session (not an error) — that's
      // fine, we proceed locally. Real signup errors are surfaced to the UI.
      if (isAuthError(e)) throw e;
    }
    const profile = makeProfile({ id, name, email, role });
    await persist(profile);
    void syncProfile(profile);
    set({ user: profile, status: 'authed' });
  },

  async continueAsGuest(role) {
    const profile = makeProfile({
      email: role === 'driver' ? 'demo.driver@ez2go.app' : 'demo.rider@ez2go.app',
      name: role === 'driver' ? 'Demo Driver' : 'Demo Rider',
      role,
      isGuest: true,
      trips: role === 'driver' ? 1284 : 37,
      rating: role === 'driver' ? 4.94 : 4.88,
    });
    await persist(profile);
    set({ user: profile, status: 'authed' });
  },

  async switchRole(role) {
    const u = get().user;
    if (!u) return;
    const next = { ...u, role };
    await persist(next);
    void syncProfile(next);
    set({ user: next });
  },

  async updateProfile(patch) {
    const u = get().user;
    if (!u) return;
    const next = { ...u, ...patch };
    await persist(next);
    void syncProfile(next);
    set({ user: next });
  },

  async signOut() {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    await persist(null);
    set({ user: null, status: 'anon' });
  },
}));
