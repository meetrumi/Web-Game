/* Mine Hunt — classic mine-clearing logic puzzle on ../shared/core.js.
   Mines are laid after the first reveal so the opening tap is always safe and
   always opens an area. Numbers count neighbouring mines. Flag with right-click,
   long-press, or the Flag mode button; tap a satisfied number to clear around it.
   Best times are kept per difficulty. */
(function (CV) {
  'use strict'
  var ID = 'mine-hunt'
  var MODES = [
    { name: 'Easy', cols: 9, rows: 9, mines: 10 },
    { name: 'Medium', cols: 12, rows: 12, mines: 24 },
    { name: 'Hard', cols: 16, rows: 16, mines: 48 }
  ]
  var NUM_COLORS = ['', '#4aa8ff', '#4fd06a', '#ff5d5d', '#a779ff', '#ffa940', '#3fd7d0', '#f4f5f9', '#9aa3b5']

  var view = CV.canvas('#c'), ctx = view.ctx
  var hud = CV.hud([{ key: 'm', label: 'Mines' }, { key: 't', label: 'Time' }, { key: 'best', label: 'Best' }])
  var over = CV.overlay()
  var modeIdx = Number(CV.load(ID + ':mode', 0)) || 0
  var mode, cells, laid, state, flags, opened, time, flagMode = false
  var press = null, L = {}, boom = null

  var modeBtn = CV.el('button', 'cv-btn cv-btn-ghost'); modeBtn.type = 'button'
  var flagBtn = CV.el('button', 'cv-btn cv-btn-ghost'); flagBtn.type = 'button'
  hud.right.insertBefore(flagBtn, hud.right.firstChild)
  hud.right.insertBefore(modeBtn, hud.right.firstChild)
  modeBtn.addEventListener('click', function () { modeIdx = (modeIdx + 1) % MODES.length; CV.save(ID + ':mode', modeIdx); reset() })
  flagBtn.addEventListener('click', function () { flagMode = !flagMode; paintButtons() })
  function paintButtons() { modeBtn.textContent = MODES[modeIdx].name; flagBtn.textContent = flagMode ? 'Flag: ON' : 'Flag: off' }

  function bestKey() { return ID + ':best:' + mode.name }
  function showBest() { var b = CV.load(bestKey(), 0); hud.set('best', b ? CV.fmtTime(b) : '--') }

  function layout() {
    if (!mode) return
    var top = 56, pad = 10
    var cs = Math.floor(Math.min((view.w - pad * 2) / mode.cols, (view.h - top - pad) / mode.rows))
    L.cs = Math.max(cs, 12)
    L.bx = Math.floor((view.w - L.cs * mode.cols) / 2)
    L.by = top + Math.floor((view.h - top - pad - L.cs * mode.rows) / 2)
  }
  view.onResize = layout

  function reset() {
    mode = MODES[modeIdx]
    cells = []
    for (var i = 0; i < mode.cols * mode.rows; i++) cells.push({ mine: false, n: 0, open: false, flag: false })
    laid = false; flags = 0; opened = 0; time = 0; boom = null; state = 'ready'
    hud.set('m', String(mode.mines)); hud.set('t', '0:00')
    paintButtons(); showBest(); layout()
  }

  function idx(x, y) { return y * mode.cols + x }
  function around(x, y, fn) {
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue
      var nx = x + dx, ny = y + dy
      if (nx >= 0 && ny >= 0 && nx < mode.cols && ny < mode.rows) fn(nx, ny, cells[idx(nx, ny)])
    }
  }

  function lay(sx, sy) {
    var spots = []
    for (var y = 0; y < mode.rows; y++) for (var x = 0; x < mode.cols; x++) {
      if (Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 1) continue // safe opening area
      spots.push(idx(x, y))
    }
    for (var m = 0; m < mode.mines; m++) {
      var k = CV.randInt(m, spots.length - 1), tmp = spots[m]; spots[m] = spots[k]; spots[k] = tmp
      cells[spots[m]].mine = true
    }
    for (y = 0; y < mode.rows; y++) for (x = 0; x < mode.cols; x++) {
      var c = cells[idx(x, y)], n = 0
      around(x, y, function (ax, ay, a) { if (a.mine) n++ })
      c.n = n
    }
    laid = true
  }

  function reveal(x, y) {
    var c = cells[idx(x, y)]
    if (c.open || c.flag) return
    if (!laid) { lay(x, y); state = 'play' }
    if (c.mine) { c.open = true; lose(x, y); return }
    var stack = [[x, y]]
    while (stack.length) {
      var p = stack.pop(), cc = cells[idx(p[0], p[1])]
      if (cc.open || cc.flag) continue
      cc.open = true; opened++
      if (cc.n === 0) around(p[0], p[1], function (ax, ay, a) { if (!a.open && !a.mine) stack.push([ax, ay]) })
    }
    CV.beep(520 + Math.random() * 120, 0.03, 'sine', 0.03)
    if (opened === mode.cols * mode.rows - mode.mines) win()
  }

  function chord(x, y) {
    var c = cells[idx(x, y)], f = 0
    if (!c.open || !c.n) return
    around(x, y, function (ax, ay, a) { if (a.flag) f++ })
    if (f !== c.n) return
    around(x, y, function (ax, ay) { if (state === 'play') reveal(ax, ay) })
  }

  function toggleFlag(x, y) {
    var c = cells[idx(x, y)]
    if (c.open || state === 'won' || state === 'lost') return
    c.flag = !c.flag
    flags += c.flag ? 1 : -1
    hud.set('m', String(mode.mines - flags))
    CV.beep(c.flag ? 760 : 420, 0.05, 'triangle', 0.04)
  }

  function lose(x, y) {
    state = 'lost'; boom = { x: x, y: y, t: 0 }
    cells.forEach(function (c) { if (c.mine) c.open = true })
    CV.chord([220, 165, 110], 120, 'sawtooth')
    setTimeout(function () {
      over.show({ title: 'Boom!', score: CV.fmtTime(time), sub: mode.name + ' board', body: 'Use the numbers: each one tells you how many of its eight neighbours hide a mine. Flag the certain ones first.', button: 'Try again', onStart: function () { reset() } })
    }, 900)
  }

  function win() {
    state = 'won'
    cells.forEach(function (c) { if (c.mine && !c.flag) { c.flag = true } })
    hud.set('m', '0')
    var prev = CV.load(bestKey(), 0), t = Math.max(1, Math.floor(time)), record = !prev || t < prev
    if (record) CV.save(bestKey(), t)
    showBest()
    CV.chord([523, 659, 784, 1047], 80)
    setTimeout(function () {
      over.show({ title: 'Board cleared!', score: CV.fmtTime(t), sub: record ? 'New best on ' + mode.name : 'Best ' + CV.fmtTime(CV.load(bestKey(), t)), body: 'Try the next difficulty with the button in the top bar.', button: 'Play again', onStart: function () { reset() } })
    }, 700)
  }

  function cellAt(pt) {
    var x = Math.floor((pt.x - L.bx) / L.cs), y = Math.floor((pt.y - L.by) / L.cs)
    if (x < 0 || y < 0 || x >= mode.cols || y >= mode.rows) return null
    return { x: x, y: y }
  }

  function act(c, wantFlag) {
    if (state === 'won' || state === 'lost') return
    var cell = cells[idx(c.x, c.y)]
    if (cell.open) { chord(c.x, c.y); return }
    if (wantFlag) toggleFlag(c.x, c.y)
    else reveal(c.x, c.y)
  }

  view.c.addEventListener('contextmenu', function (e) { e.preventDefault() })
  CV.pointer(view.c, {
    down: function (pt, e) {
      var c = cellAt(pt)
      if (!c) return
      if (e.button === 2) { act(c, true); press = null; return }
      press = { c: c, done: false, timer: setTimeout(function () {
        if (press && !press.done) { press.done = true; act(press.c, !flagMode); if (navigator.vibrate) navigator.vibrate(25) }
      }, 420) }
    },
    up: function (pt) {
      if (!press) return
      clearTimeout(press.timer)
      if (!press.done) { var c = cellAt(pt); if (c && c.x === press.c.x && c.y === press.c.y) act(c, flagMode) }
      press = null
    }
  })

  function tile(x, y, cs, raised) {
    ctx.fillStyle = raised ? '#3a4370' : '#1b2038'
    ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2)
    if (raised) {
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + 1, y + 1, cs - 2, Math.max(2, cs * 0.12))
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 1, y + cs - 1 - Math.max(2, cs * 0.1), cs - 2, Math.max(2, cs * 0.1))
    }
  }

  function drawFlag(x, y, cs) {
    ctx.fillStyle = '#e9edf7'; ctx.fillRect(x + cs * 0.44, y + cs * 0.22, cs * 0.07, cs * 0.56)
    ctx.fillStyle = '#ff4d5e'; ctx.beginPath(); ctx.moveTo(x + cs * 0.5, y + cs * 0.22); ctx.lineTo(x + cs * 0.78, y + cs * 0.34); ctx.lineTo(x + cs * 0.5, y + cs * 0.47); ctx.fill()
    ctx.fillStyle = '#e9edf7'; ctx.fillRect(x + cs * 0.3, y + cs * 0.74, cs * 0.4, cs * 0.07)
  }

  function drawMine(x, y, cs) {
    var cx = x + cs / 2, cy = y + cs / 2, r = cs * 0.22
    ctx.strokeStyle = '#11131c'; ctx.lineWidth = Math.max(1, cs * 0.06)
    for (var a = 0; a < 4; a++) { var ang = a * Math.PI / 4; ctx.beginPath(); ctx.moveTo(cx - Math.cos(ang) * r * 1.5, cy - Math.sin(ang) * r * 1.5); ctx.lineTo(cx + Math.cos(ang) * r * 1.5, cy + Math.sin(ang) * r * 1.5); ctx.stroke() }
    ctx.fillStyle = '#11131c'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.25, 0, 7); ctx.fill()
  }

  function draw(dt) {
    var w = view.w, h = view.h, cs = L.cs
    ctx.fillStyle = '#0f1226'; ctx.fillRect(0, 0, w, h)
    if (state === 'play') { time += dt; hud.set('t', CV.fmtTime(time)) }
    var shake = 0
    if (boom) { boom.t += dt; shake = boom.t < 0.4 ? (0.4 - boom.t) * 18 : 0 }
    ctx.save(); ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake)
    ctx.font = '800 ' + Math.round(cs * 0.6) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    for (var y = 0; y < mode.rows; y++) for (var x = 0; x < mode.cols; x++) {
      var c = cells[idx(x, y)], px = L.bx + x * cs, py = L.by + y * cs
      if (!c.open) { tile(px, py, cs, true); if (c.flag) drawFlag(px, py, cs); continue }
      tile(px, py, cs, false)
      if (c.mine) {
        if (boom && boom.x === x && boom.y === y) { ctx.fillStyle = '#ff4d5e'; ctx.fillRect(px + 1, py + 1, cs - 2, cs - 2) }
        else { ctx.fillStyle = '#5b6584'; ctx.fillRect(px + 1, py + 1, cs - 2, cs - 2) }
        drawMine(px, py, cs)
      } else if (c.n) { ctx.fillStyle = NUM_COLORS[c.n]; ctx.fillText(String(c.n), px + cs / 2, py + cs / 2 + 1) }
    }
    if (press && !press.done) {
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2
      ctx.strokeRect(L.bx + press.c.x * cs + 2, L.by + press.c.y * cs + 2, cs - 4, cs - 4)
    }
    ctx.restore()
  }

  reset()
  CV.loop(function (dt) { draw(dt) })
  over.show({ title: 'Mine Hunt', body: 'Open every safe square without touching a mine. Each number shows how many mines touch that square. Your first tap is always safe.',
    controls: [['Click / tap', 'open'], ['Right-click / long-press', 'flag'], ['Tap a number', 'clear around it']], button: 'Start hunting', onStart: function () { state = 'ready' } })
})(window.CV)
