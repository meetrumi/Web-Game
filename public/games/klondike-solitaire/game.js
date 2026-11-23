/* Klondike Solitaire on ../shared/core.js.
   Standard rules: build the four foundations up by suit from Ace to King; build the
   seven tableau columns down in alternating colours; only Kings go into empty
   columns. Drag cards, or tap one to send it to the best legal spot. Draw-1 or
   Draw-3, unlimited passes through the stock, unlimited undo, and an auto-finish
   once every card is face up. Best time and fewest moves are kept per draw mode. */
(function (CV) {
  'use strict'
  var ID = 'klondike-solitaire'
  var SUITS = ['♠', '♥', '♦', '♣']
  var RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

  var view = CV.canvas('#c'), ctx = view.ctx
  var hud = CV.hud([{ key: 'mv', label: 'Moves' }, { key: 't', label: 'Time' }])
  var over = CV.overlay()
  var draw3 = CV.load(ID + ':draw3', false) === true
  var S, history, time, moves, playing = false, drag = null, auto = 0, L = {}

  function btn(label, fn) {
    var b = CV.el('button', 'cv-btn cv-btn-ghost', label); b.type = 'button'
    b.addEventListener('click', fn); hud.right.insertBefore(b, hud.right.lastChild); return b
  }
  var undoBtn = btn('Undo', undo)
  var drawBtn = btn('', function () { draw3 = !draw3; CV.save(ID + ':draw3', draw3); deal(); playing = true })
  btn('New', function () { deal(); playing = true })
  function paintDraw() { drawBtn.textContent = draw3 ? 'Draw 3' : 'Draw 1' }

  function red(c) { return c.s === 1 || c.s === 2 }
  function bestKey() { return ID + ':best:' + (draw3 ? 3 : 1) }
  function showBest() { /* best time is shown on the win screen; the top bar is kept short for phones */ }

  function deal() {
    var deck = []
    for (var s = 0; s < 4; s++) for (var r = 1; r <= 13; r++) deck.push({ s: s, r: r, up: false })
    for (var i = deck.length - 1; i > 0; i--) { var j = CV.randInt(0, i), t = deck[i]; deck[i] = deck[j]; deck[j] = t }
    S = { stock: [], waste: [], found: [[], [], [], []], tab: [[], [], [], [], [], [], []] }
    for (var c = 0; c < 7; c++) for (var k = 0; k <= c; k++) { var card = deck.pop(); card.up = k === c; S.tab[c].push(card) }
    S.stock = deck
    history = []; time = 0; moves = 0; auto = 0; drag = null
    hud.set('mv', '0'); hud.set('t', '0:00'); paintDraw(); showBest()
  }

  function snapshot() { history.push(JSON.stringify(S)); if (history.length > 300) history.shift() }
  function undo() {
    if (!history.length || auto) return
    S = JSON.parse(history.pop()); moves++; hud.set('mv', String(moves)); CV.beep(300, 0.05, 'triangle', 0.03)
  }

  /* ------------------------------------------------------------- layout */
  function layout() {
    var w = view.w, h = view.h, gap = Math.max(4, Math.round(w * 0.012))
    var cw = Math.min((w - gap * 8) / 7, (h - 64) / 4.3, 110)
    L.gap = gap; L.cw = cw; L.ch = cw * 1.4
    L.ox = (w - (cw * 7 + gap * 6)) / 2
    L.top = 54; L.tabY = L.top + L.ch + gap * 2
  }
  view.onResize = layout
  function colX(i) { return L.ox + i * (L.cw + L.gap) }

  /** y position of every card in tableau column i, compressed to fit the screen. */
  function tabYs(i) {
    var pile = S.tab[i], ys = [], downs = 0, ups = 0, k
    for (k = 0; k < pile.length - 1; k++) { if (pile[k].up) ups++; else downs++ }
    var avail = view.h - L.tabY - L.ch - 8
    var dOff = L.ch * 0.12, uOff = L.ch * 0.27
    var need = downs * dOff + ups * uOff
    if (need > avail && need > 0) { var f = avail / need; dOff *= f; uOff *= f }
    var y = L.tabY
    for (k = 0; k < pile.length; k++) { ys.push(y); y += pile[k].up ? uOff : dOff }
    return ys
  }

  function wasteShown() { return draw3 ? S.waste.slice(-3) : S.waste.slice(-1) }
  function wasteX(k, n) { return colX(1) + (draw3 ? k * L.cw * 0.28 : 0) - (draw3 && n ? 0 : 0) }

  /* -------------------------------------------------------------- rules */
  function canFound(card, fi) {
    var f = S.found[fi]
    return f.length ? f[f.length - 1].s === card.s && card.r === f[f.length - 1].r + 1 : card.r === 1
  }
  function canTab(card, ti) {
    var t = S.tab[ti]
    if (!t.length) return card.r === 13
    var top = t[t.length - 1]
    return top.up && red(top) !== red(card) && card.r === top.r - 1
  }

  function cardsFrom(src) {
    if (src.type === 'waste') return S.waste.slice(-1)
    if (src.type === 'found') return S.found[src.i].slice(-1)
    return S.tab[src.i].slice(src.j)
  }

  function removeFrom(src, n) {
    var pile = src.type === 'waste' ? S.waste : src.type === 'found' ? S.found[src.i] : S.tab[src.i]
    pile.splice(pile.length - n, n)
    if (src.type === 'tab' && pile.length && !pile[pile.length - 1].up) pile[pile.length - 1].up = true
  }

  function move(src, dst) {
    var cards = cardsFrom(src)
    snapshot()
    removeFrom(src, cards.length)
    var target = dst.type === 'found' ? S.found[dst.i] : S.tab[dst.i]
    cards.forEach(function (c) { target.push(c) })
    moves++; hud.set('mv', String(moves))
    CV.beep(dst.type === 'found' ? 880 : 620, 0.05, 'triangle', 0.04)
    checkEnd()
  }

  function drawStock() {
    snapshot()
    if (!S.stock.length) {
      if (!S.waste.length) { history.pop(); return }
      S.stock = S.waste.reverse().map(function (c) { c.up = false; return c }); S.waste = []
      CV.beep(240, 0.06, 'sine', 0.04)
    } else {
      var n = draw3 ? 3 : 1
      for (var k = 0; k < n && S.stock.length; k++) { var c = S.stock.pop(); c.up = true; S.waste.push(c) }
      CV.beep(500, 0.03, 'sine', 0.03)
    }
    moves++; hud.set('mv', String(moves))
  }

  /** Tap-to-move: foundation first for a single card, then the first legal column. */
  function autoMove(src) {
    var cards = cardsFrom(src), i
    if (!cards.length) return false
    if (cards.length === 1 && src.type !== 'found') {
      for (i = 0; i < 4; i++) if (canFound(cards[0], i)) { move(src, { type: 'found', i: i }); return true }
    }
    for (i = 0; i < 7; i++) {
      if (src.type === 'tab' && src.i === i) continue
      if (cards[0].r === 13 && src.type === 'tab' && src.j === 0) continue // pointless King shuffle
      if (canTab(cards[0], i)) { move(src, { type: 'tab', i: i }); return true }
    }
    CV.beep(150, 0.06, 'square', 0.025)
    return false
  }

  function allUp() {
    if (S.stock.length || S.waste.length) return false
    return S.tab.every(function (p) { return p.every(function (c) { return c.up }) })
  }

  function checkEnd() {
    var done = S.found.reduce(function (a, f) { return a + f.length }, 0) === 52
    if (done) { win(); return }
    if (!auto && allUp()) { auto = 0.0001; CV.toast('Auto-finishing...') }
  }

  function autoStep() {
    for (var i = 0; i < 7; i++) {
      var p = S.tab[i]
      if (!p.length) continue
      for (var f = 0; f < 4; f++) if (canFound(p[p.length - 1], f)) { move({ type: 'tab', i: i, j: p.length - 1 }, { type: 'found', i: f }); return }
    }
    auto = 0
  }

  function win() {
    playing = false; auto = 0
    var t = Math.max(1, Math.floor(time)), prev = CV.load(bestKey(), null)
    var record = !prev || t < prev.t
    if (record) CV.save(bestKey(), { t: t, m: moves })
    showBest()
    CV.chord([523, 659, 784, 1047, 1319], 90)
    over.show({ title: 'You won!', score: CV.fmtTime(t), sub: (record ? 'New best time' : 'Best ' + CV.fmtTime(prev.t)) + ' · ' + moves + ' moves',
      body: (draw3 ? 'Draw 3' : 'Draw 1') + ' game complete. Fancy a harder deal? Switch draw mode in the top bar.', button: 'Deal again', onStart: function () { deal(); playing = true } })
  }

  /* -------------------------------------------------------------- input */
  function inside(pt, x, y, w, h) { return pt.x >= x && pt.x <= x + w && pt.y >= y && pt.y <= y + h }

  function hit(pt) {
    var i
    if (inside(pt, colX(0), L.top, L.cw, L.ch)) return { type: 'stock' }
    var shown = wasteShown()
    if (shown.length) {
      var wx = wasteX(shown.length - 1)
      if (inside(pt, wx, L.top, L.cw, L.ch)) return { type: 'waste', x: wx, y: L.top }
    }
    for (i = 0; i < 4; i++) if (S.found[i].length && inside(pt, colX(3 + i), L.top, L.cw, L.ch)) return { type: 'found', i: i, x: colX(3 + i), y: L.top }
    for (i = 0; i < 7; i++) {
      var ys = tabYs(i), p = S.tab[i]
      for (var j = p.length - 1; j >= 0; j--) {
        var bottom = j === p.length - 1 ? ys[j] + L.ch : ys[j + 1]
        if (p[j].up && inside(pt, colX(i), ys[j], L.cw, bottom - ys[j])) return { type: 'tab', i: i, j: j, x: colX(i), y: ys[j] }
      }
    }
    return null
  }

  function dropTarget(pt) {
    var card = drag.cards[0], cx = pt.x - drag.dx + L.cw / 2, cy = pt.y - drag.dy + L.ch / 2, i
    if (drag.cards.length === 1 && cy < L.tabY) {
      for (i = 0; i < 4; i++) if (Math.abs(cx - (colX(3 + i) + L.cw / 2)) < L.cw * 0.75 && canFound(card, i)) return { type: 'found', i: i }
    }
    var bestI = -1, bd = Infinity
    for (i = 0; i < 7; i++) {
      var d = Math.abs(cx - (colX(i) + L.cw / 2))
      if (d < bd && d < L.cw * 0.9 && canTab(card, i) && !(drag.src.type === 'tab' && drag.src.i === i)) { bd = d; bestI = i }
    }
    return bestI >= 0 ? { type: 'tab', i: bestI } : null
  }

  CV.pointer(view.c, {
    down: function (pt) {
      if (!playing || auto) return
      var h = hit(pt)
      if (!h) return
      if (h.type === 'stock') { drawStock(); return }
      drag = { src: h, cards: cardsFrom(h), dx: pt.x - h.x, dy: pt.y - h.y, x: pt.x, y: pt.y, sx: pt.x, sy: pt.y, moved: false }
    },
    move: function (pt) {
      if (!drag) return
      drag.x = pt.x; drag.y = pt.y
      if (!drag.moved && CV.dist(pt.x, pt.y, drag.sx, drag.sy) > 6) drag.moved = true
    },
    up: function (pt) {
      if (!drag) return
      var d = drag
      if (!d.moved) { drag = null; autoMove(d.src); return }
      var t = dropTarget(pt)
      drag = null
      if (t) move(d.src, t)
    }
  })
  window.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); undo() }
  })

  /* ------------------------------------------------------------ drawing */
  function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h) }

  function drawCard(c, x, y) {
    var w = L.cw, h = L.ch, r = w * 0.08
    if (!c.up) {
      ctx.fillStyle = '#2b4cff'; rr(x, y, w, h, r); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(1, w * 0.03); rr(x + w * 0.08, y + w * 0.08, w * 0.84, h - w * 0.16, r * 0.6); ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,.18)'
      for (var py = y + w * 0.16; py < y + h - w * 0.16; py += w * 0.16) for (var px = x + w * 0.16; px < x + w * 0.84; px += w * 0.16) ctx.fillRect(px, py, w * 0.06, w * 0.06)
      return
    }
    ctx.fillStyle = '#fdfdfb'; rr(x, y, w, h, r); ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.fillStyle = red(c) ? '#d8243a' : '#1a1c24'
    var fs = Math.round(w * 0.3)
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.font = '800 ' + fs + 'px system-ui, sans-serif'
    ctx.fillText(RANKS[c.r], x + w * 0.07, y + w * 0.06)
    ctx.font = fs + 'px system-ui, sans-serif'
    ctx.fillText(SUITS[c.s] + '︎', x + w * 0.07, y + w * 0.06 + fs)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    if (c.r > 10) { ctx.font = '900 ' + Math.round(w * 0.5) + 'px Georgia, serif'; ctx.fillText(RANKS[c.r], x + w * 0.58, y + h * 0.6) }
    else { ctx.font = Math.round(w * 0.55) + 'px system-ui, sans-serif'; ctx.fillText(SUITS[c.s] + '︎', x + w * 0.56, y + h * 0.62) }
  }

  function slot(x, y, label) {
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; rr(x + 1, y + 1, L.cw - 2, L.ch - 2, L.cw * 0.08); ctx.stroke()
    if (label) { ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.font = '700 ' + Math.round(L.cw * 0.36) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + L.cw / 2, y + L.ch / 2) }
  }

  function isDragged(src, j) {
    if (!drag || !drag.moved) return false
    var s = drag.src
    if (s.type !== src.type || s.i !== src.i) return false
    return s.type === 'tab' ? j >= s.j : j === -1
  }

  function render(dt) {
    var w = view.w, h = view.h, i, j
    var bg = ctx.createRadialGradient(w / 2, h * 0.3, 10, w / 2, h / 2, Math.max(w, h))
    bg.addColorStop(0, '#1d7a4a'); bg.addColorStop(1, '#0c3b24')
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)
    if (playing && !auto) { time += dt; hud.set('t', CV.fmtTime(time)) }
    if (auto) { auto += dt; if (auto > 0.09) { auto = 0.0001; autoStep() } }
    // stock
    if (S.stock.length) drawCard({ up: false }, colX(0), L.top); else slot(colX(0), L.top, '↻')
    // waste
    var shown = wasteShown()
    if (!shown.length) slot(colX(1), L.top)
    shown.forEach(function (c, k) { if (k === shown.length - 1 && isDragged({ type: 'waste' }, -1)) return; drawCard(c, wasteX(k), L.top) })
    // foundations
    for (i = 0; i < 4; i++) {
      var f = S.found[i], fx = colX(3 + i)
      if (!f.length) { slot(fx, L.top, 'A'); continue }
      if (isDragged({ type: 'found', i: i }, -1)) { if (f.length > 1) drawCard(f[f.length - 2], fx, L.top); else slot(fx, L.top, 'A') }
      else drawCard(f[f.length - 1], fx, L.top)
    }
    // tableau
    for (i = 0; i < 7; i++) {
      var p = S.tab[i], ys = tabYs(i)
      if (!p.length) slot(colX(i), L.tabY, 'K')
      for (j = 0; j < p.length; j++) if (!isDragged({ type: 'tab', i: i }, j)) drawCard(p[j], colX(i), ys[j])
    }
    if (drag && drag.moved) {
      var dx = drag.x - drag.dx, dy = drag.y - drag.dy, off = L.ch * 0.27
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6
      drag.cards.forEach(function (c, k) { drawCard(c, dx, dy + k * off) })
      ctx.restore()
    }
    undoBtn.disabled = !history.length
  }

  deal(); layout()
  CV.loop(function (dt) { render(dt) })
  over.show({ title: 'Klondike Solitaire', body: 'Move every card to the four foundations, Ace to King by suit. Build the columns down in alternating colours. Tap a card to auto-move it, or drag it where you want.',
    controls: [['Tap', 'auto-move'], ['Drag', 'move cards'], ['Ctrl+Z', 'undo']], button: 'Deal cards', onStart: function () { playing = true } })
})(window.CV)
