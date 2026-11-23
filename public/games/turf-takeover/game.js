/* Turf Takeover — an io-style territory game on ../shared/core.js.
   You and five bots each own a patch of a 64x64 grid. Leave your patch and you trail
   a line behind you; get back home and everything the loop encloses becomes yours,
   including land stolen from bots. Cross a rival's trail to knock them out; touch
   your own trail, or let a rival cross yours, and you are out. Score is the share
   of the map you hold. Bots respawn so the board never empties. */
(function (CV) {
  'use strict'
  var ID = 'turf-takeover', M = 64
  var DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]
  var PAL = [
    { name: 'You', fill: '#3fc1f2', trail: '#9be3ff', head: '#e8f8ff' },
    { name: 'Blaze', fill: '#ff5d73', trail: '#ffb0bc', head: '#fff' },
    { name: 'Lime', fill: '#7ad14f', trail: '#c4f0a9', head: '#fff' },
    { name: 'Sunny', fill: '#ffc93c', trail: '#ffe7a0', head: '#fff' },
    { name: 'Grape', fill: '#9b6cff', trail: '#d0bcff', head: '#fff' },
    { name: 'Coral', fill: '#ff8f4d', trail: '#ffc9a8', head: '#fff' }
  ]

  var view = CV.canvas('#c'), ctx = view.ctx
  var hud = CV.hud([{ key: 'pct', label: 'Territory' }, { key: 'rank', label: 'Rank' }, { key: 'best', label: 'Best' }])
  var over = CV.overlay(), k = CV.keys()
  var own, trail, ents, playing = false, peak = 0, kills = 0, elapsed = 0

  function I(x, y) { return y * M + x }

  function spawn(e) {
    var tries = 0, x, y
    do { x = CV.randInt(4, M - 5); y = CV.randInt(4, M - 5); tries++ } while (tries < 200 && !areaFree(x, y))
    e.x = e.px = x; e.y = e.py = y; e.dir = CV.randInt(0, 3); e.next = e.dir
    e.alive = true; e.out = false; e.t = 0; e.plan = []; e.respawn = 0
    for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) own[I(x + dx, y + dy)] = e.id
  }

  function areaFree(x, y) {
    for (var dy = -3; dy <= 3; dy++) for (var dx = -3; dx <= 3; dx++) {
      var nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= M || ny >= M) return false
      if (own[I(nx, ny)] || trail[I(nx, ny)]) return false
    }
    return true
  }

  function reset() {
    own = new Int8Array(M * M); trail = new Int8Array(M * M)
    ents = []
    for (var i = 0; i < PAL.length; i++) {
      var e = { id: i + 1, bot: i > 0, speed: i > 0 ? CV.rand(6.2, 7.2) : 8 }
      ents.push(e); spawn(e)
    }
    peak = 0; kills = 0; elapsed = 0
  }

  function eliminate(e) {
    e.alive = false; e.respawn = 3
    for (var i = 0; i < M * M; i++) { if (own[i] === e.id) own[i] = 0; if (trail[i] === e.id) trail[i] = 0 }
    if (!e.bot) gameOver()
  }

  /** Close a loop: trail becomes territory, then flood from the border to find
      everything the territory now encloses. */
  function capture(e) {
    var i, id = e.id
    for (i = 0; i < M * M; i++) if (trail[i] === id) { trail[i] = 0; own[i] = id }
    var seen = new Uint8Array(M * M), stack = []
    for (i = 0; i < M; i++) { stack.push(I(i, 0), I(i, M - 1), I(0, i), I(M - 1, i)) }
    while (stack.length) {
      var c = stack.pop()
      if (seen[c] || own[c] === id) continue
      seen[c] = 1
      var x = c % M, y = (c - x) / M
      if (x > 0) stack.push(c - 1); if (x < M - 1) stack.push(c + 1)
      if (y > 0) stack.push(c - M); if (y < M - 1) stack.push(c + M)
    }
    var gained = 0
    for (i = 0; i < M * M; i++) if (!seen[i] && own[i] !== id) {
      if (trail[i]) { var victim = ents[trail[i] - 1]; if (victim.alive && victim !== e) { eliminate(victim); if (!e.bot) { kills++; CV.toast('Took out ' + PAL[victim.id - 1].name + '!') } } }
      own[i] = id; gained++
    }
    if (!e.bot) CV.chord(gained > 40 ? [523, 659, 784, 1047] : [523, 784], 60)
  }

  /* ----------------------------------------------------------- bot brain */
  function safe(e, d) {
    var nx = e.x + DIRS[d][0], ny = e.y + DIRS[d][1]
    if (nx < 0 || ny < 0 || nx >= M || ny >= M) return false
    return trail[I(nx, ny)] !== e.id
  }

  function think(e) {
    var home = own[I(e.x, e.y)] === e.id
    if (home && !e.plan.length) {
      // plan a rectangle-ish excursion: out, sideways, back
      var d1 = CV.randInt(0, 3), side = CV.chance(0.5) ? 1 : 3
      var d2 = (d1 + side) % 4, d3 = (d1 + 2) % 4
      var a = CV.randInt(3, 9), b = CV.randInt(3, 10)
      e.plan = []
      for (var n = 0; n < a; n++) e.plan.push(d1)
      for (n = 0; n < b; n++) e.plan.push(d2)
      for (n = 0; n < a + 2; n++) e.plan.push(d3)
    }
    var want = e.plan.length ? e.plan[0] : e.dir
    // if out too long, head straight for the nearest owned cell
    if (!home && e.outSteps > 34) want = homeward(e)
    if (want === (e.dir + 2) % 4) want = e.dir
    if (!safe(e, want)) {
      var options = [e.dir, (e.dir + 1) % 4, (e.dir + 3) % 4].filter(function (d) { return safe(e, d) })
      want = options.length ? CV.pick(options) : e.dir
      e.plan = []
    }
    e.next = want
    if (e.plan.length) e.plan.shift()
  }

  function homeward(e) {
    var best = null, bd = Infinity
    for (var y = 0; y < M; y += 2) for (var x = 0; x < M; x += 2) {
      if (own[I(x, y)] !== e.id) continue
      var d = Math.abs(x - e.x) + Math.abs(y - e.y)
      if (d < bd) { bd = d; best = [x, y] }
    }
    if (!best) return e.dir
    var dx = best[0] - e.x, dy = best[1] - e.y
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3)
  }

  /* ---------------------------------------------------------------- step */
  function step(e) {
    if (e.bot) think(e)
    if (e.next !== (e.dir + 2) % 4) e.dir = e.next
    var nx = e.x + DIRS[e.dir][0], ny = e.y + DIRS[e.dir][1]
    if (nx < 0 || ny < 0 || nx >= M || ny >= M) { if (e.bot) { e.dir = (e.dir + 1) % 4; return } eliminate(e); return }
    e.px = e.x; e.py = e.y; e.x = nx; e.y = ny
    var c = I(nx, ny)
    if (trail[c] === e.id) { eliminate(e); return }
    if (trail[c] && trail[c] !== e.id) {
      var victim = ents[trail[c] - 1]
      eliminate(victim)
      if (!e.bot) { kills++; CV.toast('Took out ' + PAL[victim.id - 1].name + '!'); CV.beep(990, 0.1, 'square', 0.04) }
      if (!playing) return
    }
    if (own[c] === e.id) {
      if (e.out) { e.out = false; e.outSteps = 0; capture(e) }
    } else {
      e.out = true; e.outSteps = (e.outSteps || 0) + 1
      trail[c] = e.id
    }
  }

  function share(id) { var n = 0; for (var i = 0; i < M * M; i++) if (own[i] === id) n++; return n / (M * M) * 100 }

  function gameOver() {
    playing = false
    var score = Math.floor(peak * 10) / 10
    var best = CV.best(ID, Math.round(peak * 10)) / 10
    hud.set('best', best.toFixed(1) + '%')
    CV.chord([392, 311, 233], 120, 'sawtooth')
    over.show({ title: 'Knocked out!', score: score.toFixed(1) + '%', sub: (Math.round(peak * 10) >= Math.round(best * 10) && peak > 0 ? 'New best territory' : 'Best ' + best.toFixed(1) + '%') + ' · ' + kills + ' knockouts',
      body: 'Short loops close to home are safe. Long loops grab more land but leave your trail exposed for longer.', button: 'Play again', onStart: start })
  }

  function update(dt) {
    if (!playing) return
    elapsed += dt
    var dir = k.down('ArrowRight', 'KeyD') ? 0 : k.down('ArrowDown', 'KeyS') ? 1 : k.down('ArrowLeft', 'KeyA') ? 2 : k.down('ArrowUp', 'KeyW') ? 3 : -1
    if (dir >= 0) ents[0].next = dir
    for (var i = 0; i < ents.length && playing; i++) {
      var e = ents[i]
      if (!e.alive) { if (e.bot) { e.respawn -= dt; if (e.respawn <= 0) spawn(e) } continue }
      e.t += dt * e.speed
      while (e.t >= 1 && e.alive && playing) { e.t -= 1; step(e) }
    }
    if (!playing) return
    var mine = share(1)
    if (mine > peak) peak = mine
    hud.set('pct', mine.toFixed(1) + '%')
    var shares = ents.map(function (e) { return share(e.id) })
    var rank = 1; for (i = 1; i < shares.length; i++) if (shares[i] > mine) rank++
    hud.set('rank', '#' + rank + ' / ' + ents.length)
  }

  function draw() {
    var w = view.w, h = view.h, p = ents[0]
    var cs = Math.max(10, Math.min(w, h) / 22)
    var hx = CV.lerp(p.px, p.x, Math.min(1, p.t)), hy = CV.lerp(p.py, p.y, Math.min(1, p.t))
    var camX = (hx + 0.5) * cs - w / 2, camY = (hy + 0.5) * cs - h / 2
    ctx.fillStyle = '#0b0f22'; ctx.fillRect(0, 0, w, h)
    ctx.save(); ctx.translate(-camX, -camY)
    var x0 = Math.max(0, Math.floor(camX / cs)), y0 = Math.max(0, Math.floor(camY / cs))
    var x1 = Math.min(M - 1, Math.ceil((camX + w) / cs)), y1 = Math.min(M - 1, Math.ceil((camY + h) / cs))
    ctx.fillStyle = '#e9ecf6'; ctx.fillRect(0, 0, M * cs, M * cs)
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var c = I(x, y)
      if (own[c]) { ctx.fillStyle = PAL[own[c] - 1].fill; ctx.fillRect(x * cs, y * cs, cs + 0.5, cs + 0.5) }
      else if ((x + y) % 2) { ctx.fillStyle = '#dde1ee'; ctx.fillRect(x * cs, y * cs, cs, cs) }
      if (trail[c]) { ctx.fillStyle = PAL[trail[c] - 1].trail; ctx.fillRect(x * cs + cs * 0.2, y * cs + cs * 0.2, cs * 0.6, cs * 0.6) }
    }
    ctx.strokeStyle = '#ff4d5e'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, M * cs, M * cs)
    ents.forEach(function (e) {
      if (!e.alive) return
      var ex = CV.lerp(e.px, e.x, Math.min(1, e.t)), ey = CV.lerp(e.py, e.y, Math.min(1, e.t))
      var px = (ex + 0.5) * cs, py = (ey + 0.5) * cs
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(px + 2, py + 3, cs * 0.55, 0, 7); ctx.fill()
      ctx.fillStyle = PAL[e.id - 1].fill; ctx.beginPath(); ctx.arc(px, py, cs * 0.55, 0, 7); ctx.fill()
      ctx.strokeStyle = PAL[e.id - 1].head; ctx.lineWidth = 2.5; ctx.stroke()
      var d = DIRS[e.dir]
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(px + d[0] * cs * 0.22 - d[1] * cs * 0.18, py + d[1] * cs * 0.22 + d[0] * cs * 0.18, cs * 0.09, 0, 7); ctx.arc(px + d[0] * cs * 0.22 + d[1] * cs * 0.18, py + d[1] * cs * 0.22 - d[0] * cs * 0.18, cs * 0.09, 0, 7); ctx.fill()
      ctx.fillStyle = 'rgba(15,18,38,.75)'; ctx.font = '700 ' + Math.round(cs * 0.6) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(PAL[e.id - 1].name, px, py - cs * 0.9)
    })
    ctx.restore()
    // minimap
    var mm = Math.min(110, w * 0.26), mx = w - mm - 10, my = h - mm - 10, s = mm / M
    ctx.fillStyle = 'rgba(11,15,34,.75)'; ctx.fillRect(mx - 3, my - 3, mm + 6, mm + 6)
    for (var i = 0; i < M * M; i++) if (own[i]) { ctx.fillStyle = PAL[own[i] - 1].fill; ctx.fillRect(mx + (i % M) * s, my + Math.floor(i / M) * s, s + 0.3, s + 0.3) }
    ctx.fillStyle = '#fff'; ctx.fillRect(mx + p.x * s - 1.5, my + p.y * s - 1.5, 3, 3)
  }

  CV.swipe(view.c, function (d) {
    var map = { right: 0, down: 1, left: 2, up: 3 }
    if (map[d] != null) ents[0].next = map[d]
  })

  function start() { reset(); playing = true }
  hud.set('best', (CV.best(ID) / 10).toFixed(1) + '%')
  reset()
  CV.loop(function (dt) { if (!document.hidden) update(dt); draw() })
  over.show({ title: 'Turf Takeover', body: 'Leave your zone to draw a line, then loop back home to claim everything inside. Cut across a rival\'s line to knock them out, but never cross your own.',
    controls: [['Arrows / WASD', 'steer'], ['Swipe', 'steer on touch']], button: 'Start claiming', onStart: start })
})(window.CV)
