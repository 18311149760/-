'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getUser, handleAuthCallback, onAuthChange, refreshSession, type User, type CallbackResult } from '@netlify/identity';
import { STORAGE_KEY, parseSave, type Action } from './game';
import { advanceProgress, freshProgress, mergeProgress, progressKey, readProgress, sameProgress, type ProgressData } from './progress';

type SyncStatus = 'guest' | 'syncing' | 'saved' | 'pending' | 'offline' | 'error' | 'expired';
type Active = { user: User | null; progress: ProgressData; pending: boolean; epoch: number };
type Cached = { progress: ProgressData; pending: boolean };
function loadLocal(userId: string | null): Cached {
  const raw = localStorage.getItem(progressKey(userId));
  if (raw) {
    const cached = JSON.parse(raw), progress = readProgress(cached.progress);
    if (progress) return { progress, pending: cached.pending === true };
  }
  const legacy = userId ? null : localStorage.getItem(STORAGE_KEY);
  const progress = freshProgress(legacy ? parseSave(legacy) : undefined);
  if (legacy) { progress.updatedAt = 1; progress.runUpdatedAt = Object.fromEntries(Object.keys(progress.save.runs).map(key => [key, 1])); }
  return { progress, pending: false };
}

export function useGameAccount() {
  const [progress, setProgress] = useState(freshProgress), [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false), [authReady, setAuthReady] = useState(false), [storageOkay, setStorageOkay] = useState(true);
  const [status, setStatus] = useState<SyncStatus>('guest'), [lastSync, setLastSync] = useState<number | null>(null);
  const [authFlow, setAuthFlow] = useState<CallbackResult | null>(null), [authNotice, setAuthNotice] = useState('');
  const [webAccount, setWebAccount] = useState(true);
  const userId = user?.id;
  const active = useRef<Active>({ user: null, progress: freshProgress(), pending: false, epoch: 0 });
  const busy = useRef<number | null>(null), mounted = useRef(false);

  const persist = useCallback((next: Active) => {
    try { localStorage.setItem(progressKey(next.user?.id ?? null), JSON.stringify({ progress: next.progress, pending: next.pending })); setStorageOkay(true); }
    catch { setStorageOkay(false); }
  }, []);
  const activate = useCallback((nextUser: User | null) => {
    if (!mounted.current) return;
    if (active.current.user?.id === nextUser?.id) { active.current.user = nextUser; setUser(nextUser); return; }
    let cached: Cached = { progress: freshProgress(), pending: false };
    try { cached = loadLocal(nextUser?.id ?? null); } catch { setStorageOkay(false); }
    active.current = { user: nextUser, ...cached, epoch: active.current.epoch + 1 };
    setUser(nextUser); setProgress(cached.progress); setLastSync(null);
    setStatus(nextUser ? navigator.onLine ? 'pending' : 'offline' : 'guest');
  }, []);

  const sync = useCallback(async () => {
    const snapshot = active.current;
    if (!snapshot.user || busy.current === snapshot.epoch || !mounted.current) return;
    if (!navigator.onLine) { setStatus('offline'); return; }
    const epoch = snapshot.epoch, userId = snapshot.user.id;
    busy.current = epoch; setStatus('syncing');
    try {
      await refreshSession();
      if (active.current.epoch !== epoch) return;
      const response = await fetch('/api/progress', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(12000),
        headers: { 'Content-Type': 'application/json', 'X-Starry-User': userId }, body: JSON.stringify(snapshot.progress),
      });
      if (active.current.epoch !== epoch || !mounted.current) return;
      if (response.status === 401) { setStatus('expired'); return; }
      const result = await response.json() as { error?: string; userId?: string; progress?: unknown };
      if (active.current.epoch !== epoch || !mounted.current) return;
      if (result.error === 'account_changed') { activate(await getUser()); return; }
      const remote = readProgress(result.progress);
      if (!response.ok || result.userId !== userId || !remote) throw new Error('sync');
      const merged = mergeProgress(remote, active.current.progress), pending = !sameProgress(merged, remote);
      const next = { ...active.current, progress: merged, pending };
      active.current = next; persist(next);
      setProgress(merged); setLastSync(Date.now()); setStatus(pending ? 'pending' : 'saved');
    } catch {
      if (active.current.epoch === epoch && mounted.current) setStatus(navigator.onLine ? 'error' : 'offline');
    } finally { if (busy.current === epoch) busy.current = null; }
  }, [activate, persist]);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    const unsubscribe = onAuthChange((event, nextUser) => {
      activate(nextUser);
      if (event === 'recovery') setAuthFlow({ type: 'recovery', user: nextUser });
    });
    // Browser storage is read after hydration; cancellation also avoids duplicate auth callbacks in Strict Mode.
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      try { const cached = loadLocal(null); active.current = { ...active.current, ...cached }; setProgress(cached.progress); } catch { setStorageOkay(false); }
      const file = location.protocol === 'file:';
      setWebAccount(!file); setReady(true);
      if (file) { setAuthReady(true); return; }
      try {
        const result = await handleAuthCallback();
        if (cancelled) return;
        if (result?.type === 'recovery' || result?.type === 'invite') setAuthFlow(result);
        else if (result) setAuthNotice('邮箱验证完成，已登录。');
        const currentUser = await getUser();
        if (!cancelled) activate(currentUser);
      } catch { if (!cancelled) setAuthNotice('验证链接未完成，请联网重试；链接过期时可重新注册或找回密码。'); }
      finally { if (!cancelled) setAuthReady(true); }
    })();
    return () => { cancelled = true; mounted.current = false; unsubscribe(); };
  }, [activate]);

  useEffect(() => {
    const receive = (event: StorageEvent) => {
      if (event.key !== progressKey(active.current.user?.id ?? null) || !event.newValue) return;
      try {
        const cached = JSON.parse(event.newValue), incoming = readProgress(cached.progress);
        if (!incoming) return;
        const merged = mergeProgress(active.current.progress, incoming);
        if (sameProgress(merged, active.current.progress)) return;
        const next = { ...active.current, progress: merged, pending: !!active.current.user };
        active.current = next; persist(next); setProgress(merged);
        setStatus(next.user ? navigator.onLine ? 'pending' : 'offline' : 'guest');
      } catch { /* A malformed write from another tab must not replace this board. */ }
    };
    window.addEventListener('storage', receive);
    return () => window.removeEventListener('storage', receive);
  }, [persist]);

  useEffect(() => {
    if (!userId) return;
    const initialSync = setTimeout(() => void sync(), 0);
    const resume = () => { if (document.visibilityState === 'visible') void sync(); };
    const offline = () => setStatus('offline');
    window.addEventListener('online', resume); window.addEventListener('offline', offline);
    window.addEventListener('focus', resume); document.addEventListener('visibilitychange', resume);
    const timer = setInterval(resume, 30000);
    return () => { window.removeEventListener('online', resume); window.removeEventListener('offline', offline); window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume); clearInterval(timer); clearTimeout(initialSync); };
  }, [userId, sync]);
  useEffect(() => {
    if (!userId || !active.current.pending) return;
    const timer = setTimeout(() => void sync(), 1500);
    return () => clearTimeout(timer);
  }, [progress, userId, sync]);

  function dispatch(action: Action) {
    if (!ready) return;
    const previous = active.current;
    const nextProgress = advanceProgress(previous.progress, action, crypto.randomUUID());
    if (nextProgress === previous.progress) return;
    const next = { ...previous, progress: nextProgress, pending: !!previous.user };
    active.current = next; persist(next); setProgress(nextProgress);
    setStatus(previous.user ? navigator.onLine ? 'pending' : 'offline' : 'guest');
  }
  function importGuest() {
    if (!active.current.user) return;
    try {
      const guest = loadLocal(null).progress;
      const merged = mergeProgress(active.current.progress, guest);
      const next = { ...active.current, progress: merged, pending: true };
      active.current = next; persist(next); setProgress(merged); setStatus('pending');
      return true;
    } catch { setStorageOkay(false); return false; }
  }
  return { progress, save: progress.save, user, ready, authReady, storageOkay, status, lastSync, authFlow, setAuthFlow, authNotice, setAuthNotice, webAccount, dispatch, sync, importGuest };
}
export type GameAccount = ReturnType<typeof useGameAccount>;
