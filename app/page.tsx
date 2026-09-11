'use client';
import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ArrowRight, Check, ChevronRight, CircleHelp, Heart, Lightbulb, LockKeyhole, RotateCcw, Sparkles, Star, Undo2, WifiOff, X, Grid2X2, Download, UserRound } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { CHAPTERS, DIFFICULTIES, LEVELS, LEVEL_COUNT, connected, getRun, hintCost, hintIndex, masksFor, moveLimit, rating, unlocked, type Difficulty } from '@/lib/game';

import { AccountPanel, saveStatus } from '@/components/account-panel';
import { useGameAccount } from '@/lib/use-game-account';

const tips = ['从金色星星出发，试着接通旁边的线。', '边缘的线不能朝外，先从四个角想一想。', '只有两边的线都对齐，星光才能通过。', '卡住也没关系，提示会帮你转好一格。'];
function Stars({ count, small = false }: { count: number; small?: boolean }) {
  return <span className={`rating ${small ? 'rating-small' : ''}`} aria-label={`${count} 颗星`}>{[1, 2, 3].map(i => <Star key={i} aria-hidden="true" className={i <= count ? 'earned' : ''} />)}</span>;
}
function CloseButton() { return <DialogClose className="round-button dialog-dismiss" aria-label="关闭"><X size={19} /></DialogClose>; }

export default function Home() {
  const account = useGameAccount();
  const { save, dispatch, ready, storageOkay } = account;
  const [accountOpen, setAccountOpen] = useState(false), [offlineReady, setOfflineReady] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false), [mapOpen, setMapOpen] = useState(false), [restartOpen, setRestartOpen] = useState(false);
  const [successDismissed, setSuccessDismissed] = useState(false), [highlight, setHighlight] = useState(-1), [message, setMessage] = useState('');
  const [failureDismissed, setFailureDismissed] = useState(false), [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(null);
  const level = LEVELS[save.current - 1], run = getRun(save);
  const masks = useMemo(() => masksFor(level, run), [level, run]);
  const lit = useMemo(() => connected(masks, level.source, level.size), [masks, level]);
  const won = lit.size === level.size ** 2, chapter = Math.floor((save.current - 1) / 12), openLevel = unlocked(save);
  const completed = Object.keys(save.best).length, totalStars = Object.values(save.best).reduce((sum, best) => sum + best.stars, 0);
  const limit = moveLimit(level, save.difficulty), remaining = Math.max(0, limit - run.moves), failed = remaining === 0 && !won;
  const difficultyLabel = DIFFICULTIES.find(d => d.id === save.difficulty)!.label;
  const nextHint = hintIndex(level, run), nextHintCost = hintCost(level, run, nextHint);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production' && location.protocol !== 'file:') {
      navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).then(() => setOfflineReady(true)).catch(() => {});
    } else if (location.protocol === 'file:') setOfflineReady(true);
  }, []);
  useEffect(() => { if (highlight < 0) return; const timer = setTimeout(() => setHighlight(-1), 1400); return () => clearTimeout(timer); }, [highlight, run.moves]);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 3500); return () => clearTimeout(timer); }, [message]);
  function select(id: number) {
    dispatch({ type: 'select', level: id }); setMapOpen(false); setSuccessDismissed(false); setFailureDismissed(false); setHighlight(-1); setMessage('');
  }
  function restart() {
    dispatch({ type: 'restart' }); setRestartOpen(false); setSuccessDismissed(false); setFailureDismissed(false); setHighlight(-1); setMessage('');
  }
  function changeDifficulty(difficulty: Difficulty) {
    dispatch({ type: 'difficulty', difficulty }); setPendingDifficulty(null); setSuccessDismissed(false); setFailureDismissed(false); setHighlight(-1); setMessage('');
  }
  function requestDifficulty(value: unknown) {
    if (!DIFFICULTIES.some(d => d.id === value) || value === save.difficulty) return;
    if (run.moves > 0) { setPendingDifficulty(value as Difficulty); setFailureDismissed(true); }
    else changeDifficulty(value as Difficulty);
  }
  function turn(index: number) {
    if (!ready || won || failed) return;
    if (level.fixed.includes(index) || level.solution[index] === 15) { setMessage(index === level.source ? '金色星星是起点，不需要旋转。' : '这一格已经固定，试试其他格子。'); return; }
    setHighlight(-1); dispatch({ type: 'rotate', index });
  }
  function hint() {
    if (!ready || won || failed || nextHint < 0) return;
    if (nextHintCost > remaining) { setMessage(`这次提示需要 ${nextHintCost} 次旋转，当前剩 ${remaining} 次。试着自己转一转。`); return; }
    dispatch({ type: 'hint', index: nextHint }); setHighlight(nextHint); setMessage(`帮你转好了一格，使用了 ${nextHintCost} 次旋转。`);
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const offsets: Record<string, number> = { ArrowUp: -level.size, ArrowDown: level.size, ArrowLeft: -1, ArrowRight: 1 };
    if (!(event.key in offsets)) return;
    event.preventDefault(); const target = index + offsets[event.key];
    if (target < 0 || target >= masks.length || (event.key === 'ArrowLeft' && index % level.size === 0) || (event.key === 'ArrowRight' && index % level.size === level.size - 1)) return;
    document.getElementById(`tile-${target}`)?.focus();
  }
  function LevelMap({ compact = false }: { compact?: boolean }) {
    return <div className={`level-map ${compact ? 'compact-map' : ''}`}>{CHAPTERS.map((item, c) => <section className={`chapter ${c === chapter ? 'chapter-current' : ''}`} key={item.name}>
      <div className="chapter-heading"><span className="chapter-number">0{c + 1}</span><div><h3>{item.name}</h3><p>{item.size} × {item.size} · {item.caption}</p></div><span className="chapter-done">{Object.keys(save.best).filter(id => Math.floor((Number(id) - 1) / 12) === c).length}/12</span></div>
      <div className="level-list">{Array.from({ length: 12 }, (_, n) => c * 12 + n + 1).map(id => <button key={id} className={`level-button ${id === save.current ? 'current' : ''} ${save.best[id] ? 'completed' : ''}`} disabled={!ready || id > openLevel} onClick={() => select(id)} aria-label={`第 ${id} 关${id > openLevel ? '，未解锁' : save.best[id] ? `，${save.best[id].stars} 星通关` : ''}`} aria-current={id === save.current ? 'step' : undefined}>{id > openLevel ? <LockKeyhole size={13} /> : <><span>{String(id).padStart(2, '0')}</span>{save.best[id] && <Stars count={save.best[id].stars} small />}</>}</button>)}</div>
    </section>)}</div>;
  }
  return <main className="star-app">
    <header className="app-header"><div className="brand"><span className="brand-symbol"><Sparkles size={24} strokeWidth={1.8} /></span><span>星星连连<small>STAR BY STAR</small></span></div><div className="header-actions"><span className="saved-status"><span className={storageOkay ? 'status-dot' : 'status-dot warning'} />{saveStatus(account)}</span><button className="account-button" onClick={() => setAccountOpen(true)}><UserRound size={18} /><span>{account.user ? '我的记录' : '登录 / 记录'}</span></button><button className="round-button" aria-label="查看玩法" onClick={() => setHelpOpen(true)}><CircleHelp size={21} /></button></div></header>
    <div className="game-layout">
      <section className="game-column" aria-label="益智游戏">
        <div className="game-heading"><div><div className="eyebrow"><span />{CHAPTERS[chapter].name}<span className="level-divider">/</span>第 {String(save.current).padStart(2, '0')} 关</div><h1>连起一片小星光<span>。</span></h1></div><span className="level-stamp">{String(save.current).padStart(2, '0')}<small>/{LEVEL_COUNT}</small></span></div>
        <p className="game-instruction">点击格子旋转连线，让金色星星点亮所有星点。</p>
        <div className="difficulty-settings"><span>难度</span><RadioGroup className="difficulty-options" value={save.difficulty} onValueChange={requestDifficulty} disabled={!ready} aria-label="游戏难度">{DIFFICULTIES.map(d => <label key={d.id} className="difficulty-choice" data-selected={save.difficulty === d.id} htmlFor={`difficulty-${d.id}`}><RadioGroupItem id={`difficulty-${d.id}`} value={d.id} /><span>{d.label}</span></label>)}</RadioGroup></div>
        <div className="play-card">
          <div className="board-stats"><div className="lit-count"><Sparkles size={17} /><span>已点亮 <strong>{lit.size}</strong><span className="dim"> / {masks.length}</span></span></div><div className={`move-count ${remaining <= 3 && !won ? 'low-moves' : ''}`} aria-live="polite" aria-atomic="true">剩余 <strong>{remaining}</strong><span> / {limit} 次</span></div></div>
          <Progress className="light-progress" value={lit.size / masks.length * 100} aria-label={`已点亮 ${lit.size} 个，共 ${masks.length} 个星点`} />
          <div className={`board ${won ? 'board-won' : ''}`} style={{ '--grid-size': level.size } as CSSProperties} role="group" aria-label={`${level.size} 乘 ${level.size} 星光棋盘`}>
            {level.solution.map((base, index) => {
              const fixed = level.fixed.includes(index) || base === 15, source = index === level.source;
              const directions = ['上', '右', '下', '左'].filter((_, d) => masks[index] & (1 << d)).join('、');
              return <button id={`tile-${index}`} key={`${level.id}-${index}`} className={`tile ${lit.has(index) ? 'lit' : ''} ${source ? 'source' : ''} ${fixed ? 'fixed' : ''} ${highlight === index ? 'hinted' : ''}`} onClick={() => turn(index)} onKeyDown={e => keyboard(e, index)} disabled={!ready} aria-disabled={fixed || won || failed} aria-label={`第 ${Math.floor(index / level.size) + 1} 行第 ${index % level.size + 1} 列，${source ? '金色起点' : lit.has(index) ? '已点亮' : '未点亮'}，连线朝${directions}${failed ? '，次数已用完' : fixed ? '，固定' : '，点击顺时针旋转'}`}>
                <svg className="tile-lines" viewBox="0 0 100 100" aria-hidden="true" style={{ transform: `rotate(${run.turns[index] * 90}deg)` }}>{[0, 1, 2, 3].filter(d => base & (1 << d)).map(d => <path key={d} d={['M50 50V0', 'M50 50H100', 'M50 50V100', 'M50 50H0'][d]} />)}</svg>
                <span className="star-node">{source ? <Sparkles size={26} strokeWidth={1.8} /> : <Star strokeWidth={2} />}</span>{fixed && !source && <LockKeyhole className="tile-lock" size={10} aria-hidden="true" />}
              </button>;
            })}
          </div>
          <div className="board-legend"><span><i className="legend-dot origin" />星光起点</span><span><i className="legend-dot active" />已连通</span><span><i className="legend-dot sleeping" />待点亮</span></div>
        </div>
        <div className="game-tools"><button className="tool-button" onClick={() => dispatch({ type: 'undo' })} disabled={!ready || !run.history.length || won || failed}><Undo2 size={21} /><span>撤销</span></button><button className="tool-button hint-button" onClick={hint} disabled={!ready || won || failed}><Lightbulb size={22} /><span>{won || failed ? '提示' : `提示 · ${nextHintCost} 次`}</span></button><button className="tool-button" onClick={() => failed ? restart() : setRestartOpen(true)} disabled={!ready || run.moves === 0}><RotateCcw size={20} /><span>{failed ? '重试' : '重来'}</span></button></div>
        <div className="game-note" role="status" aria-live="polite">{message || (won ? '这一片星光，是你点亮的。' : failed ? '本关次数已用完，重新挑战或换个难度吧。' : remaining <= 3 ? `还剩 ${remaining} 次，先看一看再转动。撤销不会退还次数。` : save.current <= 3 ? '先试试没有小锁的格子，每转动一次扣 1 次。' : tips[Math.floor((save.current - 1) / 3) % tips.length])}</div>
        {won && <button className="continue-inline" onClick={() => save.current < LEVEL_COUNT ? select(save.current + 1) : setMapOpen(true)}>{save.current < LEVEL_COUNT ? '继续下一关' : '回看我的星光旅程'}<ArrowRight size={17} /></button>}
        <button className="mobile-levels" onClick={() => setMapOpen(true)}><Grid2X2 size={17} /><span>我的星光旅程</span><span>{completed} / {LEVEL_COUNT}</span><ChevronRight size={17} /></button>
      </section>
      <aside className="journey-panel"><div className="journey-title"><h2>星光旅程</h2><span><Star size={15} />{totalStars}<small> / 108</small></span></div><p className="journey-caption">一点一点，点亮你的整个小宇宙。</p><LevelMap /><div className="journey-foot"><Heart size={15} /><span>不用赶时间，慢慢来就好。</span></div></aside>
    </div>
    <footer className="app-footer"><span>{offlineReady ? <><WifiOff size={13} />已备好离线游玩</> : <><Check size={13} />不限时 · 随时接着玩</>}</span><span className="mobile-save-status">{saveStatus(account)}</span><span>给忙碌留一点小小的空白</span></footer>
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}><DialogContent className="game-dialog help-dialog" showCloseButton={false}><CloseButton /><span className="dialog-icon"><Lightbulb size={28} /></span><DialogTitle>一点就会的小玩法</DialogTitle><DialogDescription>把金色起点的光，传到每一颗星星。</DialogDescription><ol className="how-to"><li><b>01</b><div><strong>轻点，转一个方向</strong><p>每点一下，连线顺时针转 90°。带小锁的格子已经固定。</p></div></li><li><b>02</b><div><strong>对齐，星光就能流过去</strong><p>相邻两格的线接上，星星就会亮起。全部点亮即可过关。</p></div></li><li><b>03</b><div><strong>慢慢想，没有倒计时</strong><p>每关有旋转次数上限，难度越高次数越少。提示按实际旋转次数扣除，撤销不退次数；用完后可以重试。</p></div></li></ol><div className="offline-help"><Download size={20} /><div><strong>带着星光出门</strong><p>在线打开后，等底部出现“已备好离线游玩”。在手机浏览器菜单选择“添加到主屏幕”，以后可直接打开。游客进度只保存在这台设备。登录后可同步到云端；离线时继续本地保存，联网后再上传。</p></div></div><p className="keyboard-help">电脑也能玩：方向键选格子，空格或回车旋转。</p><DialogClose className="primary-button">知道啦，开始点星星<ArrowRight size={18} /></DialogClose></DialogContent></Dialog>
    <Dialog open={mapOpen} onOpenChange={setMapOpen}><DialogContent className="game-dialog map-dialog" showCloseButton={false}><CloseButton /><DialogTitle>我的星光旅程</DialogTitle><DialogDescription>{difficultyLabel}难度 · 已完成 {completed} / {LEVEL_COUNT} 关 · 收集 {totalStars} 颗星</DialogDescription><LevelMap compact /></DialogContent></Dialog>
    <Dialog open={ready && won && !successDismissed && !accountOpen} onOpenChange={open => { if (!open) setSuccessDismissed(true); }}><DialogContent className="game-dialog success-dialog" showCloseButton={false}><CloseButton /><div className="success-orbit"><Sparkles size={45} /></div><Stars count={rating(level, run)} /><span className="difficulty-result">{difficultyLabel}难度 · 本关上限 {limit} 次</span><DialogTitle>{save.current === LEVEL_COUNT ? '整个小宇宙，都亮了' : '又点亮了一片星光'}</DialogTitle><DialogDescription>{save.current === LEVEL_COUNT ? '36 关全部完成。每一颗星，都藏着你的耐心。' : ['今天的小快乐，又多了一点。', '慢慢想的你，也在闪闪发光。', '这片小小的星空，送给认真发光的你。'][(save.current - 1) % 3]}</DialogDescription><div className="result-stats"><span><b>{run.moves}</b>次旋转</span><span><b>{run.hints}</b>次提示</span><span><b>{completed}</b>关已完成</span></div><button className="primary-button" onClick={() => { if (save.current < LEVEL_COUNT) select(save.current + 1); else { setSuccessDismissed(true); setMapOpen(true); } }}>{save.current === LEVEL_COUNT ? '看看我的星光' : `继续第 ${String(save.current + 1).padStart(2, '0')} 关`}<ArrowRight size={18} /></button><DialogClose className="text-button">{storageOkay ? '歇一会儿，进度已经保存' : '歇一会儿，暂时留在这页'}</DialogClose></DialogContent></Dialog>
    <Dialog open={ready && failed && !failureDismissed && !accountOpen} onOpenChange={open => { if (!open) setFailureDismissed(true); }}>
      <DialogContent className="game-dialog success-dialog failure-dialog" showCloseButton={false}>
        <CloseButton /><span className="failure-symbol"><RotateCcw size={35} /></span>
        <DialogTitle>这次差一点点</DialogTitle>
        <DialogDescription>{difficultyLabel}难度的 {limit} 次旋转已用完，点亮了 {lit.size} / {masks.length} 颗星。先想想连线的方向，再试一次吧。</DialogDescription>
        <button className="primary-button" onClick={restart}>再挑战一次<RotateCcw size={18} /></button>
        {save.difficulty !== 'easy' && <button className="secondary-button" onClick={() => requestDifficulty(save.difficulty === 'challenge' ? 'standard' : 'easy')}>换成{save.difficulty === 'challenge' ? '标准' : '轻松'}难度</button>}
        <DialogClose className="text-button">先看看棋盘</DialogClose>
      </DialogContent>
    </Dialog>
    <AlertDialog open={pendingDifficulty !== null} onOpenChange={open => { if (!open) setPendingDifficulty(null); }}>
      <AlertDialogContent className="game-dialog restart-dialog">
        <AlertDialogTitle>切换到{DIFFICULTIES.find(d => d.id === pendingDifficulty)?.label}难度？</AlertDialogTitle>
        <AlertDialogDescription>本关会从头开始，旋转上限变为 {pendingDifficulty ? moveLimit(level, pendingDifficulty) : limit} 次。已经解锁的关卡、星星和其他关卡的进度会保留。</AlertDialogDescription>
        <div className="restart-actions"><AlertDialogCancel className="secondary-button">保留当前</AlertDialogCancel><button className="primary-button" onClick={() => { if (pendingDifficulty) changeDifficulty(pendingDifficulty); }}>切换并重开</button></div>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={restartOpen} onOpenChange={setRestartOpen}><AlertDialogContent className="game-dialog restart-dialog"><AlertDialogTitle>重新点亮这一关？</AlertDialogTitle><AlertDialogDescription>本关连线和步数会重新开始，已经获得的星星会保留。</AlertDialogDescription><div className="restart-actions"><AlertDialogCancel className="secondary-button">再想想</AlertDialogCancel><button className="primary-button" onClick={restart}>重新开始</button></div></AlertDialogContent></AlertDialog>
    <AccountPanel account={account} open={accountOpen} onOpenChange={setAccountOpen} />
  </main>;
}
