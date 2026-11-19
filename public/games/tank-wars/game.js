/* Tank Wars — turn-based artillery against a bot, on ../shared/core.js.
   The terrain is a heightmap one entry per design pixel, so every shell carves a
   crater and tanks settle into it. Wind changes every turn. The bot fires with an
   error that shrinks each round you win, so the duels get tighter as you go. */
(function (CV) {
  'use strict'
  var WD = 720, HD = 420, G = 260
  var view = CV.canvas('#c'), ctx = view.ctx
  var hud = CV.hud([{ key: 'r', label: 'Round' }, { key: 'w', label: 'Wins' }, { key: 'best', label: 'Best' }])
  var over = CV.overlay(), k = CV.keys()
  var st, playing = false, ground, wins = 0

  function u() { return Math.min(view.h / HD, view.w / WD) }

  function makeTerrain() {
    ground = new Float32Array(WD)
    var a = CV.rand(0, 6), b = CV.rand(0, 6), base = HD * 0.66
    for (var x = 0; x < WD; x++) ground[x] = base + Math.sin(x / 90 + a) * 38 + Math.sin(x / 37 + b) * 14 + Math.sin(x / 210) * 30
  }
  function gy(x) { x = CV.clamp(Math.round(x), 0, WD - 1); return ground[x] }

  function tank(x, color, left) { return { x: x, y: gy(x), hp: 100, angle: left ? 45 : 135, power: 62, color: color } }

  function newRound() {
    makeTerrain()
    st = { you: tank(CV.rand(60, 160), '#4caf50', true), bot: tank(CV.rand(WD - 160, WD - 60), '#e53935', false),
      turn: 'you', shell: null, wind: CV.rand(-30, 30), boom: [], round: (st ? st.round : 0) + 1, aiming: false, wait: 0 }
    hud.set('r', String(st.round)); hud.set('w', String(wins))
  }

  function fire(t) {
    var rad = t.angle * Math.PI / 180, v = t.power * 5.2
    st.shell = { x: t.x + Math.cos(rad) * 20, y: t.y - 14 - Math.sin(rad) * 20, vx: Math.cos(rad) * v, vy: -Math.sin(rad) * v, owner: t, trail: [] }
    CV.beep(150, 0.12, 'sawtooth', 0.05)
  }

  function explode(x, y) {
    var R = 30, i
    for (i = Math.max(0, Math.floor(x - R)); i < Math.min(WD, x + R); i++) {
      var d = Math.sqrt(R * R - (i - x) * (i - x)), bottom = y + d
      if (ground[i] < bottom) ground[i] = Math.min(HD, Math.max(ground[i], bottom))
    }
    st.boom.push({ x: x, y: y, t: 0 })
    CV.beep(70, 0.25, 'square', 0.06)
    ;[st.you, st.bot].forEach(function (t) {
      var d2 = CV.dist(x, y, t.x, t.y - 6)
      if (d2 < 48) t.hp = Math.max(0, t.hp - Math.round((48 - d2) * 1.6 + 8))
    })
  }

  function botAim() {
    var b = st.bot, y = st.you, best = null
    var err = Math.max(2, 14 - wins * 2.5)
    for (var a = 100; a <= 165; a += 5) for (var p = 30; p <= 100; p += 2) {
      var hit = simulate(b, a, p)
      var d = Math.abs(hit - y.x)
      if (!best || d < best.d) best = { a: a, p: p, d: d }
    }
    b.angle = best.a + CV.rand(-err, err) * 0.4
    b.power = CV.clamp(best.p + CV.rand(-err, err) * 0.6, 20, 100)
  }
  function simulate(t, angle, power) {
    var rad = angle * Math.PI / 180, v = power * 5.2
    var x = t.x + Math.cos(rad) * 20, y = t.y - 14 - Math.sin(rad) * 20, vx = Math.cos(rad) * v, vy = -Math.sin(rad) * v
    for (var i = 0; i < 600; i++) {
      vx += st.wind * 0.016; vy += G * 0.016; x += vx * 0.016; y += vy * 0.016
      if (x < 0 || x >= WD) return x
      if (y >= gy(x)) return x
    }
    return x
  }

  function endTurn() {
    if (st.you.hp <= 0 || st.bot.hp <= 0) return roundOver()
    st.turn = st.turn === 'you' ? 'bot' : 'you'
    st.wind = CV.clamp(st.wind + CV.rand(-12, 12), -40, 40)
    if (st.turn === 'bot') { st.wait = 0.9; botAim() }
  }

  function roundOver() {
    playing = false
    var won = st.bot.hp <= 0 && st.you.hp > 0
    if (won) { wins += 1; CV.chord([523, 659, 784], 90) } else CV.chord([392, 294, 196], 100)
    var best = CV.best('tank-wars', wins)
    hud.set('best', CV.fmtInt(best)); hud.set('w', String(wins))
    if (won) over.show({ title: 'Direct hit!', score: wins + (wins === 1 ? ' win' : ' wins'), sub: 'The next bot aims better', body: 'Watch the wind arrow — it changes every turn.', button: 'Next round', onStart: function () { newRound(); playing = true } })
    else { var w = wins; wins = 0; st.round = 0
      over.show({ title: 'Tank destroyed', score: w + (w === 1 ? ' win' : ' wins'), sub: w >= best && w > 0 ? 'New best streak' : 'Best ' + CV.fmtInt(best), body: 'Set your angle and power, account for the wind, and land the shell on the enemy tank.', button: 'New war', onStart: function () { newRound(); playing = true } }) }
  }

  function update(dt) {
    var i
    for (i = st.boom.length - 1; i >= 0; i--) { st.boom[i].t += dt; if (st.boom[i].t > 0.5) st.boom.splice(i, 1) }
    ;[st.you, st.bot].forEach(function (t) { var g = gy(t.x); if (t.y < g) t.y = Math.min(g, t.y + 200 * dt); else t.y = g })
    if (!playing) return
    var y = st.you
    if (st.turn === 'you' && !st.shell) {
      if (k.down('ArrowLeft', 'KeyA')) y.angle = Math.min(175, y.angle + 50 * dt)
      if (k.down('ArrowRight', 'KeyD')) y.angle = Math.max(5, y.angle - 50 * dt)
      if (k.down('ArrowUp', 'KeyW')) y.power = Math.min(100, y.power + 40 * dt)
      if (k.down('ArrowDown', 'KeyS')) y.power = Math.max(15, y.power - 40 * dt)
    }
    if (st.turn === 'bot' && !st.shell) { st.wait -= dt; if (st.wait <= 0) fire(st.bot) }
    var s = st.shell
    if (s) {
      for (var n = 0; n < 4; n++) {
        var h = dt / 4
        s.vx += st.wind * h; s.vy += G * h; s.x += s.vx * h; s.y += s.vy * h
        if (s.x < -20 || s.x > WD + 20 || s.y > HD + 20) { st.shell = null; endTurn(); return }
        if (s.y >= gy(s.x) || (s.owner !== st.bot && CV.dist(s.x, s.y, st.bot.x, st.bot.y - 6) < 14) || (s.owner !== st.you && CV.dist(s.x, s.y, y.x, y.y - 6) < 14)) {
          explode(s.x, s.y); st.shell = null; endTurn(); return
        }
      }
      s.trail.push(s.x, s.y); if (s.trail.length > 60) s.trail.splice(0, 2)
    }
  }

  function drawTank(t) {
    ctx.save(); ctx.translate(t.x, t.y)
    var rad = t.angle * Math.PI / 180
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(Math.cos(rad) * 22, -14 - Math.sin(rad) * 22); ctx.stroke()
    ctx.fillStyle = t.color; ctx.beginPath(); ctx.arc(0, -12, 9, Math.PI, 0); ctx.fill()
    ctx.fillRect(-16, -12, 32, 9)
    ctx.fillStyle = '#333'; ctx.fillRect(-18, -4, 36, 6)
    ctx.fillStyle = '#555'; for (var i = -14; i <= 14; i += 7) { ctx.beginPath(); ctx.arc(i, -1, 2.5, 0, 7); ctx.fill() }
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(-18, -30, 36, 5)
    ctx.fillStyle = t.hp > 50 ? '#7ee081' : t.hp > 25 ? '#ffd54f' : '#ff6b6b'; ctx.fillRect(-18, -30, 36 * t.hp / 100, 5)
    ctx.restore()
  }

  function draw() {
    var uu = u(), ox = (view.w / uu - WD) / 2, oy = (view.h / uu - HD) / 2
    ctx.save(); ctx.scale(uu, uu)
    ctx.fillStyle = '#10131c'; ctx.fillRect(0, 0, view.w / uu, view.h / uu)
    ctx.translate(ox, oy)
    var sky = ctx.createLinearGradient(0, 0, 0, HD); sky.addColorStop(0, '#f6a35b'); sky.addColorStop(0.55, '#f7d08a'); sky.addColorStop(1, '#9ad0ec')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, WD, HD)
    ctx.fillStyle = 'rgba(255,240,200,.8)'; ctx.beginPath(); ctx.arc(560, 90, 34, 0, 7); ctx.fill()
    ctx.fillStyle = '#6b8f3a'; ctx.beginPath(); ctx.moveTo(0, HD)
    for (var x = 0; x < WD; x += 2) ctx.lineTo(x, ground[x])
    ctx.lineTo(WD, HD); ctx.fill()
    ctx.fillStyle = '#8a6a3c'; ctx.beginPath(); ctx.moveTo(0, HD)
    for (x = 0; x < WD; x += 2) ctx.lineTo(x, ground[x] + 10)
    ctx.lineTo(WD, HD); ctx.fill()
    drawTank(st.you); drawTank(st.bot)
    var s = st.shell
    if (s) {
      ctx.fillStyle = 'rgba(255,255,255,.5)'
      for (var i = 0; i < s.trail.length; i += 4) ctx.fillRect(s.trail[i], s.trail[i + 1], 2, 2)
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, 7); ctx.fill()
    }
    st.boom.forEach(function (b) {
      ctx.fillStyle = 'rgba(255,' + Math.round(200 - b.t * 300) + ',60,' + (1 - b.t * 2) + ')'
      ctx.beginPath(); ctx.arc(b.x, b.y, 10 + b.t * 70, 0, 7); ctx.fill()
    })
    // wind + aim readout
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(WD / 2 - 70, 40, 140, 26)
    ctx.fillStyle = '#fff'; ctx.font = '700 12px ui-sans-serif, system-ui'; ctx.textAlign = 'center'
    ctx.fillText('WIND ' + (st.wind < 0 ? '◀ ' : '') + Math.abs(Math.round(st.wind)) + (st.wind > 0 ? ' ▶' : ''), WD / 2, 58)
    if (playing && st.turn === 'you' && !st.shell) {
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(12, HD - 40, 210, 28)
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'
      ctx.fillText('ANGLE ' + Math.round(st.you.angle) + '°   POWER ' + Math.round(st.you.power), 22, HD - 21)
      var rad = st.you.angle * Math.PI / 180
      ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(st.you.x, st.you.y - 14); ctx.lineTo(st.you.x + Math.cos(rad) * st.you.power * 1.2, st.you.y - 14 - Math.sin(rad) * st.you.power * 1.2); ctx.stroke(); ctx.setLineDash([])
    } else if (playing && st.turn === 'bot') { ctx.fillText('ENEMY IS AIMING…', WD / 2, 90) }
    ctx.restore()
  }

  // touch / mouse: drag back from your tank like a slingshot, release to fire
  function toDesign(pt) { var uu = u(); return { x: pt.x / uu - (view.w / uu - WD) / 2, y: pt.y / uu - (view.h / uu - HD) / 2 } }
  CV.pointer(view.c, {
    down: function (pt) { if (playing && st.turn === 'you' && !st.shell) st.aiming = true; aim(pt) },
    move: function (pt) { aim(pt) },
    up: function () { if (st && st.aiming) { st.aiming = false; if (playing && st.turn === 'you' && !st.shell) fire(st.you) } }
  })
  function aim(pt) {
    if (!st || !st.aiming) return
    var d = toDesign(pt), y = st.you, dx = d.x - y.x, dy = (y.y - 14) - d.y
    if (Math.hypot(dx, dy) < 8) return
    y.angle = CV.clamp(Math.atan2(dy, dx) * 180 / Math.PI, 5, 175)
    y.power = CV.clamp(Math.hypot(dx, dy) / 1.4, 15, 100)
  }
  k.onDown(['Space', 'Enter'], function () { if (playing && st.turn === 'you' && !st.shell) fire(st.you) })

  hud.set('best', CV.fmtInt(CV.best('tank-wars')))
  newRound()
  CV.loop(function (dt) { if (!document.hidden) update(dt); draw() })
  over.show({ title: 'Tank Wars', body: 'Turn-based artillery. Set your angle and power, read the wind, and blow the enemy tank off the hill before it does the same to you.',
    controls: [['← →', 'angle'], ['↑ ↓', 'power'], ['Space', 'fire'], ['Drag + release', 'aim & fire']], button: 'Start the war', onStart: function () { playing = true } })
})(window.CV)
