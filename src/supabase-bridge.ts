import { getSupabaseClient, supabase } from './lib/supabaseClient';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface CloudAuthResult {
  user: User | null;
  error: string | null;
}

export interface CompanyInfoPayload {
  name?: string;
  gstin?: string;
  pan?: string;
  stateCode?: string;
  stateName?: string;
  city?: string;
  email?: string;
  phone?: string;
  address?: string;
  bankName?: string;
  bankAccount?: string;
  bankBranchIfsc?: string;
  bankType?: string;
  defaultGst?: string | number;
  invoicePrefix?: string;
  quotePrefix?: string;
  terms?: string;
}

export interface CompanyMediaPayload {
  companyLogo?: string | null;
  companySignature?: string | null;
  adminAvatar?: string | null;
}

export interface CloudCompanyResult {
  companyInfo: CompanyInfoPayload;
  companyLogo: string | null;
  companySignature: string | null;
  adminAvatar: string | null;
}

interface CompanyRow {
  id?: string;
  user_id?: string;
  name?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  state_code?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_path?: string | null;
  profile_path?: string | null;
  signature_path?: string | null;
  bank_name?: string | null;
  account_no?: string | null;
  branch_name?: string | null;
  ifsc?: string | null;
  bank_type?: string | null;
  invoice_prefix?: string | null;
  quote_prefix?: string | null;
  default_gst?: number | string | null;
  terms?: string | null;
}

declare global {
  interface Window {
    InvoiceFlexSupabase?: SupabaseClient | null;
    InvoiceFlexSupabaseReady?: Promise<SupabaseClient | null>;
    getInvoiceFlexSupabase?: () => Promise<SupabaseClient | null>;
    InvoiceFlexCloud?: {
      getClient: () => Promise<SupabaseClient | null>;
      getAuthUser: () => Promise<User | null>;
      signIn: (email: string, password: string) => Promise<CloudAuthResult>;
      signUp: (email: string, password: string, meta?: Record<string, string>) => Promise<CloudAuthResult>;
      signOut: () => Promise<void>;
      updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
      loadCompany: (userId: string) => Promise<CloudCompanyResult | null>;
      saveCompany: (
        userId: string,
        info: CompanyInfoPayload,
        media?: CompanyMediaPayload
      ) => Promise<{ ok: boolean; error: string | null }>;
    };
  }
}

function splitBranchAndIfsc(raw: string): { branchName: string; ifsc: string } {
  const val = String(raw || '').trim();
  if (!val) return { branchName: '', ifsc: '' };
  const ifscMatch = val.match(/\b([A-Z]{4}0[A-Z0-9]{6})\b/i);
  const ifsc = ifscMatch ? ifscMatch[1].toUpperCase() : '';
  let branchName = val;
  if (ifsc) {
    branchName = val
      .replace(new RegExp(`\\s*[&,/|-]?\\s*${ifsc}`, 'i'), '')
      .replace(/[&,/|-]+\s*$/, '')
      .trim();
  }
  return { branchName: branchName || val, ifsc };
}

function combineBranchAndIfsc(branchName?: string | null, ifsc?: string | null): string {
  const b = String(branchName || '').trim();
  const i = String(ifsc || '').trim().toUpperCase();
  if (b && i) {
    return b.toUpperCase().includes(i) ? b : `${b} & ${i}`;
  }
  return b || i || '';
}

function rowToCloudCompany(row: CompanyRow): CloudCompanyResult {
  return {
    companyInfo: {
      name: row.name || '',
      gstin: row.gstin || '',
      pan: row.pan || '',
      stateCode: row.state_code || '24',
      stateName: row.state || 'Gujarat',
      city: row.city || '',
      email: row.email || '',
      phone: row.phone || '',
      address: row.address || '',
      bankName: row.bank_name || '',
      bankAccount: row.account_no || '',
      bankBranchIfsc: combineBranchAndIfsc(row.branch_name, row.ifsc),
      bankType: row.bank_type || 'Current Account',
      defaultGst: row.default_gst !== null && row.default_gst !== undefined ? String(row.default_gst) : '18',
      invoicePrefix: row.invoice_prefix || 'INV001/2026-2027',
      quotePrefix: row.quote_prefix || 'QTN/2026-2027/',
      terms: row.terms || '',
    },
    companyLogo: row.logo_path || null,
    companySignature: row.signature_path || null,
    adminAvatar: row.profile_path || null,
  };
}

if (typeof window !== 'undefined') {
  window.InvoiceFlexSupabase = supabase;
  window.getInvoiceFlexSupabase = getSupabaseClient;
  window.InvoiceFlexSupabaseReady = getSupabaseClient()
    .then((client) => {
      window.InvoiceFlexSupabase = client;
      return client;
    })
    .catch(() => null);

  window.InvoiceFlexCloud = {
    getClient: getSupabaseClient,
    async getAuthUser() {
      const client = await getSupabaseClient();
      if (!client) return null;
      const { data, error } = await client.auth.getUser();
      if (error) return null;
      return data.user ?? null;
    },
    async signIn(email: string, password: string) {
      const client = await getSupabaseClient();
      if (!client) return { user: null, error: null };
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      return {
        user: data?.user ?? null,
        error: error ? error.message : null,
      };
    },
    async signUp(email: string, password: string, meta: Record<string, string> = {}) {
      const client = await getSupabaseClient();
      if (!client) return { user: null, error: null };
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: meta },
      });
      return {
        user: data?.user ?? null,
        error: error ? error.message : null,
      };
    },
    async signOut() {
      const client = await getSupabaseClient();
      if (!client) return;
      await client.auth.signOut().catch(() => {});
    },
    async updatePassword(newPassword: string) {
      const client = await getSupabaseClient();
      if (!client) return { error: null };
      const { error } = await client.auth.updateUser({ password: newPassword });
      return { error: error ? error.message : null };
    },
    async loadCompany(userId: string) {
      try {
        const client = await getSupabaseClient();
        if (!client || !userId) return null;
        const { data: authData } = await client.auth.getUser();
        const targetUid = authData?.user?.id || userId;
        const { data, error } = await client
          .from('companies')
          .select('*')
          .eq('user_id', targetUid)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error || !data) return null;
        return rowToCloudCompany(data as CompanyRow);
      } catch {
        return null;
      }
    },
    async saveCompany(userId: string, info: CompanyInfoPayload, media: CompanyMediaPayload = {}) {
      try {
        const client = await getSupabaseClient();
        if (!client || !userId) return { ok: false, error: null };
        const { data: authData } = await client.auth.getUser();
        const targetUid = authData?.user?.id || userId;
        if (!/^[0-9a-f-]{36}$/i.test(targetUid)) {
          return { ok: false, error: null };
        }
        const { branchName, ifsc } = splitBranchAndIfsc(info.bankBranchIfsc || '');
        const parsedGst = Number(info.defaultGst);
        const payload: Record<string, unknown> = {
          user_id: targetUid,
          name: String(info.name || '').trim(),
          gstin: String(info.gstin || '').trim().toUpperCase(),
          pan: String(info.pan || '').trim().toUpperCase(),
          address: String(info.address || '').trim(),
          city: String(info.city || '').trim(),
          state: String(info.stateName || 'Gujarat').trim(),
          state_code: String(info.stateCode || '24').trim(),
          phone: String(info.phone || '').trim(),
          email: String(info.email || '').trim(),
          bank_name: String(info.bankName || '').trim(),
          account_no: String(info.bankAccount || '').trim(),
          branch_name: branchName,
          ifsc,
          bank_type: String(info.bankType || 'Current Account').trim(),
          invoice_prefix: String(info.invoicePrefix || '').trim(),
          quote_prefix: String(info.quotePrefix || '').trim(),
          default_gst: Number.isFinite(parsedGst) && parsedGst > 0 ? parsedGst : 18,
          terms: String(info.terms || '').trim(),
          updated_at: new Date().toISOString(),
        };
        if (media.companyLogo !== undefined) payload.logo_path = media.companyLogo;
        if (media.companySignature !== undefined) payload.signature_path = media.companySignature;
        if (media.adminAvatar !== undefined) payload.profile_path = media.adminAvatar;

        const { data: existing } = await client
          .from('companies')
          .select('id')
          .eq('user_id', targetUid)
          .limit(1)
          .maybeSingle();

        if (existing && existing.id) {
          const { error } = await client
            .from('companies')
            .update(payload)
            .eq('id', existing.id)
            .eq('user_id', targetUid);
          if (error) return { ok: false, error: error.message };
          return { ok: true, error: null };
        }

        const { error } = await client.from('companies').insert(payload);
        if (error) return { ok: false, error: error.message };
        return { ok: true, error: null };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Cloud sync failed' };
      }
    },
  };
}
