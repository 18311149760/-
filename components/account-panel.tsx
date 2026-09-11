'use client';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { acceptInvite, login, logout, requestPasswordRecovery, signup, updateUser } from '@netlify/identity';
import { Cloud, LogOut, RefreshCw, Star, UserRound, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DIFFICULTIES, LEVEL_COUNT } from '@/lib/game';
import { HISTORY_LIMIT } from '@/lib/progress';
import { authErrorMessage, type AuthMode } from '@/lib/account-errors';
import type { GameAccount } from '@/lib/use-game-account';

export const GAME_URL = 'https://superlative-begonia-d0e9d9.netlify.app/';
export function saveStatus(account: GameAccount): string {
  if (!account.ready) return '正在载入';
  if (!account.storageOkay) return account.user && account.status === 'saved' ? '已存云端，本机未保存' : '本机保存失败，请保持页面';
  return { guest: '游客进度 · 存在本机', syncing: '正在同步云端', saved: '已同步云端', pending: '本机已存 · 等待同步', offline: '离线已存 · 联网后同步', error: '本机已存 · 云端待重试', expired: '本机已存 · 请重新登录' }[account.status];
}
export function AccountPanel({ account, open, onOpenChange }: { account: GameAccount; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const [showCount, setShowCount] = useState(20);
  const { user, authFlow, authNotice } = account;
  const formMode = authFlow ? 'reset' : mode;
  useEffect(() => { if (authFlow || authNotice) onOpenChange(true); }, [authFlow, authNotice, onOpenChange]);
  function changeMode(next: typeof mode) { setMode(next); setPassword(''); setRepeat(''); setError(''); }
  function changeOpen(next: boolean) { setPassword(''); setRepeat(''); setError(''); if (!next) account.setAuthNotice(''); onOpenChange(next); }
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice('');
    if ((formMode === 'signup' || formMode === 'reset') && password !== repeat) { setError('两次输入的游戏密码不一致。'); return; }
    setBusy(true);
    try {
      if (formMode === 'login') { await login(email.trim(), password); setNotice('登录成功，正在读取你的云端进度。'); }
      if (formMode === 'signup') { await signup(email.trim(), password); setNotice('请到收件箱或垃圾邮件查收确认邮件，点击 “Confirm your mail” 完成注册。以后用这个邮箱和刚设置的游戏密码登录。'); changeMode('login'); }
      if (formMode === 'recover') { await requestPasswordRecovery(email.trim()); setNotice('若邮箱已注册游戏账号，会收到重置链接。打开邮件中的 “Reset Password”，然后设置新的游戏密码。'); }
      if (formMode === 'reset') {
        if (authFlow?.type === 'invite' && authFlow.token) await acceptInvite(authFlow.token, password);
        else await updateUser({ password });
        account.setAuthFlow(null); changeMode('login'); setNotice('新的游戏密码已保存。');
      }
      setPassword(''); setRepeat('');
    } catch (e) { setError(authErrorMessage(e, formMode, navigator.onLine)); }
    finally { setBusy(false); }
  }
  const stats = Object.values(account.save.best), history = [...account.progress.history].reverse();
  const title = formMode === 'reset' ? '重设游戏密码' : user ? '我的星光记录' : formMode === 'signup' ? '注册游戏账号' : formMode === 'recover' ? '找回游戏密码' : '登录，接着上次玩';
  const description = formMode === 'recover' ? '填写注册游戏账号时使用的邮箱，重置的只是游戏密码。' : formMode === 'reset' ? '为《星星连连》设置新的游戏专用密码。' : formMode === 'signup' ? '用常用邮箱注册，再单独设置游戏密码。邮箱用来收验证邮件和找回密码。' : '登录后，关卡进度与闯关记录会存到云端，换手机也能接着玩。';
  return <Dialog open={open} onOpenChange={changeOpen}><DialogContent className="game-dialog account-dialog" showCloseButton={false}>
    <DialogClose className="round-button dialog-dismiss" aria-label="关闭账号与记录"><X size={19} /></DialogClose>
    <span className="dialog-icon"><UserRound size={27} /></span><DialogTitle>{title}</DialogTitle>
    <DialogDescription>{user && formMode !== 'reset' ? user.email || '已登录' : description}</DialogDescription>
    {!account.webAccount ? <div className="account-callout"><p>离线文件可继续游玩。注册、登录和云端同步请使用网页版。</p><a className="primary-button" href={GAME_URL}>打开游戏网页版</a></div> : (!user || formMode === 'reset') && <form className="account-form" onSubmit={submit}>
      {formMode === 'login' && <button type="button" className="secondary-button account-register" disabled={busy} onClick={() => { changeMode('signup'); setNotice(''); }}>首次玩？注册游戏账号</button>}
      {formMode !== 'reset' && <label>{formMode === 'signup' ? '常用邮箱' : '注册游戏账号的邮箱'}<input name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} placeholder={formMode === 'signup' ? '能收到验证邮件的邮箱' : '输入注册游戏时填写的邮箱'} /></label>}
      {formMode !== 'recover' && <label>{formMode === 'reset' ? '新的游戏密码' : '游戏密码'}<input name="password" type="password" autoComplete={formMode === 'login' ? 'current-password' : 'new-password'} minLength={formMode === 'login' ? 1 : 10} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} aria-describedby="game-password-help" placeholder={formMode === 'login' ? '输入注册游戏时设置的密码' : '单独设置一个至少 10 位的新密码'} /><span id="game-password-help" className="account-password-help">{formMode === 'login' ? '这是《星星连连》的游戏密码，不是邮箱本身的密码。' : '请设置游戏专用密码，不要填写邮箱本身的密码。'}</span></label>}
      {(formMode === 'signup' || formMode === 'reset') && <label>再输入一次游戏密码<input name="repeat-password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={repeat} onChange={e => setRepeat(e.target.value)} /></label>}
      <button className="primary-button" disabled={busy || !account.authReady}>{busy ? '正在处理…' : !account.authReady ? '正在检查账号…' : { login: '登录并同步', signup: '注册并发送确认邮件', recover: '发送重置邮件', reset: '保存新密码' }[formMode]}</button>
      {formMode === 'login' && <div className="account-links"><button type="button" className="text-button" disabled={busy} onClick={() => { changeMode('recover'); setNotice(''); }}>忘记游戏密码</button></div>}
      {(formMode === 'signup' || formMode === 'recover') && <button type="button" className="text-button" disabled={busy} onClick={() => { changeMode('login'); setNotice(''); }}>返回游戏账号登录</button>}
      {formMode === 'signup' && <p className="account-privacy">邮箱用于登录和找回密码，账号与游戏记录由 Netlify 存储。记录仅供你登录查看。</p>}
    </form>}
    {(authNotice || notice) && <output className="account-feedback">{authNotice || notice}</output>}{error && <p className="account-error" role="alert">{error}</p>}
    {formMode !== 'reset' && <>
      <div className="account-sync"><Cloud size={17} /><div><strong>{saveStatus(account)}</strong>{account.lastSync && <small>上次同步 {new Date(account.lastSync).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</small>}</div>{user && <button className="round-button" aria-label="重试云端同步" disabled={account.status === 'syncing'} onClick={() => void account.sync()}><RefreshCw size={17} /></button>}</div>
      {user && account.status === 'expired' && <p className="account-error">登录已过期，请退出后重新登录。本机未同步的记录会保留，下次登录后继续上传。</p>}
      <div className="result-stats account-stats"><span><b>{stats.length}<small> / {LEVEL_COUNT}</small></b>关已完成</span><span><b>{stats.reduce((sum, b) => sum + b.stars, 0)}</b>颗星星</span><span><b>{account.save.current}</b>当前关卡</span></div>
      {user && <div className="account-callout"><p>之前没登录也玩过？可把这台设备的游客成绩和进度合并到当前账号。</p><button className="secondary-button" onClick={() => setNotice(account.importGuest() ? '游客进度已合并，正在等待云端同步。' : '读取游客进度失败，请保留当前页面。')}>导入这台设备的游客进度</button></div>}
      <div className="history-heading"><h3>闯关记录</h3><span>最近 {HISTORY_LIMIT} 次</span></div>
      {!history.length ? <p className="history-empty">下一次通关或用完次数后，记录就会出现在这里。以前获得的星星已保留，旧版本没有记录闯关时间。</p> : <ol className="history-list">{history.slice(0, showCount).map(h => <li key={h.id}><span className={`history-result ${h.result}`}><Star size={17} /></span><div><strong>第 {String(h.level).padStart(2, '0')} 关 · {DIFFICULTIES.find(d => d.id === h.difficulty)!.label}</strong><small>{h.moves} 次旋转 · {h.hints} 次提示 · {new Date(h.finishedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></div><span>{h.result === 'won' ? `${h.stars} 星通关` : '次数用完'}</span></li>)}</ol>}
      {showCount < history.length && <button className="text-button" onClick={() => setShowCount(n => n + 30)}>查看更多记录</button>}
      {user && <><p className="account-privacy">离线记录暂存在这台设备，联网后自动上传。退出后仍保留待同步记录，下次登录同一账号时继续同步。</p><button className="text-button account-logout" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await logout(); setNotice('已退出，当前显示游客进度。'); changeMode('login'); } catch (e) { setError(authErrorMessage(e, 'logout', navigator.onLine)); } finally { setBusy(false); } }}><LogOut size={16} />退出登录</button></>}
    </>}
  </DialogContent></Dialog>;
}
