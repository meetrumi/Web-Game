/* Block Puzzle Blitz — an 8x8 drag-and-drop block puzzle on ../shared/core.js.
   Three pieces sit in the tray. Drag each one onto the board; any full row or column
   clears. Clearing on consecutive placements builds a combo. When none of the pieces
   left in the tray fits anywhere, the game is over. Layout adapts: tray under the
   board in portrait, beside it in landscape. */
(function (CV) {
  'use strict'
  var N = 8, ID = 'block-puzzle-blitz'
  var COLORS = ['#ff5d73', '#ffa940', '#ffd84d', '#4fd06a', '#3fc1f2', '#7b6cff', '#ff6fd0']
  // [shape, weight] -- big awkward pieces show up less often
  var SHAPES = [
    [[[0, 0]], 2],
    [[[0, 0], [1, 0]], 3], [[[0, 0], [0, 1]], 3],
    [[[0, 0], [1, 0], [2, 0]], 3], [[[0, 0], [0, 1], [0, 2]], 3],
    [[[0, 0], [1, 0], [2, 0], [3, 0]], 2], [[[0, 0], [0, 1], [0, 2], [0, 3]], 2],
    [[[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], 1], [[[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], 1],
    [[[0, 0], [1, 0], [0, 1], [1, 1]], 3],
    [[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]], 1],
    [[[0, 0], [0, 1], [1, 1]], 2], [[[1, 0], [0, 1], [1, 1]], 2], [[[0, 0], [1, 0], [0, 1]], 2], [[[0, 0], [1, 0], [1, 1]], 2],
    [[[0, 0], [0, 1], [0, 2], [1, 2]], 2], [[[1, 0], [1, 1], [1, 2], [0, 2]], 2],
    [[[0, 0], [1, 0], [2, 0], [0, 1]], 2], [[[0, 0], [1, 0], [2, 0], [2, 1]], 2],
    [[[0, 0], [1, 0], [2, 0], [1, 1]], 2], [[[1, 0], [0, 1], [1, 1], [2, 1]], 2],
    [[[1, 0], [2, 0], [0, 1], [1, 1]], 1], [[[0, 0], [1, 0], [1, 1], [2, 1]], 1]
  ]
  var TOTAL_W = SHAPES.reduce(function (a, s) { return a + s[1] }, 0)

  var view = CV.canvas('#c'), ctx = view.ctx
  var hud = CV.hud([{ key: 's', label: 'Score' }, { key: 'best', label: 'Best' }])
  var over = CV.overlay()
  var grid, tray, score, combo, playing = false, drag = null
  var flashes = [], pops = [], L = {}

  function layout() {
    var w = view.w, h = view.h, top = 52
    var landscape = w > h * 1.15
    var cs
    if (landscape) {
      cs = Math.floor(Math.min((h - top - 12) / N, (w * 0.62 - 24) / N))
      L.bx = Math.floor((w * 0.62 - cs * N) / 2) + 8
      L.by = top + Math.floor((h - top - cs * N) / 2)
      L.slots = []
      var tx = w * 0.62 + (w * 0.38) / 2, gap = (h - top) / 3
      for (var i = 0; i < 3; i++) L.slots.push({ x: tx, y: top + gap * (i + 0.5) })
      L.tc = Math.min(cs * 0.55, gap / 5.6)
    } else {
      cs = Math.floor(Math.min((w - 24) / N, (h - top - 150) / N))
      L.bx = Math.floor((w - cs * N) / 2)
      L.by = top + 8
      var ty = L.by + cs * N + (h - (L.by + cs * N)) / 2
      L.slots = [{ x: w / 6, y: ty }, { x: w / 2, y: ty }, { x: w * 5 / 6, y: ty }]
      L.tc = Math.min(cs * 0.55, w / 3 / 5.6, (h - (L.by + cs * N)) / 5.6)
    }
    L.cs = cs
  }
  view.onResize = layout

  function randomPiece() {
    var r = Math.random() * TOTAL_W, i = 0
    while (r > SHAPES[i][1]) { r -= SHAPES[i][1]; i++ }
    var cells = SHAPES[i][0], w = 0, h = 0
    cells.forEach(function (c) { w = Math.max(w, c[0] + 1); h = Math.max(h, c[1] + 1) })
    return { cells: cells, w: w, h: h, color: CV.pick(COLORS), used: false }
  }

  function fits(p, gx, gy) {
    for (var i = 0; i < p.cells.length; i++) {
      var x = gx + p.cells[i][0], y = gy + p.cells[i][1]
      if (x < 0 || y < 0 || x >= N || y >= N || grid[y][x]) return false
    }
    return true
  }

  function fitsAnywhere(p) {
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (fits(p, x, y)) return true
    return false
  }

  function refill() {
    tray = [randomPiece(), randomPiece(), randomPiece()]
    // never deal a hand where nothing fits if a fair hand exists
    for (var tries = 0; tries < 20 && !tray.some(fitsAnywhere); tries++) {
      tray = [randomPiece(), randomPiece(), randomPiece()]
    }
  }

  function reset() {
    grid = []
    for (var y = 0; y < N; y++) { grid.push([]); for (var x = 0; x < N; x++) grid[y].push(null) }
    score = 0; combo = 0; flashes = []; pops = []
    refill()
    hud.set('s', '0')
  }

  function place(p, gx, gy) {
    p.cells.forEach(function (c) { grid[gy + c[1]][gx + c[0]] = p.color })
    p.used = true
    var gain = p.cells.length
    var rows = [], cols = [], x, y
    for (y = 0; y < N; y++) { if (grid[y].every(Boolean)) rows.push(y) }
    for (x = 0; x < N; x++) {
      var full = true
      for (y = 0; y < N; y++) if (!grid[y][x]) { full = false; break }
      if (full) cols.push(x)
    }
    var lines = rows.length + cols.length
    if (lines) {
      combo++
      gain += lines * lines * 10 + (combo - 1) * 10
      rows.forEach(function (r) { for (x = 0; x < N; x++) { flashes.push({ x: x, y: r, c: grid[r][x], t: 0 }) } })
      cols.forEach(function (c) { for (y = 0; y < N; y++) { flashes.push({ x: c, y: y, c: grid[y][c], t: 0 }) } })
      rows.forEach(function (r) { for (x = 0; x < N; x++) grid[r][x] = null })
      cols.forEach(function (c) { for (y = 0; y < N; y++) grid[y][c] = null })
      CV.chord(lines > 1 ? [523, 659, 784, 1047] : [523, 784], 55)
      if (combo > 1) CV.toast('Combo x' + combo + '!')
    } else {
      combo = 0
      CV.beep(330, 0.05, 'triangle', 0.04)
    }
    score += gain
    hud.set('s', CV.fmtInt(score))
    pops.push({ x: L.bx + (gx + p.w / 2) * L.cs, y: L.by + gy * L.cs, text: '+' + gain, t: 0 })
    if (tray.every(function (q) { return q.used })) refill()
    var left = tray.filter(function (q) { return !q.used })
    if (!left.some(fitsAnywhere)) setTimeout(gameOver, 450)
  }

  function gameOver() {
    playing = false
    CV.chord([392, 330, 262], 110)
    var best = CV.best(ID, score)
    hud.set('best', CV.fmtInt(best))
    over.show({ title: 'No more moves', score: CV.fmtInt(score), sub: score >= best && score > 0 ? 'New best score' : 'Best ' + CV.fmtInt(best),
      body: 'Keep a few open lanes on the board for long pieces, and clear lines back to back for combo points.', button: 'Play again', onStart: start })
  }

  /* ------------------------------------------------------------- drawing */
  function block(x, y, s, color, alpha) {
    ctx.globalAlpha = alpha == null ? 1 : alpha
    var r = Math.max(2, s * 0.16)
    ctx.fillStyle = color
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 1, y + 1, s - 2, s - 2, r) : ctx.rect(x + 1, y + 1, s - 2, s - 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x + s * 0.18, y + s * 0.14, s * 0.64, s * 0.14)
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + s * 0.12, y + s * 0.78, s * 0.76, s * 0.1)
    ctx.globalAlpha = 1
  }

  function dragTopLeft() {
    var p = tray[drag.i]
    return { x: drag.x - (p.w * L.cs) / 2, y: drag.y - p.h * L.cs - L.cs * 0.9 }
  }

  function dragCell() {
    var tl = dragTopLeft()
    return { gx: Math.round((tl.x - L.bx) / L.cs), gy: Math.round((tl.y - L.by) / L.cs) }
  }

  function draw(dt) {
    var w = view.w, h = view.h, cs = L.cs, x, y
    var bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#1a1f3d'); bg.addColorStop(1, '#0d1024')
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)
    // board
    ctx.fillStyle = 'rgba(255,255,255,.05)'
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(L.bx - 6, L.by - 6, cs * N + 12, cs * N + 12, 12) : ctx.rect(L.bx - 6, L.by - 6, cs * N + 12, cs * N + 12); ctx.fill()
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      if (grid[y][x]) block(L.bx + x * cs, L.by + y * cs, cs, grid[y][x])
      else { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(L.bx + x * cs + 1, L.by + y * cs + 1, cs - 2, cs - 2) }
    }
    // ghost of where the dragged piece would land
    if (drag) {
      var p = tray[drag.i], g = dragCell()
      if (fits(p, g.gx, g.gy)) p.cells.forEach(function (c) { block(L.bx + (g.gx + c[0]) * cs, L.by + (g.gy + c[1]) * cs, cs, p.color, 0.35) })
    }
    // line-clear flashes
    flashes = flashes.filter(function (f) {
      f.t += dt
      var k = f.t / 0.35
      if (k >= 1) return false
      var s = cs * (1 - k * 0.6), o = (cs - s) / 2
      block(L.bx + f.x * cs + o, L.by + f.y * cs + o, s, '#ffffff', 1 - k)
      return true
    })
    // tray
    tray.forEach(function (q, i) {
      if (q.used || (drag && drag.i === i)) return
      var s = L.tc, sl = L.slots[i], alpha = playing && !fitsAnywhere(q) ? 0.3 : 1
      q.cells.forEach(function (c) { block(sl.x - (q.w * s) / 2 + c[0] * s, sl.y - (q.h * s) / 2 + c[1] * s, s, q.color, alpha) })
    })
    if (drag) {
      var tl = dragTopLeft(), dp = tray[drag.i]
      dp.cells.forEach(function (c) { block(tl.x + c[0] * cs, tl.y + c[1] * cs, cs, dp.color, 0.95) })
    }
    // score pops
    ctx.textAlign = 'center'; ctx.font = '800 ' + Math.round(cs * 0.55) + 'px system-ui, sans-serif'
    pops = pops.filter(function (pp) {
      pp.t += dt
      if (pp.t > 0.9) return false
      ctx.globalAlpha = 1 - pp.t / 0.9
      ctx.fillStyle = '#fff'; ctx.fillText(pp.text, pp.x, pp.y - pp.t * 40)
      ctx.globalAlpha = 1
      return true
    })
  }

  /* --------------------------------------------------------------- input */
  CV.pointer(view.c, {
    down: function (pt) {
      if (!playing) return
      var best = -1, bd = Infinity
      tray.forEach(function (q, i) {
        if (q.used) return
        var d = CV.dist(pt.x, pt.y, L.slots[i].x, L.slots[i].y)
        if (d < bd) { bd = d; best = i }
      })
      if (best >= 0 && bd < Math.max(L.tc * 3.2, 60)) { drag = { i: best, x: pt.x, y: pt.y }; CV.beep(600, 0.03, 'sine', 0.03) }
    },
    move: function (pt) { if (drag) { drag.x = pt.x; drag.y = pt.y } },
    up: function () {
      if (!drag) return
      var p = tray[drag.i], g = dragCell()
      if (fits(p, g.gx, g.gy)) place(p, g.gx, g.gy)
      drag = null
    }
  })

  function start() { reset(); playing = true }
  hud.set('best', CV.fmtInt(CV.best(ID)))
  reset(); layout()
  CV.loop(function (dt) { draw(dt) })
  over.show({ title: 'Block Puzzle Blitz', body: 'Drag the blocks onto the 8x8 board. Fill a whole row or column to clear it. Clear lines on back-to-back moves for combo points. The game ends when nothing in your tray fits.',
    controls: [['Drag', 'move a block'], ['Release', 'drop it on the board']], button: 'Start puzzling', onStart: start })
})(window.CV)
