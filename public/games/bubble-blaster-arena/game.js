/* Bubble Blaster Arena — a bubble shooter on the shared runtime in
   ../shared/core.js. The board is an odd-r offset hex grid: even rows hold
   eleven bubbles, odd rows hold ten and sit half a cell to the right, which is
   what makes a fired bubble able to wedge between two others instead of only
   stacking in columns. Rows are added at the top rather than sliding the whole
   grid down, so a bubble's position is always just its row and column — and
   because parity is derived from the row index, adding a row has to flip the
   parity flag or the whole board would jump half a cell sideways. */

(function (CV) {
  'use strict'

  var R = 15                   // bubble radius, and therefore half a cell
  var COLS = 11                // bubbles in a wide (even) row
  var RH = R * 1.74            // hex row pitch — R * sqrt(3), rounded up a hair
  var W = COLS * 2 * R         // 330 design units
  var H = 470
  var TOPY = 6                 // ceiling: top of row 0
  var DEATH = 400              // a bubble reaching past this loses the round
  var SHOOTY = 436             // where the cannon sits
  var SPEED = 620
  var MAXR = 20
  var PER_DROP = 8             // shots between new rows arriving at the ceiling
  var START_ROWS = 5

  var COL = ['#ff5f7e', '#ffc24d', '#7df2c0', '#5eb8ff', '#c79bff']

  var view = CV.canvas('#c')
  var ctx = view.ctx
  var hud = CV.hud([
    { key: 'score', label: 'Score' },
    { key: 'drop', label: 'Next row' },
    { key: 'best', label: 'Best' }
  ])
  var over = CV.overlay()
  var k = CV.keys()

  var st = null
  var playing = false

  function u() { return Math.min(view.h / H, view.w / W) }
  function offX() { return (view.w / u() - W) / 2 }
  function offY() { return (view.h / u() - H) / 2 }

  /* Geometry. `st.par` flips every time a row is unshifted so that every
     existing bubble keeps the parity — and so the x it is drawn at — that it
     had before the board moved down. */
  function odd(r) { return (r + st.par) % 2 === 1 }
  function rowLen(r) { return odd(r) ? COLS - 1 : COLS }
  function cellX(r, c) { return R + (odd(r) ? R : 0) + c * 2 * R }
  function cellY(r) { return TOPY + (r - st.slide) * RH + R }

  function get(r, c) {
    if (r < 0 || r >= st.grid.length || c < 0 || c >= rowLen(r)) return null
    return st.grid[r][c]
  }
  function blank(r) {
    var row = []
    var c
    for (c = 0; c < rowLen(r); c++) row.push(null)
    return row
  }
  function ensureRow(r) {
    while (st.grid.length <= r) st.grid.push(blank(st.grid.length))
  }

  /* Six neighbours in offset coordinates. A wide row's diagonals land on c-1
     and c in the narrow rows either side; a narrow row's land on c and c+1. */
  function nb(r, c) {
    var lo = odd(r) ? c : c - 1
    var hi = lo + 1
    return [[r, c - 1], [r, c + 1], [r - 1, lo], [r - 1, hi], [r + 1, lo], [r + 1, hi]]
  }
  function anchored(r, c) {
    var n = nb(r, c)
    var i
    for (i = 0; i < 6; i++) if (get(n[i][0], n[i][1]) != null) return true
    return false
  }

  /* Only offer colours that are still on the board, otherwise the last few
     bubbles turn into a lottery. */
  function palette() {
    var seen = []
    var r, c, v
    for (r = 0; r < st.grid.length; r++) {
      for (c = 0; c < rowLen(r); c++) {
        v = st.grid[r][c]
        if (v != null && seen.indexOf(v) < 0) seen.push(v)
      }
    }
    return seen.length ? seen : [CV.randInt(0, COL.length - 1)]
  }
  function nextColour() { return CV.pick(palette()) }

  function reset() {
    var r, c, row
    st = {
      grid: [], par: 0, slide: 0,
      score: 0, shots: 0, popped: 0, rows: 0, chain: 0, bestChain: 0,
      ball: null, cur: 0, next: 0, ang: -Math.PI / 2, aiming: false,
      falls: [], burst: [], shake: 0
    }
    for (r = 0; r < START_ROWS; r++) {
      row = []
      for (c = 0; c < rowLen(r); c++) row.push(CV.randInt(0, COL.length - 1))
      st.grid.push(row)
    }
    st.cur = nextColour()
    st.next = nextColour()
    hud.set('score', '0')
    hud.set('drop', String(PER_DROP))
  }

  /* Is a bubble of radius R centred here overlapping the stack? Only the three
     rows either side of the y can possibly be in range, so this stays cheap
     enough to run per sub-step of the flight and again for the aim guide. */
  function touching(x, y) {
    var r, c, r0 = Math.floor((y - TOPY + st.slide * RH - R) / RH)
    for (r = Math.max(0, r0 - 1); r <= r0 + 1 && r < st.grid.length; r++) {
      for (c = 0; c < rowLen(r); c++) {
        if (st.grid[r][c] == null) continue
        if (CV.dist(x, y, cellX(r, c), cellY(r)) < 2 * R - 3) return true
      }
    }
    return false
  }

  /* Snap to the free cell nearest the impact point, ignoring cells that would
     leave the bubble floating in mid-air. */
  function freeCell(x, y) {
    var best = null
    var bd = 1e9
    var r0 = Math.max(0, Math.floor((y - TOPY + st.slide * RH - R) / RH) - 1)
    var r, c, d
    for (r = r0; r <= r0 + 3 && r < MAXR; r++) {
      ensureRow(r)
      for (c = 0; c < rowLen(r); c++) {
        if (st.grid[r][c] != null) continue
        if (r > 0 && !anchored(r, c)) continue
        d = CV.dist(x, y, cellX(r, c), cellY(r))
        if (d < bd) { bd = d; best = [r, c] }
      }
    }
    return best
  }

  function restY(r) { return TOPY + r * RH + R }

  /* Flood fill across same-coloured neighbours from the bubble that just
     landed. Three or more and the whole group goes. */
  function cluster(r0, c0, colour) {
    var out = []
    var seen = {}
    var stack = [[r0, c0]]
    var cell, key, n, i
    while (stack.length) {
      cell = stack.pop()
      key = cell[0] + ':' + cell[1]
      if (seen[key] || get(cell[0], cell[1]) !== colour) continue
      seen[key] = true
      out.push(cell)
      n = nb(cell[0], cell[1])
      for (i = 0; i < 6; i++) stack.push(n[i])
    }
    return out
  }

  /* Anything that cannot be reached from the ceiling row is no longer held up
     by anything, so it falls — which is where the big scores come from. */
  function floaters() {
    var seen = {}
    var stack = []
    var out = []
    var r, c, i, cell, key, n
    for (c = 0; c < rowLen(0); c++) if (get(0, c) != null) stack.push([0, c])
    while (stack.length) {
      cell = stack.pop()
      key = cell[0] + ':' + cell[1]
      if (seen[key] || get(cell[0], cell[1]) == null) continue
      seen[key] = true
      n = nb(cell[0], cell[1])
      for (i = 0; i < 6; i++) stack.push(n[i])
    }
    for (r = 0; r < st.grid.length; r++) {
      for (c = 0; c < rowLen(r); c++) {
        if (st.grid[r][c] != null && !seen[r + ':' + c]) out.push([r, c])
      }
    }
    return out
  }

  function burst(x, y, colour) {
    var i, a
    for (i = 0; i < 7; i++) {
      a = 6.2832 * i / 7 + CV.rand(-0.3, 0.3)
      st.burst.push({
        x: x, y: y, col: colour, life: 1,
        vx: Math.cos(a) * CV.rand(70, 180), vy: Math.sin(a) * CV.rand(70, 180)
      })
    }
  }
  function cleared() {
    var r, c
    for (r = 0; r < st.grid.length; r++) {
      for (c = 0; c < rowLen(r); c++) if (st.grid[r][c] != null) return false
    }
    return true
  }

  function checkDeath() {
    var r, c
    for (r = st.grid.length - 1; r >= 0; r--) {
      if (restY(r) + R <= DEATH) break
      for (c = 0; c < rowLen(r); c++) if (st.grid[r][c] != null) { end(); return }
    }
  }
  function refill() {
    var r, c, row
    st.grid = []
    st.par = 0
    st.slide = 0
    for (r = 0; r < START_ROWS; r++) {
      row = []
      for (c = 0; c < rowLen(r); c++) row.push(CV.randInt(0, COL.length - 1))
      st.grid.push(row)
    }
  }

  function land(r, c, colour) {
    var group, drops, gain, i, cell
    st.grid[r][c] = colour
    group = cluster(r, c, colour)
    if (group.length < 3) {
      st.chain = 0
      CV.beep(210, 0.05, 'square', 0.022)
      checkDeath()
      return
    }
    for (i = 0; i < group.length; i++) {
      cell = group[i]
      burst(cellX(cell[0], cell[1]), cellY(cell[0]), st.grid[cell[0]][cell[1]])
      st.grid[cell[0]][cell[1]] = null
    }
    drops = floaters()
    for (i = 0; i < drops.length; i++) {
      cell = drops[i]
      st.falls.push({
        x: cellX(cell[0], cell[1]), y: cellY(cell[0]), col: st.grid[cell[0]][cell[1]],
        vx: CV.rand(-55, 55), vy: CV.rand(-50, 20)
      })
      st.grid[cell[0]][cell[1]] = null
    }
    st.chain += 1
    if (st.chain > st.bestChain) st.bestChain = st.chain
    st.popped += group.length + drops.length
    gain = group.length * 10 + drops.length * 25 + (st.chain - 1) * 10
    st.score += gain
    hud.set('score', CV.fmtInt(st.score))
    CV.beep(470 + Math.min(group.length, 9) * 42, 0.08, 'triangle', 0.04)
    if (drops.length >= 4) CV.toast(drops.length + ' cut loose — ' + gain + ' points')
    /* Clearing the lot is worth a bonus and a fresh set of rows rather than an
       ending: the round only stops when the stack reaches the line. */
    if (cleared()) {
      st.score += 500
      hud.set('score', CV.fmtInt(st.score))
      CV.chord([523, 659, 784], 80)
      CV.toast('Board cleared — new wave, +500')
      refill()
    }
    st.cur = palette().indexOf(st.cur) < 0 ? nextColour() : st.cur
    st.next = palette().indexOf(st.next) < 0 ? nextColour() : st.next
  }

  /* A new row arrives at the ceiling instead of the board sliding, so `slide`
     only exists to animate the last row of movement — every position it feeds
     is the real one, collisions included. */
  function descend() {
    var row = []
    var c
    if (!playing) return
    st.par = (st.par + 1) % 2
    for (c = 0; c < rowLen(0); c++) row.push(CV.randInt(0, COL.length - 1))
    st.grid.unshift(row)
    st.slide = 1
    st.rows += 1
    st.shake = 0.55
    CV.beep(140, 0.1, 'sawtooth', 0.028)
    checkDeath()
  }

  function end() {
    var best
    if (!playing) return
    playing = false
    st.shake = 1
    CV.chord([349, 262, 196], 95)
    best = CV.best('bubble-blaster-arena', st.score)
    hud.set('best', CV.fmtInt(best))
    over.show({
      title: st.score >= 1600 ? 'Cleaned house' : 'Reached the line',
      score: CV.fmtInt(st.score),
      sub: st.score >= best && st.score > 0 ? 'New best score' : 'Best ' + CV.fmtInt(best),
      body: st.popped + ' popped over ' + st.shots + ' shots, ' + st.rows +
        ' rows held off, best chain x' + st.bestChain + '.',
      button: 'Shoot again',
      onStart: start
    })
  }

  function fire() {
    if (!playing || st.ball) return
    st.ball = {
      x: W / 2, y: SHOOTY, col: st.cur,
      vx: Math.cos(st.ang) * SPEED, vy: Math.sin(st.ang) * SPEED
    }
    st.cur = st.next
    st.next = nextColour()
    st.shots += 1
    hud.set('drop', String(PER_DROP - st.shots % PER_DROP))
    CV.beep(340, 0.05, 'sine', 0.028)
  }

  /* The shot is stepped in sub-steps no longer than half a radius so it cannot
     tunnel through the stack at speed. */
  function fly(dt) {
    var b = st.ball
    var steps = Math.max(1, Math.ceil(SPEED * dt / (R * 0.5)))
    var h = dt / steps
    var i
    for (i = 0; i < steps; i++) {
      b.x += b.vx * h
      b.y += b.vy * h
      if (b.x < R) { b.x = R; b.vx = -b.vx }
      else if (b.x > W - R) { b.x = W - R; b.vx = -b.vx }
      if (b.y - R <= TOPY || touching(b.x, b.y)) { resolve(b); return }
    }
  }
  function resolve(b) {
    var cell = freeCell(b.x, b.y)
    st.ball = null
    if (!cell) { st.chain = 0; return }
    land(cell[0], cell[1], b.col)
    if (st.shots % PER_DROP === 0) descend()
  }

  function aimKeys(dt) {
    if (k.down('ArrowLeft', 'KeyA')) st.ang -= dt * 1.6
    if (k.down('ArrowRight', 'KeyD')) st.ang += dt * 1.6
    st.ang = CV.clamp(st.ang, -Math.PI + 0.24, -0.24)
  }

  function update(dt) {
    var i, p, f
    if (st.slide > 0) st.slide = Math.max(0, st.slide - dt * 4.5)
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt * 2)
    for (i = st.burst.length - 1; i >= 0; i--) {
      p = st.burst[i]
      p.life -= dt * 2.2
      p.vy += 430 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.life <= 0) st.burst.splice(i, 1)
    }
    for (i = st.falls.length - 1; i >= 0; i--) {
      f = st.falls[i]
      f.vy += 800 * dt
      f.x += f.vx * dt
      f.y += f.vy * dt
      if (f.y > H + R * 2) st.falls.splice(i, 1)
    }
    if (!playing) return
    if (st.ball) fly(dt)
    else if (!st.aiming) aimKeys(dt)
  }

  /* --------------------------------------------------------------------- draw */
  function bubble(x, y, ci, alpha) {
    if (alpha != null) ctx.globalAlpha = alpha
    ctx.fillStyle = COL[ci]
    ctx.beginPath()
    ctx.arc(x, y, R - 1, 0, 6.2832)
    ctx.fill()
    ctx.fillStyle = 'rgba(255, 255, 255, .32)'
    ctx.beginPath()
    ctx.arc(x - R * 0.3, y - R * 0.34, R * 0.29, 0, 6.2832)
    ctx.fill()
    ctx.strokeStyle = 'rgba(6, 9, 16, .4)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(x, y, R - 1, 0, 6.2832)
    ctx.stroke()
    if (alpha != null) ctx.globalAlpha = 1
  }

  /* The guide walks the same collision test as a live shot, so a bank off the
     wall shows where the bubble will actually land. */
  function guide() {
    var x = W / 2
    var y = SHOOTY
    var vx = Math.cos(st.ang)
    var vy = Math.sin(st.ang)
    var i
    ctx.fillStyle = 'rgba(236, 242, 255, .3)'
    for (i = 0; i < 300; i++) {
      x += vx * 4
      y += vy * 4
      if (x < R) { x = R; vx = -vx }
      else if (x > W - R) { x = W - R; vx = -vx }
      if (y - R <= TOPY || touching(x, y)) break
      if (i % 6 === 0) {
        ctx.beginPath()
        ctx.arc(x, y, 2.1, 0, 6.2832)
        ctx.fill()
      }
    }
  }

  function cannon() {
    ctx.save()
    ctx.translate(W / 2, SHOOTY)
    /* The barrel is drawn pointing up in local space, so adding a right angle to
       the aim (which is measured in screen radians) turns it to match. */
    ctx.rotate(st.ang + Math.PI / 2)
    ctx.fillStyle = '#39456b'
    ctx.fillRect(-6, -36, 12, 36)
    ctx.fillStyle = '#6274ab'
    ctx.fillRect(-6, -36, 12, 7)
    ctx.restore()
    ctx.fillStyle = '#1b2440'
    ctx.beginPath()
    ctx.arc(W / 2, SHOOTY, 19, 0, 6.2832)
    ctx.fill()
    bubble(W / 2, SHOOTY, st.cur)

    ctx.fillStyle = 'rgba(236, 242, 255, .4)'
    ctx.font = '700 9px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('NEXT', 32, SHOOTY - 23)
    bubble(32, SHOOTY, st.next)
    ctx.textAlign = 'left'
  }

  function draw() {
    var uu = u()
    var vw = view.w / uu
    var vh = view.h / uu
    var lowest = -1
    var r, c, i, p, f, danger

    ctx.save()
    ctx.scale(uu, uu)
    ctx.fillStyle = '#070a12'
    ctx.fillRect(0, 0, vw, vh)
    ctx.translate((vw - W) / 2, (vh - H) / 2)
    ctx.save()
    if (st.shake > 0) ctx.translate(CV.rand(-3, 3) * st.shake, 0)

    ctx.fillStyle = '#0d1226'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(122, 152, 255, .26)'
    ctx.fillRect(0, 0, W, TOPY)

    for (r = st.grid.length - 1; r >= 0 && lowest < 0; r--) {
      for (c = 0; c < rowLen(r); c++) if (st.grid[r][c] != null) { lowest = r; break }
    }
    danger = lowest >= 0 && restY(lowest) + R > DEATH - RH * 2
    ctx.strokeStyle = danger ? 'rgba(255, 95, 126, .8)' : 'rgba(255, 95, 126, .26)'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (i = 0; i < W; i += 15) { ctx.moveTo(i, DEATH); ctx.lineTo(i + 9, DEATH) }
    ctx.stroke()

    for (i = 0; i < st.falls.length; i++) {
      f = st.falls[i]
      bubble(f.x, f.y, f.col, 0.85)
    }
    if (!st.ball && playing) guide()
    for (r = 0; r < st.grid.length; r++) {
      for (c = 0; c < rowLen(r); c++) {
        if (st.grid[r][c] != null) bubble(cellX(r, c), cellY(r), st.grid[r][c])
      }
    }
    for (i = 0; i < st.burst.length; i++) {
      p = st.burst[i]
      ctx.globalAlpha = Math.max(0, p.life) * 0.9
      ctx.fillStyle = COL[p.col]
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3.4 * p.life + 0.6, 0, 6.2832)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    if (st.ball) bubble(st.ball.x, st.ball.y, st.ball.col)
    cannon()
    ctx.restore()
    ctx.restore()
  }

  /* -------------------------------------------------------------------- input */
  /* Aim is wherever you point. A point at or below the cannon line would give a
     downward angle, so it is folded to the nearest legal side instead. */
  function aimAt(p) {
    var x = p.x / u() - offX()
    var y = p.y / u() - offY()
    var a = Math.atan2(y - SHOOTY, x - W / 2)
    if (y > SHOOTY - 10) a = x < W / 2 ? -Math.PI + 0.24 : -0.24
    st.ang = CV.clamp(a, -Math.PI + 0.24, -0.24)
  }

  CV.pointer(view.c, {
    down: function (p) { if (playing && !st.ball) { st.aiming = true; aimAt(p) } },
    move: function (p) { if (st.aiming) aimAt(p) },
    up: function () { if (st.aiming) { st.aiming = false; fire() } }
  })
  k.onDown(['Space', 'Enter'], function () { fire() })

  function start() {
    reset()
    playing = true
  }

  hud.set('best', CV.fmtInt(CV.best('bubble-blaster-arena')))
  reset()
  CV.loop(function (dt) {
    if (!document.hidden) update(dt)
    draw()
  })

  over.show({
    title: 'Bubble Blaster Arena',
    body: 'Match three or more of a colour to clear them. Anything left hanging ' +
      'with nothing above it falls too, and falling bubbles pay more than popped ' +
      'ones — so aim for the bubble holding a whole cluster up. A new row arrives ' +
      'every eight shots; let the stack reach the red line and the round is over.',
    controls: [['Drag', 'aim'], ['Release', 'fire'], ['←→', 'aim'], ['Space', 'fire']],
    button: 'Load up',
    onStart: start
  })
})(window.CV)
