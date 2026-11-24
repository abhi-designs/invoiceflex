import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

function stripQuotesAndTrim(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^["']+|["']+$/g, '').trim();
}

export function normalizeSupabaseUrl(raw: unknown): string {
  let candidate = stripQuotesAndTrim(raw);
  if (!candidate || /^MY_/i.test(candidate)) {
    return '';
  }

  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(candidate)) {
    if (/^[a-zA-Z0-9-]+\.supabase\.(co|in|net)(\/.*)?$/i.test(candidate)) {
      candidate = `https://${candidate}`;
    } else {
      return '';
    }
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    if (!parsed.hostname || parsed.hostname.includes(' ')) {
      return '';
    }
    return parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, ''));
  } catch {
    return '';
  }
}

function safeCreateClient(url: string, anonKey: string): SupabaseClient | null {
  const validUrl = normalizeSupabaseUrl(url);
  const cleanKey = stripQuotesAndTrim(anonKey);
  if (!validUrl || !cleanKey || /^MY_/i.test(cleanKey)) {
    return null;
  }
  try {
    return createClient(validUrl, cleanKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch {
    return null;
  }
}

const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const buildTimeUrl = normalizeSupabaseUrl(metaEnv?.VITE_SUPABASE_URL);
const buildTimeAnonKey = stripQuotesAndTrim(metaEnv?.VITE_SUPABASE_ANON_KEY);

let cachedClient: SupabaseClient | null = safeCreateClient(buildTimeUrl, buildTimeAnonKey);

export const supabase: SupabaseClient | null = cachedClient;

let pendingClientPromise: Promise<SupabaseClient | null> | null = null;

async function resolveRuntimeConfig(): Promise<SupabaseConfig> {
  if (buildTimeUrl && buildTimeAnonKey) {
    return { url: buildTimeUrl, anonKey: buildTimeAnonKey };
  }

  if (typeof window === 'undefined') {
    return { url: '', anonKey: '' };
  }

  const CACHE_KEY = 'if_sb_runtime_cfg_v1';
  try {
    const cachedRaw = window.sessionStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw) as Partial<SupabaseConfig>;
      return {
        url: normalizeSupabaseUrl(parsed.url),
        anonKey: stripQuotesAndTrim(parsed.anonKey),
      };
    }
  } catch {
    // Ignore sessionStorage errors
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 2500) : null;
  try {
    const response = await fetch('/api/supabase-config', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller ? controller.signal : undefined,
    });
    if (!response.ok) {
      return { url: '', anonKey: '' };
    }
    const payload = (await response.json()) as Partial<SupabaseConfig>;
    const cfg = {
      url: normalizeSupabaseUrl(payload.url),
      anonKey: stripQuotesAndTrim(payload.anonKey),
    };
    try {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(cfg));
    } catch {
      // Ignore sessionStorage errors
    }
    return cfg;
  } catch {
    return { url: '', anonKey: '' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (cachedClient) {
    return cachedClient;
  }

  if (!pendingClientPromise) {
    pendingClientPromise = resolveRuntimeConfig()
      .then(({ url, anonKey }) => {
        cachedClient = safeCreateClient(url, anonKey);
        return cachedClient;
      })
      .catch(() => null);
  }

  return pendingClientPromise;
}
