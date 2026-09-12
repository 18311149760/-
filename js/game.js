/* ============================================================
 * 甜心消消乐 · 游戏逻辑（羊了个羊式层叠三消）
 * ============================================================ */
(function () {
  'use strict';

  var ORDER = window.SweetIcons.ORDER;
  var NAMES = window.SweetIcons.NAMES;
  var svgOf = window.SweetIcons.svgOf;

  /* ---------------- 难度配置 ---------------- */
  var DIFFS = {
    easy:   { label: '简单', types: 6,  tiles: 48,  layers: 3, cols: 7, rows: 6, star3: 90,  star2: 150 },
    medium: { label: '中等', types: 9,  tiles: 81,  layers: 4, cols: 8, rows: 7, star3: 150, star2: 240 },
    hard:   { label: '困难', types: 12, tiles: 120, layers: 5, cols: 9, rows: 8, star3: 240, star2: 360 }
  };
  var DIFF_ORDER = ['easy', 'medium', 'hard'];
  var TRAY_SIZE = 7;

  /* ---------------- DOM ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  var boardEl = $('board'), trayEl = $('tray'), fxEl = $('fxLayer');
  var parkRowEl = $('parkRow'), parkSlotsEl = $('parkSlots');
  var overlayEl = $('overlay');

  /* ---------------- 状态 ---------------- */
  var S = null; // 当前局状态

  function newState(diff) {
    return {
      diff: diff, cfg: DIFFS[diff],
      tiles: [],          // {id, key, x, y, layer, loc:'board'|'tray'|'park'|'gone', el}
      tray: [],           // tile id 顺序
      park: [],
      history: [],        // 可进行撤回的 tile id（按移动顺序）
      props: { undo: 3, park: 2, shuffle: 2 },
      busy: false, over: false,
      startedAt: null, timerId: null, elapsed: 0,
      nextId: 1
    };
  }

  /* ---------------- 小工具 ---------------- */
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function fmtTime(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ---------------- 音效（WebAudio 合成） ---------------- */
  var audio = { ctx: null, muted: localStorage.getItem('sweet.muted') === '1' };
  function ac() {
    if (!audio.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audio.ctx = new AC();
    }
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
    return audio.ctx;
  }
  function tone(freq, t0, dur, type, vol) {
    var ctx = ac(); if (!ctx || audio.muted) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    var t = ctx.currentTime + t0;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol || .18, t + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + .05);
  }
  var sfx = {
    pick:   function () { tone(660, 0, .12, 'triangle', .16); tone(880, .05, .1, 'sine', .1); },
    match:  function () { tone(523, 0, .14, 'triangle', .16); tone(659, .07, .14, 'triangle', .16); tone(784, .14, .2, 'triangle', .18); },
    bad:    function () { tone(220, 0, .18, 'sawtooth', .07); },
    win:    function () { [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone(f, i * .11, .22, 'triangle', .16); }); },
    lose:   function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, i * .14, .24, 'sine', .14); }); },
    prop:   function () { tone(980, 0, .1, 'sine', .12); tone(1220, .06, .12, 'sine', .1); }
  };

  /* ---------------- 棋盘生成 ---------------- */
  function genPositions(cfg) {
    // 半格坐标系：每个方块占 2x2 半格，棋盘宽 cols 格 = cols*2 半格
    var W = cfg.cols * 2, H = cfg.rows * 2;
    var pos = [];
    for (var l = 0; l < cfg.layers; l++) {
      var inset = l * 2; // 每高一层内缩 1 格
      var x0 = inset, y0 = inset, x1 = W - 2 - inset, y1 = H - 2 - inset;
      if (x1 < x0 || y1 < y0) break;
      // 高层加一点随机平移，更有堆叠感
      var shiftX = l === 0 ? 0 : (Math.floor(Math.random() * 3) - 1);
      var shiftY = l === 0 ? 0 : (Math.floor(Math.random() * 3) - 1);
      for (var x = x0; x <= x1; x += 2) {
        for (var y = y0; y <= y1; y += 2) {
          // 底层随机挖掉一些边角，形状更可爱
          if (l === 0) {
            var edge = (x === x0 || x === x1 || y === y0 || y === y1);
            if (edge && Math.random() < .18) continue;
          }
          pos.push({ x: x + shiftX, y: y + shiftY, layer: l });
        }
      }
    }
    // 裁剪到目标数量（优先从底层边缘删，保持上层造型）
    while (pos.length > cfg.tiles) {
      var cands = [];
      for (var i = 0; i < pos.length; i++) if (pos[i].layer === 0) cands.push(i);
      var idx = cands.length ? cands[Math.floor(Math.random() * cands.length)]
                             : Math.floor(Math.random() * pos.length);
      pos.splice(idx, 1);
    }
    return pos;
  }

  function genIcons(cfg, count) {
    // 保证每种图案数量是 3 的倍数
    var triples = Math.floor(count / 3);
    var keys = [];
    for (var i = 0; i < triples; i++) {
      var key = ORDER[i % cfg.types];
      keys.push(key, key, key);
    }
    return shuffle(keys);
  }

  /* ---------------- 渲染 ---------------- */
  function tileSizePx() {
    var cfg = S.cfg;
    var rect = boardEl.getBoundingClientRect();
    var unitW = rect.width / (cfg.cols + .4);
    var unitH = rect.height / (cfg.rows + .4);
    return Math.min(unitW, unitH);
  }

  function layoutBoard() {
    if (!S) return;
    var ts = tileSizePx();
    var cfg = S.cfg;
    var rect = boardEl.getBoundingClientRect();
    var contentW = cfg.cols * ts, contentH = cfg.rows * ts;
    var offX = (rect.width - contentW) / 2, offY = (rect.height - contentH) / 2;
    S.tiles.forEach(function (t) {
      if (t.loc !== 'board') return;
      t.el.style.width = ts + 'px';
      t.el.style.height = ts + 'px';
      t.el.style.left = (offX + t.x * ts / 2) + 'px';
      t.el.style.top = (offY + t.y * ts / 2) + 'px';
      t.el.style.zIndex = 10 + t.layer * 10;
    });
  }

  function makeTileEl(t) {
    var el = document.createElement('button');
    el.className = 'tile';
    el.dataset.id = t.id;
    el.setAttribute('aria-label', NAMES[t.key]);
    el.innerHTML = svgOf(t.key);
    el.addEventListener('click', function () { onTileTap(t.id); });
    return el;
  }

  function renderAll() {
    boardEl.innerHTML = '';
    S.tiles.forEach(function (t) {
      if (t.loc === 'board') boardEl.appendChild(t.el);
    });
    layoutBoard();
    refreshLockStates();
    renderTraySlots();
    renderPark();
    renderProps();
  }

  function isFree(t) {
    if (t.loc !== 'board') return false;
    for (var i = 0; i < S.tiles.length; i++) {
      var o = S.tiles[i];
      if (o.loc === 'board' && o.layer > t.layer &&
          Math.abs(o.x - t.x) < 2 && Math.abs(o.y - t.y) < 2) return false;
    }
    return true;
  }

  function refreshLockStates() {
    S.tiles.forEach(function (t) {
      if (t.loc !== 'board') return;
      var free = isFree(t);
      if (t._free === free) return;
      t._free = free;
      t.el.classList.toggle('free', free);
      t.el.classList.toggle('locked', !free);
      t.el.disabled = !free;
    });
  }

  /* ---------------- 托盘 ---------------- */
  function ensureTraySlots() {
    if (trayEl.children.length === TRAY_SIZE) return;
    trayEl.innerHTML = '';
    for (var i = 0; i < TRAY_SIZE; i++) {
      var slot = document.createElement('div');
      slot.className = 'slot';
      trayEl.appendChild(slot);
    }
  }

  function renderTraySlots() {
    ensureTraySlots();
    for (var i = 0; i < TRAY_SIZE; i++) {
      var slot = trayEl.children[i];
      var id = S.tray[i];
      if (slot._tileId === id) continue;
      while (slot.children[0]) slot.removeChild(slot.children[0]);
      slot._tileId = null;
      if (id !== undefined) {
        var t = byId(id);
        t.el.style.cssText = '';
        t.el.classList.remove('free', 'locked');
        t.el.disabled = true;
        slot.appendChild(t.el);
        slot._tileId = id;
      }
    }
    trayEl.classList.toggle('danger', S.tray.length >= TRAY_SIZE - 2);
  }

  function renderPark() {
    parkRowEl.hidden = S.park.length === 0;
    parkSlotsEl.innerHTML = '';
    S.park.forEach(function (id) {
      var t = byId(id);
      t.el.style.cssText = '';
      t.el.classList.remove('locked');
      t.el.classList.add('free');
      t.el.disabled = false;
      parkSlotsEl.appendChild(t.el);
    });
  }

  function renderProps() {
    $('cntUndo').textContent = S.props.undo;
    $('cntPark').textContent = S.props.park;
    $('cntShuffle').textContent = S.props.shuffle;
    $('btnUndo').disabled = S.props.undo <= 0;
    $('btnPark').disabled = S.props.park <= 0;
    $('btnShuffle').disabled = S.props.shuffle <= 0;
  }

  function byId(id) {
    for (var i = 0; i < S.tiles.length; i++) if (S.tiles[i].id === id) return S.tiles[i];
    return null;
  }

  /* ---------------- 飞行动画 ---------------- */
  function flyTo(el, toRect, done) {
    var fromRect = el.getBoundingClientRect();
    var clone = el.cloneNode(true);
    clone.className = 'tile fly';
    clone.style.cssText =
      'position:fixed;left:' + fromRect.left + 'px;top:' + fromRect.top + 'px;' +
      'width:' + fromRect.width + 'px;height:' + fromRect.height + 'px;margin:0;';
    fxEl.appendChild(clone);
    el.style.visibility = 'hidden';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
        var dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);
        var sc = toRect.width / fromRect.width;
        clone.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')';
      });
    });
    setTimeout(function () {
      clone.remove();
      el.style.visibility = '';
      done();
    }, 320);
  }

  function burst(rect, color) {
    for (var i = 0; i < 10; i++) {
      var s = document.createElement('i');
      s.className = 'spark';
      var size = 6 + Math.random() * 10;
      var ang = Math.random() * Math.PI * 2, dist = 26 + Math.random() * 40;
      s.style.cssText = 'left:' + (rect.left + rect.width / 2 - size / 2) + 'px;' +
        'top:' + (rect.top + rect.height / 2 - size / 2) + 'px;' +
        'width:' + size + 'px;height:' + size + 'px;--c:' + color + ';' +
        '--dx:' + (Math.cos(ang) * dist) + 'px;--dy:' + (Math.sin(ang) * dist) + 'px;';
      fxEl.appendChild(s);
      (function (node) { setTimeout(function () { node.remove(); }, 600); })(s);
    }
  }

  function confetti() {
    var colors = ['#ff7eb3', '#ffd94d', '#b07ef7', '#6f9dff', '#7edb8f', '#ff9d9d'];
    for (var i = 0; i < 60; i++) {
      var c = document.createElement('i');
      c.className = 'confetti';
      var size = 6 + Math.random() * 8;
      c.style.cssText = 'left:' + (Math.random() * 100) + 'vw;width:' + size + 'px;height:' +
        (size * .6) + 'px;background:' + colors[i % colors.length] + ';' +
        '--dur:' + (2.2 + Math.random() * 1.6) + 's;--rot:' + (360 + Math.random() * 720) + 'deg;' +
        'animation-delay:' + (Math.random() * .5) + 's;';
      fxEl.appendChild(c);
      (function (node) { setTimeout(function () { node.remove(); }, 4500); })(c);
    }
  }

  /* ---------------- 核心操作 ---------------- */
  function onTileTap(id) {
    if (!S || S.busy || S.over) return;
    var t = byId(id);
    if (!t) return;

    if (t.loc === 'park') { unparkTile(t); return; }
    if (t.loc !== 'board' || !isFree(t)) return;

    startTimer();
    if (S.tray.length >= TRAY_SIZE) return;

    S.busy = true;
    sfx.pick();

    // 计算插入位置（相同图案排在一起）
    var insertAt = S.tray.length;
    for (var i = S.tray.length - 1; i >= 0; i--) {
      if (byId(S.tray[i]).key === t.key) { insertAt = i + 1; break; }
    }

    t.loc = 'tray';
    S.tray.splice(insertAt, 0, t.id);
    S.history.push(t.id);
    refreshLockStates();

    var slotIndex = insertAt;
    var slotRect;
    // 托盘 DOM 尚未更新，先临时渲染再取目标位置
    renderTraySlots();
    slotRect = trayEl.children[slotIndex].getBoundingClientRect();
    // 元素此刻已在托盘中，取它原来的视觉位置做动画：先把元素移回棋盘坐标再飞
    trayEl.children[slotIndex]._tileId = null;
    boardEl.appendChild(t.el);
    layoutOne(t);
    flyTo(t.el, slotRect, function () {
      renderTraySlots();
      S.busy = false;
      afterTrayChange();
    });
  }

  function layoutOne(t) {
    var ts = tileSizePx();
    var rect = boardEl.getBoundingClientRect();
    var contentW = S.cfg.cols * ts, contentH = S.cfg.rows * ts;
    t.el.style.width = ts + 'px'; t.el.style.height = ts + 'px';
    t.el.style.left = ((rect.width - contentW) / 2 + t.x * ts / 2) + 'px';
    t.el.style.top = ((rect.height - contentH) / 2 + t.y * ts / 2) + 'px';
    t.el.style.zIndex = 10 + t.layer * 10;
  }

  function afterTrayChange() {
    // 检查三消
    var counts = {};
    S.tray.forEach(function (id) {
      var k = byId(id).key;
      counts[k] = (counts[k] || 0) + 1;
    });
    var matchKey = null;
    for (var k in counts) if (counts[k] >= 3) { matchKey = k; break; }

    if (matchKey) {
      S.busy = true;
      var removeIds = [];
      for (var i = 0; i < S.tray.length && removeIds.length < 3; i++) {
        if (byId(S.tray[i]).key === matchKey) removeIds.push(S.tray[i]);
      }
      setTimeout(function () {
        sfx.match();
        removeIds.forEach(function (id) {
          var t = byId(id);
          burst(t.el.getBoundingClientRect(), '#ffd94d');
          t.el.classList.add('pop');
        });
        setTimeout(function () {
          removeIds.forEach(function (id) {
            var t = byId(id);
            t.loc = 'gone';
            t.el.remove();
          });
          S.tray = S.tray.filter(function (id) { return removeIds.indexOf(id) === -1; });
          S.history = S.history.filter(function (id) { return removeIds.indexOf(id) === -1; });
          renderTraySlots();
          S.busy = false;
          afterTrayChange(); // 可能还有下一组
        }, 380);
      }, 120);
      return;
    }

    // 失败判定
    if (S.tray.length >= TRAY_SIZE) { gameOver(false); return; }
    // 胜利判定
    if (boardRemaining() === 0 && S.tray.length === 0 && S.park.length === 0) { gameOver(true); }
  }

  function boardRemaining() {
    var n = 0;
    S.tiles.forEach(function (t) { if (t.loc === 'board') n++; });
    return n;
  }

  /* ---------------- 道具 ---------------- */
  $('btnUndo').addEventListener('click', function () {
    if (!S || S.busy || S.over || S.props.undo <= 0) return;
    // 找到最后一个仍在托盘里的
    var id = null;
    while (S.history.length) {
      var cand = S.history.pop();
      if (byId(cand) && byId(cand).loc === 'tray') { id = cand; break; }
    }
    if (id === null) { shakeTray(); return; }
    S.props.undo--;
    sfx.prop();
    var t = byId(id);
    S.tray = S.tray.filter(function (x) { return x !== id; });
    t.loc = 'board';
    boardEl.appendChild(t.el);
    layoutOne(t);
    t.el.classList.remove('pop');
    renderTraySlots();
    refreshLockStates();
    renderProps();
  });

  $('btnPark').addEventListener('click', function () {
    if (!S || S.busy || S.over || S.props.park <= 0) return;
    if (S.tray.length === 0) { shakeTray(); return; }
    S.props.park--;
    sfx.prop();
    var move = S.tray.slice(0, 3);
    move.forEach(function (id) {
      var t = byId(id);
      t.loc = 'park';
      S.park.push(id);
      S.history = S.history.filter(function (x) { return x !== id; });
    });
    S.tray = S.tray.filter(function (id) { return move.indexOf(id) === -1; });
    renderTraySlots();
    renderPark();
    renderProps();
  });

  $('btnShuffle').addEventListener('click', function () {
    if (!S || S.busy || S.over || S.props.shuffle <= 0) return;
    var remaining = S.tiles.filter(function (t) { return t.loc === 'board'; });
    if (remaining.length < 2) return;
    S.props.shuffle--;
    sfx.prop();
    var keys = shuffle(remaining.map(function (t) { return t.key; }));
    remaining.forEach(function (t, i) {
      t.key = keys[i];
      t.el.innerHTML = svgOf(t.key);
      t.el.setAttribute('aria-label', NAMES[t.key]);
      t.el.classList.add('hint');
      (function (el) { setTimeout(function () { el.classList.remove('hint'); }, 1900); })(t.el);
    });
    renderProps();
  });

  function unparkTile(t) {
    if (S.busy || S.over) return;
    if (S.tray.length >= TRAY_SIZE) { shakeTray(); sfx.bad(); return; }
    sfx.pick();
    t.loc = 'tray';
    S.park = S.park.filter(function (x) { return x !== t.id; });
    var insertAt = S.tray.length;
    for (var i = S.tray.length - 1; i >= 0; i--) {
      if (byId(S.tray[i]).key === t.key) { insertAt = i + 1; break; }
    }
    S.tray.splice(insertAt, 0, t.id);
    S.history.push(t.id);
    renderTraySlots();
    renderPark();
    afterTrayChange();
  }

  function shakeTray() {
    trayEl.classList.remove('shake');
    void trayEl.offsetWidth;
    trayEl.classList.add('shake');
  }

  /* ---------------- 计时 ---------------- */
  function startTimer() {
    if (S.startedAt) return;
    S.startedAt = Date.now();
    S.timerId = setInterval(function () {
      S.elapsed = Math.floor((Date.now() - S.startedAt) / 1000);
      $('hudTimer').textContent = fmtTime(S.elapsed);
    }, 500);
  }
  function stopTimer() {
    if (S && S.timerId) { clearInterval(S.timerId); S.timerId = null; }
  }

  /* ---------------- 结算 ---------------- */
  function gameOver(win) {
    S.over = true;
    stopTimer();
    var cfg = S.cfg;
    setTimeout(function () {
      var emoji, title, desc, stars = 0;
      if (win) {
        sfx.win(); confetti();
        stars = S.elapsed <= cfg.star3 ? 3 : (S.elapsed <= cfg.star2 ? 2 : 1);
        emoji = '🎉'; title = '太棒了！';
        desc = '用时 ' + fmtTime(S.elapsed) + ' 通关「' + cfg.label + '」';
        var best = loadBest(S.diff);
        if (!best || S.elapsed < best.time) {
          saveBest(S.diff, { time: S.elapsed, stars: stars });
          desc += ' · 新纪录！';
        }
        renderBestLabels();
      } else {
        sfx.lose();
        emoji = '💔'; title = '格子满啦';
        desc = '别灰心，换个顺序再试一次吧';
      }
      $('modalEmoji').textContent = emoji;
      $('modalTitle').textContent = title;
      $('modalDesc').textContent = desc;
      var starHtml = '';
      if (win) {
        for (var i = 0; i < 3; i++) {
          starHtml += '<span class="st' + (i < stars ? '' : ' dim') + '">⭐</span>';
        }
      }
      $('modalStars').innerHTML = starHtml;
      var nextIdx = DIFF_ORDER.indexOf(S.diff) + 1;
      $('btnModalNext').hidden = !(win && nextIdx < DIFF_ORDER.length);
      if (win && nextIdx < DIFF_ORDER.length) {
        $('btnModalNext').textContent = '挑战「' + DIFFS[DIFF_ORDER[nextIdx]].label + '」难度 ➜';
        $('btnModalNext').dataset.next = DIFF_ORDER[nextIdx];
      }
      overlayEl.classList.add('show');
    }, win ? 500 : 350);
  }

  function loadBest(diff) {
    try { return JSON.parse(localStorage.getItem('sweet.best.' + diff)); } catch (e) { return null; }
  }
  function saveBest(diff, rec) {
    localStorage.setItem('sweet.best.' + diff, JSON.stringify(rec));
  }
  function renderBestLabels() {
    document.querySelectorAll('[data-best]').forEach(function (el) {
      var b = loadBest(el.dataset.best);
      el.textContent = b ? '最佳 ' + fmtTime(b.time) + '\n' + '⭐'.repeat(b.stars) : '';
    });
  }

  /* ---------------- 开局 ---------------- */
  function startGame(diff) {
    stopTimer();
    S = newState(diff);
    var cfg = S.cfg;
    var pos = genPositions(cfg);
    pos.length = pos.length - (pos.length % 3);
    var keys = genIcons(cfg, pos.length);
    pos.forEach(function (p, i) {
      var t = { id: S.nextId++, key: keys[i], x: p.x, y: p.y, layer: p.layer, loc: 'board', el: null, _free: null };
      t.el = makeTileEl(t);
      S.tiles.push(t);
    });
    $('hudDiff').textContent = cfg.label;
    $('hudTimer').textContent = '0:00';
    renderAll();
    switchScreen('game');
  }

  function switchScreen(name) {
    $('screenHome').classList.toggle('is-active', name === 'home');
    $('screenGame').classList.toggle('is-active', name === 'game');
    if (name === 'game') {
      // 等布局完成后再摆放方块
      requestAnimationFrame(function () { layoutBoard(); });
    }
  }

  /* ---------------- 事件绑定 ---------------- */
  $('diffCards').addEventListener('click', function (e) {
    var card = e.target.closest('.diff-card');
    if (card) { ac(); sfx.pick(); startGame(card.dataset.diff); }
  });
  $('btnHome').addEventListener('click', function () { stopTimer(); switchScreen('home'); renderBestLabels(); });
  $('btnRestart').addEventListener('click', function () { if (S) startGame(S.diff); });
  $('btnMute').addEventListener('click', function () {
    audio.muted = !audio.muted;
    localStorage.setItem('sweet.muted', audio.muted ? '1' : '0');
    $('btnMute').classList.toggle('muted', audio.muted);
  });
  $('btnModalHome').addEventListener('click', function () {
    overlayEl.classList.remove('show'); switchScreen('home'); renderBestLabels();
  });
  $('btnModalAgain').addEventListener('click', function () {
    overlayEl.classList.remove('show'); startGame(S.diff);
  });
  $('btnModalNext').addEventListener('click', function () {
    overlayEl.classList.remove('show'); startGame($('btnModalNext').dataset.next);
  });

  window.addEventListener('resize', layoutBoard);

  /* ---------------- 首页装饰 ---------------- */
  function decorate() {
    // 星星闪烁背景
    var holder = $('bgStars');
    for (var i = 0; i < 28; i++) {
      var s = document.createElement('i');
      var size = 4 + Math.random() * 10;
      s.style.cssText = 'left:' + (Math.random() * 100) + '%;top:' + (Math.random() * 100) + '%;' +
        'width:' + size + 'px;height:' + size + 'px;--dur:' + (2 + Math.random() * 3) + 's;' +
        'animation-delay:' + (Math.random() * 3) + 's;';
      holder.appendChild(s);
    }
    // 漂浮小图标
    var map = { fi1: 'star', fi2: 'heart', fi3: 'strawberry', fi4: 'bow', fi5: 'flower', fi6: 'cat' };
    Object.keys(map).forEach(function (cls) {
      var el = document.querySelector('.' + cls);
      if (el) el.innerHTML = svgOf(map[cls]);
    });
    // 难度卡图标
    var dmap = { easy: 'star', medium: 'heart', hard: 'moon' };
    document.querySelectorAll('.diff-card').forEach(function (card) {
      var icon = card.querySelector('.diff-icon');
      icon.innerHTML = svgOf(dmap[card.dataset.diff]);
    });
    // logo 上方的小蝴蝶结
    document.querySelector('.logo-crown').innerHTML = svgOf('bow');
    // 静音按钮初始态
    $('btnMute').classList.toggle('muted', audio.muted);
    renderBestLabels();
  }

  decorate();
})();
