// src/supabase.js
// Supabase client for ChemForm Pro

const SUPABASE_URL = "https://zpuzqnitczhgllgohrba.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdXpxbml0Y3poZ2xsZ29ocmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjIzNjIsImV4cCI6MjA5NDIzODM2Mn0.rM7RVpDW4o4j3GnyMVMBO_qkBPlo2zMTe5yG2v5SAH4";

// Simple fetch wrapper for Supabase REST API
const sb = async (path, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Supabase error");
  }
  return res.json();
};

// ─── Auth via Supabase Auth API ───────────────────────────────────────────────

export const sendOTP = async (contact) => {
  const isPhone = /^\+?\d{10,}$/.test(contact.replace(/\s/g, ""));
  const body = isPhone
    ? { phone: contact.startsWith("+") ? contact : `+91${contact}` }
    : { email: contact };

  const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      ...body, 
      create_user: true,
      options: { 
        should_create_user: true,
        email_redirect_to: null,
      }
    }),
  });
  return res.ok;
};

export const verifyOTP = async (contact, token) => {
  const isPhone = /^\+?\d{10,}$/.test(contact.replace(/\s/g, ""));
  const body = isPhone
    ? { phone: contact.startsWith("+") ? contact : `+91${contact}`, token, type: "sms" }
    : { email: contact, token, type: "email" };

  const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { user: data.user, session: data.access_token, error: data.error };
};

// ─── Profile helpers ──────────────────────────────────────────────────────────

export const getProfile = async (userId, accessToken) => {
  try {
    const data = await sb(`profiles?id=eq.${userId}&select=*`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    return data[0] || null;
  } catch { return null; }
};

export const upsertProfile = async (profile, accessToken) => {
  try {
    await sb("profiles", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Prefer": "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(profile),
    });
    return true;
  } catch (e) {
    console.error("upsertProfile error:", e);
    return false;
  }
};

// ─── Usage tracking ───────────────────────────────────────────────────────────

export const getUsage = async (userId, accessToken) => {
  const month = new Date().toISOString().slice(0, 7);
  try {
    const data = await sb(
      `usage?user_id=eq.${userId}&month=eq.${month}&select=*`,
      { headers: { "Authorization": `Bearer ${accessToken}` } }
    );
    return data[0] || { ai_used: 0, process_used: 0, equipment_used: 0 };
  } catch { return { ai_used: 0, process_used: 0, equipment_used: 0 }; }
};

export const incrementUsage = async (userId, type, accessToken) => {
  const month = new Date().toISOString().slice(0, 7);
  const field = `${type}_used`;
  try {
    // Try insert first
    await sb("usage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Prefer": "resolution=ignore-duplicates",
      },
      body: JSON.stringify({ user_id: userId, month, [field]: 1 }),
    });
  } catch {}
  try {
    // Then increment
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_usage`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_user_id: userId, p_type: type, p_month: month }),
    });
  } catch {}
};

// ─── Formula requests ─────────────────────────────────────────────────────────

export const saveFormulaRequest = async (request, accessToken) => {
  try {
    await sb("formula_requests", {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}` },
      body: JSON.stringify(request),
    });
    return true;
  } catch (e) {
    console.error("saveFormulaRequest error:", e);
    return false;
  }
};

// ─── Plan management ──────────────────────────────────────────────────────────

export const updatePlan = async (userId, plan, accessToken) => {
  try {
    await sb(`profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${accessToken}` },
      body: JSON.stringify({ plan }),
    });
    return true;
  } catch { return false; }
};

// Store session in memory (no localStorage in Claude artifacts)
let _session = null;
export const getSession = () => _session;
export const setSession = (s) => { _session = s; };
export const clearSession = () => { _session = null; };
