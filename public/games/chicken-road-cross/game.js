/* Chicken Road Cross — a lane-hopping arcade game on ../shared/core.js.
   The world is a column of 9-tile-wide rows generated upward forever. Each row is
   grass (safe, maybe trees), road (cars) or river (logs you must ride). The camera
   creeps up on its own, so dawdling at the bottom ends the run as surely as a car. */
(function (CV) {
  'use strict'
  var COLS = 9, T = 44, WD = COLS * T, HD = 560
  var view = CV.canvas('#c'), ctx = view.ctx
  var hud = CV.hud([{ key: 's', label: 'Score' }, { key: 'best', label: 'Best' }])
  var over = CV.overlay(), k = CV.keys()
  var st, playing = false

  function u() { return Math.min(view.h / HD, view.w / WD) }

  function makeRow(i) {
    if (i < 3) return { type: 'grass', trees: [], items: [] }
    var prev = st.rows[i - 1]
    var r = Math.random(), diff = Math.min(1, i / 120)
    var type = r < 0.32 ? 'grass' : r < 0.72 ? 'road' : 'river'
    if (prev && prev.type === 'river' && type === 'river' && Math.random() < 0.5) type = 'grass'
    var row = { type: type, dir: Math.random() < 0.5 ? -1 : 1, items: [], trees: [] }
    if (type === 'grass') {
      for (var c = 0; c < COLS; c++) if (c !== 4 && Math.random() < 0.18) row.trees.push(c)
    } else if (type === 'road') {
      row.speed = CV.rand(60, 110) + diff * 110
      var n = CV.randInt(1, 3), gap = WD / n
      var w = Math.random() < 0.25 ? T * 2 : T * 1.2
      for (var j = 0; j < n; j++) row.items.push({ x: j * gap + CV.rand(0, gap - w), w: w, hue: CV.randInt(0, 360) })
    } else {
      row.speed = CV.rand(40, 80) + diff * 50
      var m = CV.randInt(2, 3), g2 = WD / m
      for (var q = 0; q < m; q++) row.items.push({ x: q * g2 + CV.rand(0, 20), w: T * CV.randInt(2, 3) })
    }
    return row
  }
  function row(i) { while (st.rows.length <= i + 20) st.rows.push(makeRow(st.rows.length)); return st.rows[i] }

  function reset() {
    st = { rows: [], cx: 4, cy: 0, px: 4 * T, hop: 0, cam: 0, best: 0, dead: false, ride: 0 }
    row(0); hud.set('s', '0')
  }

  function blocked(c, r) { var R = row(r); return R.type === 'grass' && R.trees.indexOf(c) >= 0 }
  function move(dx, dy) {
    if (!playing || st.hop > 0) return
    var nc = Math.round(st.px / T) + dx, nr = st.cy + dy
    if (nc < 0 || nc >= COLS || nr < 0 || nr < Math.floor(st.cam) - 1 || blocked(nc, nr)) return
    st.cx = nc; st.cy = nr; st.px = nc * T; st.hop = 1
    CV.beep(520 + dy * 60, 0.04, 'square', 0.025)
    if (st.cy > st.best) { st.best = st.cy; hud.set('s', String(st.best)) }
  }

  function die(why) {
    if (!playing) return
    playing = false; st.dead = true
    CV.chord([330, 247, 165], 90)
    var best = CV.best('chicken-road-cross', st.best)
    hud.set('best', CV.fmtInt(best))
    over.show({ title: why, score: CV.fmtInt(st.best), sub: st.best >= best && st.best > 0 ? 'New best' : 'Best ' + CV.fmtInt(best),
      body: 'Every row you cross scores a point. Ride the logs, dodge the cars, and keep moving — the screen will not wait.', button: 'Cross again', onStart: start })
  }

  function update(dt) {
    if (!st) return
    var i, R, it
    for (i = Math.max(0, st.cy - 12); i < st.cy + 16; i++) {
      R = row(i)
      for (var j = 0; j < R.items.length; j++) {
        it = R.items[j]; it.x += R.dir * R.speed * dt
        if (R.dir > 0 && it.x > WD + 20) it.x = -it.w - CV.rand(0, 60)
        if (R.dir < 0 && it.x + it.w < -20) it.x = WD + CV.rand(0, 60)
      }
    }
    if (st.hop > 0) st.hop = Math.max(0, st.hop - dt * 7)
    if (!playing) return
    // camera: follow the chicken, plus a slow creep so idling is fatal
    var target = Math.max(0, st.cy - 4)
    st.cam = Math.max(st.cam + dt * (0.35 + Math.min(0.6, st.best / 200)), st.cam + (target - st.cam) * Math.min(1, dt * 3))
    if (st.cy < st.cam - 1.2) return die('Left behind')
    R = row(st.cy)
    var cx0 = st.px + 8, cx1 = st.px + T - 8
    if (R.type === 'road' && st.hop === 0) {
      for (i = 0; i < R.items.length; i++) { it = R.items[i]; if (cx1 > it.x + 4 && cx0 < it.x + it.w - 4) return die('Splat') }
    } else if (R.type === 'river' && st.hop === 0) {
      var on = null
      for (i = 0; i < R.items.length; i++) { it = R.items[i]; if (st.px + T / 2 > it.x && st.px + T / 2 < it.x + it.w) on = it }
      if (!on) return die('Splash')
      st.px += R.dir * R.speed * dt
      if (st.px < -T / 2 || st.px > WD - T / 2) return die('Swept away')
    } else if (R.type === 'grass' && st.hop === 0) {
      st.px += (Math.round(st.px / T) * T - st.px) * Math.min(1, dt * 12)
    }
  }

  function draw() {
    var uu = u(), ox = (view.w / uu - WD) / 2, oy = (view.h / uu - HD) / 2
    ctx.save(); ctx.scale(uu, uu)
    ctx.fillStyle = '#0d1a12'; ctx.fillRect(0, 0, view.w / uu, view.h / uu)
    ctx.translate(ox, oy)
    ctx.beginPath(); ctx.rect(0, 0, WD, HD); ctx.clip()
    var base = HD - T * 1.5 + st.cam * T
    var first = Math.max(0, Math.floor(st.cam) - 2), i, j, R, y, it
    for (i = first; i < first + 16; i++) {
      R = row(i); y = base - i * T
      if (R.type === 'grass') {
        ctx.fillStyle = i % 2 ? '#5fbf4a' : '#58b444'; ctx.fillRect(0, y, WD, T)
        for (j = 0; j < R.trees.length; j++) {
          var tx = R.trees[j] * T
          ctx.fillStyle = '#6b4423'; ctx.fillRect(tx + 18, y + 26, 8, 14)
          ctx.fillStyle = '#2f8a3a'; ctx.beginPath(); ctx.arc(tx + 22, y + 20, 15, 0, 7); ctx.fill()
          ctx.fillStyle = '#3fa64a'; ctx.beginPath(); ctx.arc(tx + 18, y + 16, 8, 0, 7); ctx.fill()
        }
      } else if (R.type === 'road') {
        ctx.fillStyle = '#3b3f4a'; ctx.fillRect(0, y, WD, T)
        ctx.fillStyle = 'rgba(255,255,255,.35)'
        for (j = 0; j < WD; j += 40) ctx.fillRect(j + 8, y + T / 2 - 1, 20, 2)
        for (j = 0; j < R.items.length; j++) {
          it = R.items[j]
          ctx.fillStyle = 'hsl(' + it.hue + ',70%,52%)'; ctx.fillRect(it.x, y + 8, it.w, T - 16)
          ctx.fillStyle = 'rgba(200,230,255,.8)'; ctx.fillRect(it.x + (R.dir > 0 ? it.w - 16 : 6), y + 12, 10, T - 24)
          ctx.fillStyle = '#111'; ctx.fillRect(it.x + 6, y + 4, 10, 5); ctx.fillRect(it.x + it.w - 16, y + 4, 10, 5)
          ctx.fillRect(it.x + 6, y + T - 9, 10, 5); ctx.fillRect(it.x + it.w - 16, y + T - 9, 10, 5)
        }
      } else {
        ctx.fillStyle = '#2a7fd4'; ctx.fillRect(0, y, WD, T)
        ctx.fillStyle = 'rgba(255,255,255,.12)'
        for (j = 0; j < WD; j += 30) ctx.fillRect((j + st.cam * 37) % WD, y + 10 + (j % 3) * 9, 12, 2)
        for (j = 0; j < R.items.length; j++) {
          it = R.items[j]
          ctx.fillStyle = '#8a5a2b'; ctx.fillRect(it.x, y + 7, it.w, T - 14)
          ctx.fillStyle = '#a8743d'; ctx.fillRect(it.x, y + 9, it.w, 4)
        }
      }
    }
    // chicken
    var hopY = Math.sin(st.hop * Math.PI) * 10
    var cy = base - st.cy * T - hopY, cx = st.px
    if (!st.dead || Math.floor(Date.now() / 120) % 2) {
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(cx + T / 2, base - st.cy * T + T - 8, 13, 4, 0, 0, 7); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.fillRect(cx + 11, cy + 12, 22, 22)
      ctx.fillStyle = '#e53935'; ctx.fillRect(cx + 18, cy + 6, 8, 6)
      ctx.fillStyle = '#ffb300'; ctx.fillRect(cx + 33, cy + 18, 6, 5); ctx.fillRect(cx + 15, cy + 34, 4, 5); ctx.fillRect(cx + 25, cy + 34, 4, 5)
      ctx.fillStyle = '#111'; ctx.fillRect(cx + 26, cy + 16, 3, 3)
    }
    ctx.restore()
  }

  k.onDown(['ArrowUp', 'KeyW', 'Space'], function () { move(0, 1) })
  k.onDown(['ArrowDown', 'KeyS'], function () { move(0, -1) })
  k.onDown(['ArrowLeft', 'KeyA'], function () { move(-1, 0) })
  k.onDown(['ArrowRight', 'KeyD'], function () { move(1, 0) })
  CV.swipe(view.c, function (d) {
    if (d === 'up' || d === 'tap') move(0, 1); else if (d === 'down') move(0, -1); else if (d === 'left') move(-1, 0); else move(1, 0)
  })

  function start() { reset(); playing = true }
  hud.set('best', CV.fmtInt(CV.best('chicken-road-cross')))
  reset()
  CV.loop(function (dt) { if (!document.hidden) update(dt); draw() })
  over.show({ title: 'Chicken Road Cross', body: 'Hop across busy roads and rushing rivers. Cars squash, water drowns, and the screen keeps creeping forward.',
    controls: [['Arrows / WASD', 'hop'], ['Tap', 'hop forward'], ['Swipe', 'hop any way']], button: 'Start crossing', onStart: start })
})(window.CV)
