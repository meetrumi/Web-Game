/* Neon Snake — the classic loop on the shared runtime in ../shared/core.js.
   The board is a fixed 23 x 17 grid of 24-unit cells that is scaled to fit
   whatever the frame gives us, so the playfield is identical on a phone and on
   a desktop. Only the glowing gap in the middle of each wall wraps you to the
   far side; every other tile of wall is fatal. That is the whole design idea —
   an escape route exists, but you have to steer into a five-tile window at
   speed to use it. */

(function (CV) {
  'use strict'

  var CELL = 24
  var COLS = 23
  var ROWS = 17
  var W = COLS * CELL          // 552 design units
  var H = ROWS * CELL          // 408
  var PORTAL = 2               // gap half-width, in cells, so five tiles wide
  var MIDC = (COLS - 1) / 2
  var MIDR = (ROWS - 1) / 2

  var view = CV.canvas('#c')
  var ctx = view.ctx
  var hud = CV.hud([
    { key: 'score', label: 'Score' },
    { key: 'len', label: 'Length' },
    { key: 'best', label: 'Best' }
  ])
  var over = CV.overlay()
  var k = CV.keys()

  var st = null
  var playing = false

  function u() { return Math.min(view.h / H, view.w / W) }
  function tier() { return Math.floor(st.eaten / 10) }
  function interval() { return Math.max(0.055, 0.15 - tier() * 0.011) }

  /* Is (c, r) one cell outside the board and inside one of the four gaps? */
  function gate(c, r) {
    if (r < 0 || r >= ROWS) return Math.abs(c - MIDC) <= PORTAL
    if (c < 0 || c >= COLS) return Math.abs(r - MIDR) <= PORTAL
    return false
  }

  function spawn() {
    var taken = {}
    var free = []
    var i, c, r
    for (i = 0; i < st.body.length; i++) taken[st.body[i].c + ':' + st.body[i].r] = true
    for (r = 0; r < ROWS; r++) {
      for (c = 0; c < COLS; c++) if (!taken[c + ':' + r]) free.push({ c: c, r: r })
    }
    st.food = free.length ? CV.pick(free) : null
    if (!st.food) end('You filled the entire board. Nothing left to eat.', true)
  }
  function reset() {
    var c = 6
    var r = MIDR
    st = {
      body: [{ c: c, r: r }, { c: c - 1, r: r }, { c: c - 2, r: r }],
      dir: [1, 0], queue: [], food: null,
      eaten: 0, score: 0, warps: 0, acc: 0, pulse: 0, warpFlash: 0
    }
    spawn()
    hud.set('score', '0')
    hud.set('len', String(st.body.length))
  }

  function turn(name) {
    var d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[name]
    if (!d || !playing) return
    /* Two taps inside one step would otherwise be lost, so they queue up. Three
       deep is enough for a fast double-turn and small enough that a mashed key
       cannot bank a whole path. */
    if (st.queue.length < 3) st.queue.push(d)
  }

  function step() {
    var d = st.queue.length ? st.queue.shift() : st.dir
    /* Reversing into your own neck is a misinput, not a move — ignore it. */
    if (d[0] === -st.dir[0] && d[1] === -st.dir[1]) d = st.dir
    st.dir = d

    var head = st.body[0]
    var c = head.c + d[0]
    var r = head.r + d[1]

    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) {
      if (!gate(c, r)) return end('You clipped a solid wall. The gaps are mid-wall only.', false)
      if (c < 0) c = COLS - 1
      else if (c >= COLS) c = 0
      if (r < 0) r = ROWS - 1
      else if (r >= ROWS) r = 0
      st.warps += 1
      st.warpFlash = 1
      CV.beep(940, 0.05, 'sine', 0.03)
    }

    for (var i = 0; i < st.body.length - 1; i++) {
      if (st.body[i].c === c && st.body[i].r === r) {
        return end('You ran into your own tail.', false)
      }
    }

    st.body.unshift({ c: c, r: r })
    if (st.food && c === st.food.c && r === st.food.r) eat()
    else st.body.pop()
  }
  function eat() {
    st.eaten += 1
    st.score += 10 + tier() * 5
    hud.set('score', CV.fmtInt(st.score))
    hud.set('len', String(st.body.length))
    CV.beep(520 + Math.min(st.eaten, 22) * 22, 0.06, 'triangle', 0.04)
    var before = tier()
    spawn()
    if (st.eaten % 10 === 0 && st.food) CV.toast('Speed tier ' + (before + 1) + ' — pellets worth more')
  }

  function end(why, won) {
    playing = false
    CV.chord(won ? [523, 659, 784] : [392, 294, 208], 95)
    var best = CV.best('neon-snake', st.score)
    hud.set('best', CV.fmtInt(best))
    over.show({
      title: won ? 'Perfect board' : st.score >= 400 ? 'Long snake' : 'Clipped',
      score: CV.fmtInt(st.score),
      sub: st.score >= best && st.score > 0 ? 'New best score' : 'Best ' + CV.fmtInt(best),
      body: why + ' Length ' + st.body.length + ', ' + st.warps + ' portal ' +
        (st.warps === 1 ? 'jump' : 'jumps') + '.',
      button: 'Play again',
      onStart: start
    })
  }

  function update(dt) {
    if (st.pulse > 0) st.pulse -= dt
    if (st.pulse <= 0) st.pulse += 1.1
    if (st.warpFlash > 0) st.warpFlash = Math.max(0, st.warpFlash - dt * 2.6)
    if (!playing) return
    st.acc += dt
    /* A long stall (tab switch, slow frame) must not fire a dozen steps at once,
       so the accumulator is bled off after a couple of catch-up steps. */
    var guard = 0
    while (st.acc >= interval() && playing && guard < 3) {
      st.acc -= interval()
      guard += 1
      step()
    }
    if (st.acc > interval()) st.acc = 0
  }

  /* --------------------------------------------------------------------- draw */
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
    ctx.fill()
  }
  /* The four wall gaps are drawn as bright bars just outside the board, so the
     only safe exits are visible at a glance while you are moving. */
  function walls() {
    var t = 5
    var gx0 = (MIDC - PORTAL) * CELL
    var gx1 = (MIDC + PORTAL + 1) * CELL
    var gy0 = (MIDR - PORTAL) * CELL
    var gy1 = (MIDR + PORTAL + 1) * CELL

    ctx.fillStyle = 'rgba(122, 152, 255, .22)'
    ctx.fillRect(-t, -t, gx0 + t, t)
    ctx.fillRect(gx1, -t, W - gx1 + t, t)
    ctx.fillRect(-t, H, gx0 + t, t)
    ctx.fillRect(gx1, H, W - gx1 + t, t)
    ctx.fillRect(-t, -t, t, gy0 + t)
    ctx.fillRect(-t, gy1, t, H - gy1 + t)
    ctx.fillRect(W, -t, t, gy0 + t)
    ctx.fillRect(W, gy1, t, H - gy1 + t)

    var g = 0.34 + 0.4 * Math.abs(Math.sin(st.pulse * 3.1))
    ctx.fillStyle = 'rgba(94, 238, 255, ' + g.toFixed(3) + ')'
    ctx.fillRect(gx0, -t, gx1 - gx0, t)
    ctx.fillRect(gx0, H, gx1 - gx0, t)
    ctx.fillRect(-t, gy0, t, gy1 - gy0)
    ctx.fillRect(W, gy0, t, gy1 - gy0)
  }

  function draw() {
    var uu = u()
    var vw = view.w / uu
    var vh = view.h / uu
    var i, c, r, s

    ctx.save()
    ctx.scale(uu, uu)
    ctx.fillStyle = '#070a12'
    ctx.fillRect(0, 0, vw, vh)
    ctx.translate((vw - W) / 2, (vh - H) / 2)

    ctx.fillStyle = '#0d1226'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(255, 255, 255, .033)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (c = 1; c < COLS; c++) { ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H) }
    for (r = 1; r < ROWS; r++) { ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL) }
    ctx.stroke()
    walls()
    if (st.food) {
      var p = 1 + 0.15 * Math.sin(st.pulse * 6.2)
      var fx = st.food.c * CELL + CELL / 2
      var fy = st.food.r * CELL + CELL / 2
      ctx.fillStyle = 'rgba(255, 95, 159, .26)'
      ctx.beginPath()
      ctx.arc(fx, fy, 13 * p, 0, 6.2832)
      ctx.fill()
      ctx.fillStyle = '#ff5f9f'
      ctx.beginPath()
      ctx.arc(fx, fy, 7 * p, 0, 6.2832)
      ctx.fill()
    }

    for (i = st.body.length - 1; i >= 0; i--) {
      s = st.body[i]
      var f = 1 - i / (st.body.length + 6)
      ctx.fillStyle = 'hsl(' + (166 + ((i * 5) % 58)) + ', 88%, ' + (36 + 26 * f).toFixed(1) + '%)'
      rr(s.c * CELL + 2, s.r * CELL + 2, CELL - 4, CELL - 4, 6)
    }

    s = st.body[0]
    var hx = s.c * CELL + CELL / 2
    var hy = s.r * CELL + CELL / 2
    var px = st.dir[1] !== 0 ? 5 : 0
    var py = st.dir[0] !== 0 ? 5 : 0
    ctx.fillStyle = '#04121c'
    ctx.beginPath()
    ctx.arc(hx + st.dir[0] * 4 - px, hy + st.dir[1] * 4 - py, 2.2, 0, 6.2832)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(hx + st.dir[0] * 4 + px, hy + st.dir[1] * 4 + py, 2.2, 0, 6.2832)
    ctx.fill()

    if (st.warpFlash > 0) {
      ctx.fillStyle = 'rgba(148, 244, 255, ' + (st.warpFlash * 0.16).toFixed(3) + ')'
      ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
  }

  /* -------------------------------------------------------------------- input */
  k.onDown(['ArrowUp', 'KeyW'], function () { turn('up') })
  k.onDown(['ArrowDown', 'KeyS'], function () { turn('down') })
  k.onDown(['ArrowLeft', 'KeyA'], function () { turn('left') })
  k.onDown(['ArrowRight', 'KeyD'], function () { turn('right') })
  CV.swipe(view.c, function (dir) { if (dir !== 'tap') turn(dir) })

  function start() {
    reset()
    playing = true
  }

  hud.set('best', CV.fmtInt(CV.best('neon-snake')))
  reset()
  CV.loop(function (dt) {
    if (!document.hidden) update(dt)
    draw()
  })

  over.show({
    title: 'Neon Snake',
    body: 'Eat, grow, and do not clip a wall. The glowing gap in the middle of ' +
      'each wall wraps you to the far side — everything else is solid. Every ten ' +
      'pellets the snake speeds up and pellets start paying more.',
    controls: [['Arrows', 'turn'], ['WASD', 'turn'], ['Swipe', 'turn']],
    button: 'Slither',
    onStart: start
  })
})(window.CV)
