import { getSupabase } from '../supabase.js';

const PROFILE_KEY = 'ormocgo.user.profile';
const DB_NAME = 'ormocgo-profile';
const STORE = 'resumes';
const MAX_RESUME_BYTES = 8 * 1024 * 1024;
const RESUME_BUCKET = 'resumes';
const SYNC_COOLDOWN_MS = 45_000;

const ALLOWED_RESUME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
  'text/rtf',
]);

const ALLOWED_RESUME_EXT = /\.(pdf|doc|docx|txt|rtf)$/i;

const syncState = new Map();

function profileScope(user) {
  return String(user?.id || user?.email || 'local');
}

function emptyProfile() {
  return {
    fullName: '',
    about: '',
    skills: [],
    resume: null,
    updatedAt: 0,
    syncedAt: 0,
  };
}

function readAllProfiles() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? data : {};
  } catch (_) {
    return {};
  }
}

function writeAllProfiles(map) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(map));
  } catch (_) {
    /* ignore quota / private mode */
  }
}

function normalizeSkills(skills) {
  const list = Array.isArray(skills) ? skills : String(skills || '').split(/[,|\n]/);
  const seen = new Set();
  const out = [];
  list.forEach((raw) => {
    const skill = String(raw || '').trim().replace(/\s+/g, ' ');
    if (!skill) return;
    const key = skill.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(skill.slice(0, 40));
  });
  return out.slice(0, 24);
}

function canUseRemote(user) {
  return Boolean(user?.id) && String(user.id) !== 'local';
}

function writeLocalProfile(user, profile) {
  const scope = profileScope(user);
  const all = readAllProfiles();
  all[scope] = profile;
  writeAllProfiles(all);
  return profile;
}

function fromRemoteRow(row, fallback = emptyProfile()) {
  if (!row) return fallback;
  const remoteUpdated = row.updated_at ? Date.parse(row.updated_at) : 0;
  const resumeUpdated = row.resume_updated_at ? Date.parse(row.resume_updated_at) : 0;
  return {
    ...emptyProfile(),
    ...fallback,
    fullName: String(row.full_name || fallback.fullName || '').trim(),
    about: String(row.about || '').trim(),
    skills: normalizeSkills(row.skills || []),
    resume: row.resume_path
      ? {
          name: row.resume_name || 'resume',
          type: row.resume_mime || 'application/octet-stream',
          size: Number(row.resume_size) || 0,
          path: row.resume_path,
          updatedAt: resumeUpdated || remoteUpdated || Date.now(),
        }
      : null,
    updatedAt: Math.max(remoteUpdated || 0, resumeUpdated || 0, fallback.updatedAt || 0),
    syncedAt: Date.now(),
  };
}

function toRemotePayload(profile) {
  return {
    full_name: profile.fullName || null,
    about: profile.about || null,
    skills: normalizeSkills(profile.skills),
    resume_path: profile.resume?.path || null,
    resume_name: profile.resume?.name || null,
    resume_mime: profile.resume?.type || null,
    resume_size: profile.resume?.size ?? null,
    resume_updated_at: profile.resume?.updatedAt
      ? new Date(profile.resume.updatedAt).toISOString()
      : null,
    updated_at: new Date(profile.updatedAt || Date.now()).toISOString(),
  };
}

export function getUserProfile(user) {
  const scope = profileScope(user);
  const all = readAllProfiles();
  const saved = all[scope];
  if (!saved || typeof saved !== 'object') return emptyProfile();
  return {
    ...emptyProfile(),
    ...saved,
    skills: normalizeSkills(saved.skills),
    resume: saved.resume && typeof saved.resume === 'object' ? saved.resume : null,
  };
}

export function saveUserProfile(user, patch = {}) {
  const current = getUserProfile(user);
  const next = {
    ...current,
    fullName: String(patch.fullName ?? current.fullName ?? '').trim().slice(0, 80),
    about: String(patch.about ?? current.about ?? '').trim().slice(0, 1200),
    skills: normalizeSkills(patch.skills ?? current.skills),
    resume: patch.resume === undefined ? current.resume : patch.resume,
    updatedAt: Date.now(),
    syncedAt: current.syncedAt || 0,
  };
  writeLocalProfile(user, next);
  // Fire-and-forget remote push; local cache already updated.
  void pushProfileToRemote(user, next);
  return next;
}

async function pushProfileToRemote(user, profile) {
  if (!canUseRemote(user)) return false;
  try {
    const supabase = await getSupabase();
    if (!supabase) return false;
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email || null,
        ...toRemotePayload(profile),
      }, { onConflict: 'id' });
    if (error) throw error;
    const synced = { ...profile, syncedAt: Date.now() };
    writeLocalProfile(user, synced);
    syncState.set(profileScope(user), Date.now());
    return true;
  } catch (err) {
    console.warn('[OrmocGo] Profile sync failed', err);
    return false;
  }
}

/**
 * Cache-first hydrate:
 * 1) return local immediately via getUserProfile
 * 2) optionally pull from Supabase if cache is empty/stale
 * Reduces repeat requests with a per-user cooldown.
 */
export async function hydrateUserProfile(user, { force = false } = {}) {
  const local = getUserProfile(user);
  if (!canUseRemote(user)) return local;

  const scope = profileScope(user);
  const lastSync = syncState.get(scope) || local.syncedAt || 0;
  const hasUsefulLocal = Boolean(local.fullName || local.about || local.skills.length || local.resume);
  if (!force && hasUsefulLocal && Date.now() - lastSync < SYNC_COOLDOWN_MS) {
    return local;
  }

  try {
    const supabase = await getSupabase();
    if (!supabase) return local;

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, about, skills, resume_path, resume_name, resume_mime, resume_size, resume_updated_at, updated_at, email')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      // First-time remote row: push local cache if we have anything.
      if (hasUsefulLocal) await pushProfileToRemote(user, local);
      syncState.set(scope, Date.now());
      return getUserProfile(user);
    }

    const remoteUpdated = data.updated_at ? Date.parse(data.updated_at) : 0;
    if (!hasUsefulLocal || remoteUpdated >= (local.updatedAt || 0)) {
      const merged = fromRemoteRow(data, local);
      writeLocalProfile(user, merged);
      syncState.set(scope, Date.now());
      return merged;
    }

    // Local is newer — push once, keep serving local.
    await pushProfileToRemote(user, local);
    syncState.set(scope, Date.now());
    return getUserProfile(user);
  } catch (err) {
    console.warn('[OrmocGo] Profile hydrate failed', err);
    return local;
  }
}

function openResumeDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open resume storage'));
  });
}

function idbRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Storage request failed'));
  });
}

async function putResumeLocal(user, file, extra = {}) {
  const scope = profileScope(user);
  const db = await openResumeDb();
  const tx = db.transaction(STORE, 'readwrite');
  await idbRequest(tx.objectStore(STORE).put({
    blob: file,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    path: extra.path || null,
    updatedAt: Date.now(),
  }, scope));
  db.close();
}

async function deleteResumeLocal(user) {
  const scope = profileScope(user);
  try {
    const db = await openResumeDb();
    const tx = db.transaction(STORE, 'readwrite');
    await idbRequest(tx.objectStore(STORE).delete(scope));
    db.close();
  } catch (_) {
    /* ignore */
  }
}

function safeResumeFileName(name) {
  return String(name || 'resume')
    .replace(/[^\w.\-()+ ]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'resume';
}

export function isAllowedResumeFile(file) {
  if (!file) return false;
  if (file.size > MAX_RESUME_BYTES) return false;
  if (file.type && ALLOWED_RESUME_TYPES.has(file.type)) return true;
  return ALLOWED_RESUME_EXT.test(file.name || '');
}

export function resumeLimitLabel() {
  return 'PDF, Word, TXT, or RTF · up to 8 MB';
}

export async function saveUserResume(user, file) {
  if (!isAllowedResumeFile(file)) {
    throw new Error('Use a PDF, Word, TXT, or RTF file up to 8 MB.');
  }

  // Always cache locally first (fast UX, fewer repeated downloads).
  await putResumeLocal(user, file);

  let resumePath = null;
  if (canUseRemote(user)) {
    try {
      const supabase = await getSupabase();
      if (supabase) {
        const current = getUserProfile(user);
        if (current.resume?.path) {
          await supabase.storage.from(RESUME_BUCKET).remove([current.resume.path]);
        }
        resumePath = `${user.id}/${Date.now()}_${safeResumeFileName(file.name)}`;
        const { error } = await supabase.storage
          .from(RESUME_BUCKET)
          .upload(resumePath, file, {
            upsert: true,
            contentType: file.type || 'application/octet-stream',
          });
        if (error) throw error;
        await putResumeLocal(user, file, { path: resumePath });
      }
    } catch (err) {
      console.warn('[OrmocGo] Resume upload failed; kept local copy', err);
      // Keep local file even if remote upload fails.
    }
  }

  return saveUserProfile(user, {
    resume: {
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      path: resumePath,
      updatedAt: Date.now(),
    },
  });
}

export async function getUserResumeBlob(user) {
  const scope = profileScope(user);
  const db = await openResumeDb();
  const tx = db.transaction(STORE, 'readonly');
  const row = await idbRequest(tx.objectStore(STORE).get(scope));
  db.close();
  if (row?.blob) return row.blob;

  // Local miss → fetch once from Storage, then cache in IndexedDB.
  const profile = getUserProfile(user);
  if (!canUseRemote(user) || !profile.resume?.path) return null;

  try {
    const supabase = await getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.storage
      .from(RESUME_BUCKET)
      .download(profile.resume.path);
    if (error) throw error;
    if (!data) return null;
    const file = new File(
      [data],
      profile.resume.name || 'resume',
      { type: profile.resume.type || data.type || 'application/octet-stream' },
    );
    await putResumeLocal(user, file, { path: profile.resume.path });
    return file;
  } catch (err) {
    console.warn('[OrmocGo] Resume download failed', err);
    return null;
  }
}

export async function removeUserResume(user) {
  const current = getUserProfile(user);
  await deleteResumeLocal(user);

  if (canUseRemote(user) && current.resume?.path) {
    try {
      const supabase = await getSupabase();
      if (supabase) {
        await supabase.storage.from(RESUME_BUCKET).remove([current.resume.path]);
      }
    } catch (err) {
      console.warn('[OrmocGo] Resume remote delete failed', err);
    }
  }

  return saveUserProfile(user, { resume: null });
}

export function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
