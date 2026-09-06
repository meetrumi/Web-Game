/* Tank Duel Arena — a one-on-one tank fight on the shared runtime in
   ../shared/core.js. Both tanks are circles, every wall is an axis-aligned box,
   and the barrel is simply the direction the hull faces — so turning to shoot
   and turning to drive are the same decision for you and for the bot. Shells
   bounce twice before they die, which means the arena has no safe angles: a
   shot you fired can come back and take a point off you. First to five hits
   takes the duel, and every duel you win upgrades the bot. */

(function (CV) {
  'use strict'

  var W = 560
  var H = 400
  var TR = 14          // tank radius
  var SR = 4           // shell radius
  var TV = 120         // your top speed
  var TROT = 2.6       // your turn rate, rad/s
  var SV = 330
  var MAXB = 2         // wall bounces a shell survives
  var RELOAD = 0.8
  var TARGET = 5       // hits that take a duel
  var RESPAWN = 0.9

  /* The eight interior boxes are symmetric under a half turn about the centre,
     so neither spawn has better cover than the other. */
  var WALLS = [
    { x: 0, y: 0, w: W, h: 12 }, { x: 0, y: H - 12, w: W, h: 12 },
    { x: 0, y: 0, w: 12, h: H }, { x: W - 12, y: 0, w: 12, h: H },
    { x: 140, y: 70, w: 16, h: 110 }, { x: 404, y: 220, w: 16, h: 110 },
    { x: 250, y: 60, w: 60, h: 16 }, { x: 250, y: 324, w: 60, h: 16 },
    { x: 266, y: 170, w: 28, h: 60 },
    { x: 80, y: 250, w: 110, h: 16 }, { x: 370, y: 134, w: 110, h: 16 }
  ]
  var SPAWN = [{ x: 58, y: 342, a: -0.9 }, { x: 502, y: 58, a: 2.24 }]

  var view = CV.canvas('#c')
  var ctx = view.ctx
  var hud = CV.hud([
    { key: 'duel', label: 'Duel' },
    { key: 'score', label: 'Score' },
    { key: 'best', label: 'Best' }
  ])
  var over = CV.overlay()
  var k = CV.keys()

  var st = null
  var playing = false
  var touch = { on: false, x: 0, y: 0, moved: 0 }

  function u() { return Math.min(view.h / H, view.w / W) }
  function offX() { return (view.w / u() - W) / 2 }
  function offY() { return (view.h / u() - H) / 2 }

  /* Bot strength is a pure function of the level, so the only thing a duel win
     has to change is a single number. */
  function skill() {
    var L = st.level
    return {
      rot: 1.5 + L * 0.22,
      err: Math.max(0.05, 0.42 - L * 0.055),
      reload: Math.max(0.55, 1.9 - L * 0.16),
      speed: 88 + L * 7,
      tol: Math.max(0.06, 0.2 - L * 0.022)
    }
  }

  function tank(i) {
    return {
      x: SPAWN[i].x, y: SPAWN[i].y, a: SPAWN[i].a,
      cool: 0, dead: 0, inv: 1.1, hits: 0, moving: 0,
      tx: SPAWN[i].x, ty: SPAWN[i].y, retarget: 0, bias: 0, stuck: 0
    }
  }
  function reset() {
    st = {
      you: tank(0), foe: tank(1), shells: [], parts: [],
      level: 1, duels: 0, score: 0, shake: 0
    }
    hud.set('duel', '0 – 0')
    hud.set('score', '0')
  }
  function wrap(a) {
    while (a > Math.PI) a -= 6.2832
    while (a < -Math.PI) a += 6.2832
    return a
  }

  /* Circle against every box, resolved by pushing out along the line to the
     nearest point on the box — the same test the shells use, minus the reflect. */
  function unstick(o, r) {
    var i, wl, cx, cy, dx, dy, d, px, py
    var bumped = false
    for (i = 0; i < WALLS.length; i++) {
      wl = WALLS[i]
      cx = CV.clamp(o.x, wl.x, wl.x + wl.w)
      cy = CV.clamp(o.y, wl.y, wl.y + wl.h)
      dx = o.x - cx
      dy = o.y - cy
      d = Math.sqrt(dx * dx + dy * dy)
      if (d >= r) continue
      bumped = true
      if (d > 0.001) {
        o.x = cx + dx / d * r
        o.y = cy + dy / d * r
      } else {
        px = Math.min(o.x - wl.x, wl.x + wl.w - o.x)
        py = Math.min(o.y - wl.y, wl.y + wl.h - o.y)
        if (px < py) o.x += (o.x < wl.x + wl.w / 2 ? -1 : 1) * (px + r)
        else o.y += (o.y < wl.y + wl.h / 2 ? -1 : 1) * (py + r)
      }
    }
    return bumped
  }

  function solid(x, y) {
    var i, wl
    for (i = 0; i < WALLS.length; i++) {
      wl = WALLS[i]
      if (x > wl.x && x < wl.x + wl.w && y > wl.y && y < wl.y + wl.h) return true
    }
    return false
  }
  /* Sampled sight line. Seven units is well under the thinnest wall, so nothing
     is ever visible through a box. */
  function los(a, b) {
    var n = Math.ceil(CV.dist(a.x, a.y, b.x, b.y) / 7)
    var i, t
    for (i = 1; i < n; i++) {
      t = i / n
      if (solid(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false
    }
    return true
  }

  function boom(x, y, colour, n) {
    var i, a, sp
    for (i = 0; i < n; i++) {
      a = CV.rand(0, 6.2832)
      sp = CV.rand(40, 230)
      st.parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: CV.rand(0.4, 0.9), col: colour
      })
    }
  }

  function fire(t, mine) {
    if (t.dead > 0 || t.cool > 0) return
    t.cool = mine ? RELOAD : skill().reload
    st.shells.push({
      x: t.x + Math.cos(t.a) * (TR + SR + 1),
      y: t.y + Math.sin(t.a) * (TR + SR + 1),
      vx: Math.cos(t.a) * SV, vy: Math.sin(t.a) * SV,
      mine: mine, bounces: 0, age: 0
    })
    CV.beep(mine ? 220 : 180, 0.07, 'square', 0.03)
    boom(t.x + Math.cos(t.a) * TR, t.y + Math.sin(t.a) * TR, '#ffd166', 3)
  }

  function drive(t, turn, gas, rot, spd, dt) {
    t.a = wrap(t.a + turn * rot * dt)
    if (gas !== 0) {
      t.x += Math.cos(t.a) * gas * spd * dt
      t.y += Math.sin(t.a) * gas * spd * dt
      t.moving = Math.min(1, t.moving + dt * 5)
    } else {
      t.moving = Math.max(0, t.moving - dt * 5)
    }
    if (unstick(t, TR)) t.stuck += dt
    else t.stuck = 0
  }

  function human(dt) {
    var t = st.you
    var turn = (k.down('ArrowRight', 'KeyD') ? 1 : 0) - (k.down('ArrowLeft', 'KeyA') ? 1 : 0)
    var gas = (k.down('ArrowUp', 'KeyW') ? 1 : 0) - (k.down('ArrowDown', 'KeyS') ? 1 : 0)
    var da
    if (touch.on) {
      /* Finger steering: the hull turns towards where you hold and rolls forward
         once it is roughly pointing that way, so one thumb drives and aims. */
      da = wrap(Math.atan2(touch.y - t.y, touch.x - t.x) - t.a)
      turn = CV.clamp(da * 3.4, -1, 1)
      gas = Math.abs(da) < 1.2 && CV.dist(t.x, t.y, touch.x, touch.y) > TR * 1.7 ? 1 : 0
    }
    drive(t, turn, gas, TROT, TV, dt)
  }

  /* The bot cannot drive and aim at once either. With a sight line it stops
     turning towards its waypoint and turns onto you instead, which is what makes
     it readable: if the barrel swings your way, move. */
  function think(dt) {
    var t = st.foe
    var s = skill()
    var da, gas, d
    t.retarget -= dt
    if (st.you.dead <= 0 && los(t, st.you)) {
      da = wrap(Math.atan2(st.you.y - t.y, st.you.x - t.x) + t.bias - t.a)
      d = CV.dist(t.x, t.y, st.you.x, st.you.y)
      gas = Math.abs(da) > 0.5 ? 0 : d > 210 ? 1 : d < 92 ? -1 : 0
      drive(t, CV.clamp(da * 4, -1, 1), gas, s.rot, s.speed, dt)
      if (Math.abs(da) < s.tol && t.cool <= 0) {
        fire(t, false)
        t.bias = CV.rand(-s.err, s.err)
      }
      return
    }
    if (t.retarget <= 0 || t.stuck > 0.25 || CV.dist(t.x, t.y, t.tx, t.ty) < 26) {
      t.retarget = CV.rand(1.4, 3)
      t.tx = CV.clamp(st.you.x + CV.rand(-150, 150), 26, W - 26)
      t.ty = CV.clamp(st.you.y + CV.rand(-150, 150), 26, H - 26)
      t.bias = CV.rand(-s.err, s.err)
    }
    da = wrap(Math.atan2(t.ty - t.y, t.tx - t.x) - t.a)
    drive(t, CV.clamp(da * 3.2, -1, 1), Math.abs(da) < 1.1 ? 1 : 0, s.rot, s.speed, dt)
  }

  function bounce(s) {
    var i, wl, cx, cy, dx, dy, d, nx, ny, dot
    var hit = false
    for (i = 0; i < WALLS.length; i++) {
      wl = WALLS[i]
      cx = CV.clamp(s.x, wl.x, wl.x + wl.w)
      cy = CV.clamp(s.y, wl.y, wl.y + wl.h)
      dx = s.x - cx
      dy = s.y - cy
      d = Math.sqrt(dx * dx + dy * dy)
      if (d >= SR) continue
      if (d < 0.001) { nx = 0; ny = s.vy > 0 ? -1 : 1 }
      else { nx = dx / d; ny = dy / d }
      s.x = cx + nx * SR
      s.y = cy + ny * SR
      dot = s.vx * nx + s.vy * ny
      s.vx -= 2 * dot * nx
      s.vy -= 2 * dot * ny
      hit = true
    }
    return hit
  }

  /* Your own shell can hit you, but not in the first quarter second: long enough
     to clear your hull, short enough that a ricochet off the near wall counts. */
  function lands(s, t, own) {
    if (t.dead > 0 || t.inv > 0) return false
    if (own && s.age < 0.25) return false
    return CV.dist(s.x, s.y, t.x, t.y) < TR + SR
  }
  function strike(s) {
    if (lands(s, st.you, s.mine)) { point(false); return true }
    if (lands(s, st.foe, !s.mine)) { point(true); return true }
    return false
  }

  function shells(dt) {
    var i, j, s, steps, h
    for (i = st.shells.length - 1; i >= 0; i--) {
      s = st.shells[i]
      steps = Math.max(1, Math.ceil(SV * dt / 5))
      h = dt / steps
      for (j = 0; j < steps; j++) {
        s.x += s.vx * h
        s.y += s.vy * h
        s.age += h
        if (bounce(s)) {
          s.bounces += 1
          CV.beep(130, 0.03, 'square', 0.014)
        }
        if (s.bounces > MAXB || strike(s)) { s.gone = true; break }
      }
      if (s.gone || s.age > 4.5) st.shells.splice(i, 1)
    }
  }

  function point(byYou) {
    var victim = byYou ? st.foe : st.you
    var scorer = byYou ? st.you : st.foe
    victim.dead = RESPAWN
    scorer.hits += 1
    boom(victim.x, victim.y, byYou ? '#ff9f5a' : '#ff6a8a', 18)
    st.shake = 0.75
    if (byYou) {
      st.score += 100 + st.level * 20
      hud.set('score', CV.fmtInt(st.score))
      CV.beep(660, 0.09, 'triangle', 0.045)
    } else {
      CV.chord([210, 150], 70)
    }
    hud.set('duel', st.you.hits + ' – ' + st.foe.hits)
    if (scorer.hits >= TARGET) {
      if (byYou) upgrade()
      else end()
    }
  }

  /* Winning a duel does not end the run: the bot gets better and the next duel
     starts on the same score, so the run ends when it finally beats you. */
  function upgrade() {
    st.duels += 1
    st.level += 1
    st.score += 250 + st.duels * 100
    st.you = tank(0)
    st.foe = tank(1)
    st.shells = []
    hud.set('score', CV.fmtInt(st.score))
    hud.set('duel', '0 – 0')
    CV.chord([523, 659, 784], 90)
    CV.toast('Duel won — the bot moves up to level ' + st.level)
  }

  function end() {
    var best
    if (!playing) return
    playing = false
    CV.chord([349, 262, 196], 100)
    best = CV.best('tank-duel-arena', st.score)
    hud.set('best', CV.fmtInt(best))
    over.show({
      title: st.duels >= 3 ? 'Held the arena' : st.duels > 0 ? 'Beaten at level ' + st.level : 'Out-gunned',
      score: CV.fmtInt(st.score),
      sub: st.score >= best && st.score > 0 ? 'New best score' : 'Best ' + CV.fmtInt(best),
      body: st.duels + (st.duels === 1 ? ' duel' : ' duels') + ' won, last one ' +
        st.you.hits + '–' + st.foe.hits + ' against a level ' + st.level + ' bot.',
      button: 'Rematch',
      onStart: start
    })
  }

  function respawn(t, i) {
    t.x = SPAWN[i].x
    t.y = SPAWN[i].y
    t.a = SPAWN[i].a
    t.inv = 1.1
    t.cool = 0.45
    t.moving = 0
  }
  function tick(t, i, dt) {
    if (t.cool > 0) t.cool -= dt
    if (t.inv > 0) t.inv -= dt
    if (t.dead > 0) {
      t.dead -= dt
      if (t.dead <= 0) respawn(t, i)
    }
  }

  function update(dt) {
    var i, p
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt * 2)
    for (i = st.parts.length - 1; i >= 0; i--) {
      p = st.parts[i]
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.94
      p.vy *= 0.94
      if (p.life <= 0) st.parts.splice(i, 1)
    }
    if (!playing) return
    tick(st.you, 0, dt)
    tick(st.foe, 1, dt)
    if (st.you.dead <= 0) human(dt)
    if (st.foe.dead <= 0) think(dt)
    shells(dt)
  }

  /* --------------------------------------------------------------------- draw */
  function rr(x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
    ctx.fill()
  }

  function hull(t, mine) {
    if (t.dead > 0) return
    ctx.save()
    ctx.translate(t.x, t.y)
    ctx.rotate(t.a)
    if (t.inv > 0 && Math.floor(t.inv * 14) % 2 === 0) ctx.globalAlpha = 0.35
    ctx.fillStyle = '#0f1420'
    ctx.fillRect(-13, -13, 26, 5)
    ctx.fillRect(-13, 8, 26, 5)
    ctx.fillStyle = mine ? '#3f86ff' : '#ff5d5d'
    rr(-12, -9, 24, 18, 4)
    ctx.fillStyle = mine ? '#a8caff' : '#ffb8b8'
    ctx.fillRect(4, -2.5, 19, 5)
    ctx.beginPath()
    ctx.arc(0, 0, 6, 0, 6.2832)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.restore()
    if (mine && t.cool > 0) {
      ctx.strokeStyle = 'rgba(236, 242, 255, .45)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(t.x, t.y, TR + 4, -1.5708, -1.5708 + 6.2832 * (1 - t.cool / RELOAD))
      ctx.stroke()
    }
  }

  /* A short sight ray, stopped at the first wall. It shows which way the barrel
     is pointing without predicting the bounces for you. */
  function ray(t) {
    var cx = Math.cos(t.a)
    var cy = Math.sin(t.a)
    var x = t.x + cx * (TR + 2)
    var y = t.y + cy * (TR + 2)
    var i
    for (i = TR + 2; i < 100; i += 4) {
      if (solid(t.x + cx * i, t.y + cy * i)) break
      x = t.x + cx * i
      y = t.y + cy * i
    }
    ctx.strokeStyle = 'rgba(168, 202, 255, .28)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(t.x + cx * (TR + 2), t.y + cy * (TR + 2))
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function pips() {
    var i
    for (i = 0; i < TARGET; i++) {
      ctx.fillStyle = i < st.you.hits ? '#5eb8ff' : 'rgba(94, 184, 255, .16)'
      ctx.beginPath()
      ctx.arc(26 + i * 13, 25, 4, 0, 6.2832)
      ctx.fill()
      ctx.fillStyle = i < st.foe.hits ? '#ff6a6a' : 'rgba(255, 106, 106, .16)'
      ctx.beginPath()
      ctx.arc(W - 26 - i * 13, 25, 4, 0, 6.2832)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(236, 242, 255, .3)'
    ctx.font = '700 10px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('BOT LEVEL ' + st.level, W / 2, 28)
    ctx.textAlign = 'left'
  }

  function draw() {
    var uu = u()
    var vw = view.w / uu
    var vh = view.h / uu
    var i, wl, s, p

    ctx.save()
    ctx.scale(uu, uu)
    ctx.fillStyle = '#070a12'
    ctx.fillRect(0, 0, vw, vh)
    ctx.translate((vw - W) / 2, (vh - H) / 2)
    ctx.save()
    if (st.shake > 0) ctx.translate(CV.rand(-4, 4) * st.shake, CV.rand(-4, 4) * st.shake)

    ctx.fillStyle = '#0e1322'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(255, 255, 255, .028)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (i = 28; i < W; i += 28) { ctx.moveTo(i, 0); ctx.lineTo(i, H) }
    for (i = 28; i < H; i += 28) { ctx.moveTo(0, i); ctx.lineTo(W, i) }
    ctx.stroke()

    for (i = 0; i < WALLS.length; i++) {
      wl = WALLS[i]
      ctx.fillStyle = '#232c44'
      ctx.fillRect(wl.x, wl.y, wl.w, wl.h)
      ctx.fillStyle = 'rgba(255, 255, 255, .06)'
      ctx.fillRect(wl.x, wl.y, wl.w, 3)
    }
    pips()
    if (playing && st.you.dead <= 0) ray(st.you)
    hull(st.you, true)
    hull(st.foe, false)

    for (i = 0; i < st.shells.length; i++) {
      s = st.shells[i]
      ctx.strokeStyle = s.mine ? 'rgba(168, 202, 255, .35)' : 'rgba(255, 168, 168, .35)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(s.x - s.vx * 0.035, s.y - s.vy * 0.035)
      ctx.lineTo(s.x, s.y)
      ctx.stroke()
      ctx.fillStyle = s.mine ? '#dceaff' : '#ffdcdc'
      ctx.beginPath()
      ctx.arc(s.x, s.y, SR, 0, 6.2832)
      ctx.fill()
    }
    for (i = 0; i < st.parts.length; i++) {
      p = st.parts[i]
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6))
      ctx.fillStyle = p.col
      ctx.fillRect(p.x - 1.6, p.y - 1.6, 3.2, 3.2)
    }
    ctx.globalAlpha = 1
    ctx.restore()
    ctx.restore()
  }

  /* -------------------------------------------------------------------- input */
  function at(p) {
    touch.x = p.x / u() - offX()
    touch.y = p.y / u() - offY()
  }
  /* Hold to drive towards your finger, let go to shoot. A tap is therefore a
     turn-and-fire, which is the whole control scheme on a phone. */
  CV.pointer(view.c, {
    down: function (p) { touch.on = true; at(p) },
    move: function (p) { if (touch.on) at(p) },
    up: function () {
      if (!touch.on) return
      touch.on = false
      if (playing) fire(st.you, true)
    }
  })
  k.onDown(['Space', 'Enter'], function () { if (playing) fire(st.you, true) })

  function start() {
    reset()
    playing = true
  }

  hud.set('best', CV.fmtInt(CV.best('tank-duel-arena')))
  reset()
  CV.loop(function (dt) {
    if (!document.hidden) update(dt)
    draw()
  })

  over.show({
    title: 'Tank Duel Arena',
    body: 'First to five hits takes the duel, and every duel you win makes the ' +
      'bot quicker on the aim. Shells bounce twice, so bank them round cover — ' +
      'but a ricochet with your name on it counts against you just the same. The ' +
      'barrel points where the hull points, for both of you.',
    controls: [['←→', 'turn'], ['↑↓', 'drive'], ['Space', 'fire'], ['Hold', 'drive'], ['Release', 'fire']],
    button: 'Roll out',
    onStart: start
  })
})(window.CV)
