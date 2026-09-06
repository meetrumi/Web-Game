/* Hoop Streak — a sixty-second shooting game on the shared runtime in
   ../shared/core.js. The whole thing is one projectile against two rim posts
   and a backboard, so the difficulty lives entirely in the geometry: gravity is
   low enough that a clean arc exists, but the window that clears the front post
   and still drops inside is only a few degrees wide. Ten baskets in and the
   hoop starts sliding, which moves that window while you are aiming at it. */

(function (CV) {
  'use strict'

  var W = 460
  var H = 400
  var FLOOR = 372
  var BX = 96          // where the ball is spotted for every shot
  var BY = 348
  var BR = 11
  var RIM = 46         // distance between the two rim posts
  var RIMY = 200
  var HBASE = 333      // rim centre when the hoop is not sliding
  var GRAV = 520
  var MAXV = 700
  var ROUND = 60

  var view = CV.canvas('#c')
  var ctx = view.ctx
  var hud = CV.hud([
    { key: 'time', label: 'Time' },
    { key: 'score', label: 'Score' },
    { key: 'best', label: 'Best' }
  ])
  var over = CV.overlay()
  var k = CV.keys()

  var st = null
  var playing = false

  function u() { return Math.min(view.h / H, view.w / W) }

  /* Sliding starts at ten baskets and gets quicker at twenty-five. Amplitude and
     rate are derived from the count so there is no separate difficulty state to
     keep in sync. */
  function amp() { return st.made < 10 ? 0 : st.made < 25 ? 34 : 52 }
  function rate() { return st.made < 25 ? 0.9 : 1.45 }
  function hoopX() { return HBASE + amp() * Math.sin(st.clock * rate()) }
  function boardX() { return hoopX() + RIM / 2 }
  function reset() {
    st = {
      time: ROUND, clock: 0, score: 0, made: 0, shots: 0, streak: 0, bestStreak: 0,
      ang: -0.99, pow: 0.68, aiming: false,
      ball: null, flash: 0, pops: []
    }
    hud.set('time', CV.fmtTime(ROUND))
    hud.set('score', '0')
  }

  function shoot() {
    if (!playing || st.ball) return
    st.shots += 1
    st.ball = {
      x: BX, y: BY, py: BY,
      vx: Math.cos(st.ang) * st.pow * MAXV,
      vy: Math.sin(st.ang) * st.pow * MAXV,
      age: 0, touched: false, scored: false
    }
    CV.beep(300, 0.05, 'sine', 0.03)
  }

  function pop(text, x, y, colour) {
    st.pops.push({ text: text, x: x, y: y, life: 1, colour: colour })
  }

  function basket(b) {
    b.scored = true
    st.made += 1
    st.streak += 1
    if (st.streak > st.bestStreak) st.bestStreak = st.streak
    var swish = !b.touched
    var points = 10 + Math.min(st.streak - 1, 9) * 5 + (swish ? 10 : 0)
    st.score += points
    st.flash = 1
    hud.set('score', CV.fmtInt(st.score))
    pop((swish ? 'SWISH +' : '+') + points, b.x, RIMY - 16, swish ? '#7df2c0' : '#ffe27a')
    CV.beep(620 + Math.min(st.streak, 10) * 55, 0.09, 'triangle', 0.045)
    if (st.made === 10) CV.toast('Ten down — the hoop starts moving')
    if (st.made === 25) CV.toast('Twenty-five — it stops being polite')
  }

  function missed() {
    if (st.streak >= 3) pop('streak lost', BX + 40, BY - 60, 'rgba(255,255,255,.6)')
    st.streak = 0
  }
  function end() {
    playing = false
    CV.chord([392, 523, 659], 100)
    var best = CV.best('hoop-streak', st.score)
    hud.set('best', CV.fmtInt(best))
    over.show({
      title: st.score >= 320 ? 'Hot hand' : 'Full time',
      score: CV.fmtInt(st.score),
      sub: st.score >= best && st.score > 0 ? 'New best score' : 'Best ' + CV.fmtInt(best),
      body: st.made + ' of ' + st.shots + ' attempts, longest streak ' + st.bestStreak + '.',
      button: 'Shoot again',
      onStart: start
    })
  }

  function physics(b, dt) {
    var i, dx, dy, d, nx, ny, dot
    b.py = b.y
    b.vy += GRAV * dt
    b.x += b.vx * dt
    b.y += b.vy * dt
    b.age += dt

    if (b.x < BR) { b.x = BR; b.vx = -b.vx * 0.7 }
    if (b.x > W - BR) { b.x = W - BR; b.vx = -b.vx * 0.7 }

    var bx = boardX()
    if (b.x + BR > bx && b.x - BR < bx + 6 && b.y > RIMY - 86 && b.y < RIMY + 6) {
      b.x = bx - BR
      b.vx = -Math.abs(b.vx) * 0.62
      b.touched = true
      CV.beep(170, 0.04, 'square', 0.022)
    }

    /* Crossing the rim plane between the posts is the goal test, and it runs
       before the post bounces so a ball that rattles in still counts. */
    var cx = hoopX()
    if (!b.scored && b.py <= RIMY && b.y > RIMY && b.vy > 0 && Math.abs(b.x - cx) < RIM / 2 - BR - 1) {
      basket(b)
    }

    for (i = -1; i <= 1; i += 2) {
      dx = b.x - (cx + i * RIM / 2)
      dy = b.y - RIMY
      d = Math.sqrt(dx * dx + dy * dy)
      if (d < BR + 3.5 && d > 0.001) {
        nx = dx / d
        ny = dy / d
        b.x = cx + i * RIM / 2 + nx * (BR + 3.5)
        b.y = RIMY + ny * (BR + 3.5)
        dot = b.vx * nx + b.vy * ny
        b.vx = (b.vx - 2 * dot * nx) * 0.6
        b.vy = (b.vy - 2 * dot * ny) * 0.6
        b.touched = true
        CV.beep(240, 0.04, 'square', 0.02)
      }
    }

    if (b.y > FLOOR - BR) {
      b.y = FLOOR - BR
      b.vy = -Math.abs(b.vy) * 0.5
      b.vx *= 0.84
    }

    if (b.scored && b.done == null) b.done = b.age + 0.6
    if (b.age > (b.done == null ? 3.2 : b.done) || b.x > W + 40) {
      if (!b.scored) missed()
      st.ball = null
    }
  }
  function offX() { return (view.w / u() - W) / 2 }
  function offY() { return (view.h / u() - H) / 2 }

  function aimKeys(dt) {
    if (k.down('ArrowLeft', 'KeyA')) st.ang -= dt * 1.15
    if (k.down('ArrowRight', 'KeyD')) st.ang += dt * 1.15
    if (k.down('ArrowUp', 'KeyW')) st.pow += dt * 0.55
    if (k.down('ArrowDown', 'KeyS')) st.pow -= dt * 0.55
    st.ang = CV.clamp(st.ang, -1.48, -0.08)
    st.pow = CV.clamp(st.pow, 0.2, 1)
  }

  function update(dt) {
    var i, p
    for (i = st.pops.length - 1; i >= 0; i--) {
      p = st.pops[i]
      p.life -= dt * 1.1
      p.y -= dt * 24
      if (p.life <= 0) st.pops.splice(i, 1)
    }
    if (st.flash > 0) st.flash = Math.max(0, st.flash - dt * 2)
    if (!playing) return

    /* `clock` only advances while the round is live, so the hoop freezes with
       the timer rather than drifting behind the game-over card. */
    st.clock += dt
    st.time -= dt
    hud.set('time', CV.fmtTime(Math.max(0, st.time)))
    if (st.time <= 0) { st.time = 0; end(); return }

    if (st.ball) physics(st.ball, dt)
    else if (!st.aiming) aimKeys(dt)
  }
  /* --------------------------------------------------------------------- draw */
  function net(cx) {
    var i, t, y, f
    ctx.strokeStyle = 'rgba(236, 242, 255, .5)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    for (i = 0; i <= 6; i++) {
      t = cx - RIM / 2 + (RIM / 6) * i
      ctx.moveTo(t, RIMY)
      ctx.lineTo(cx + (t - cx) * 0.52, RIMY + 30)
    }
    for (i = 1; i <= 3; i++) {
      y = RIMY + i * 10
      f = 1 - i * 0.16
      ctx.moveTo(cx - RIM / 2 * f, y)
      ctx.lineTo(cx + RIM / 2 * f, y)
    }
    ctx.stroke()
  }

  /* Side-on view, so the backboard is a plate seen edge-first and the rim is a
     single bar between the two posts the ball actually collides with. */
  function hoop() {
    var cx = hoopX()
    var bx = boardX()
    ctx.fillStyle = '#232c40'
    ctx.fillRect(bx + 7, RIMY - 40, 5, FLOOR - RIMY + 40)
    ctx.fillRect(bx + 2, FLOOR - 7, 30, 7)
    ctx.fillStyle = 'rgba(226, 236, 255, .9)'
    ctx.fillRect(bx, RIMY - 86, 6, 92)
    ctx.fillStyle = 'rgba(20, 26, 40, .35)'
    ctx.fillRect(bx + 4, RIMY - 86, 2, 92)
    if (st.flash > 0) {
      ctx.globalAlpha = st.flash * 0.45
      ctx.fillStyle = '#7df2c0'
      ctx.fillRect(cx - RIM / 2 - 7, RIMY - 4, RIM + 14, 36)
      ctx.globalAlpha = 1
    }
    net(cx)
    ctx.strokeStyle = '#ff7a3c'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - RIM / 2, RIMY)
    ctx.lineTo(cx + RIM / 2, RIMY)
    ctx.stroke()
    ctx.lineCap = 'butt'
  }
  function court() {
    var i
    ctx.fillStyle = '#101830'
    ctx.fillRect(0, 0, W, FLOOR)
    ctx.fillStyle = 'rgba(122, 152, 255, .05)'
    for (i = 0; i < 7; i++) ctx.fillRect(16 + i * 66, 38, 44, 90)
    ctx.fillStyle = '#33251a'
    ctx.fillRect(0, FLOOR, W, H - FLOOR)
    ctx.fillStyle = 'rgba(255, 226, 168, .08)'
    for (i = 0; i < 12; i++) ctx.fillRect(i * 40, FLOOR, 22, H - FLOOR)
    ctx.strokeStyle = 'rgba(236, 242, 255, .16)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, FLOOR + 1)
    ctx.lineTo(W, FLOOR + 1)
    ctx.stroke()
  }

  function shooter() {
    var hx = BX - 24
    ctx.fillStyle = '#1b2440'
    ctx.beginPath()
    ctx.arc(hx, FLOOR - 50, 8, 0, 6.2832)
    ctx.fill()
    ctx.fillRect(hx - 7, FLOOR - 42, 14, 26)
    ctx.fillRect(hx - 7, FLOOR - 17, 5, 17)
    ctx.fillRect(hx + 2, FLOOR - 17, 5, 17)
    ctx.strokeStyle = '#1b2440'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(hx + 4, FLOOR - 38)
    ctx.lineTo(BX - 6, BY + 6)
    ctx.stroke()
  }
  function ball(x, y) {
    ctx.fillStyle = '#f0913f'
    ctx.beginPath()
    ctx.arc(x, y, BR, 0, 6.2832)
    ctx.fill()
    ctx.strokeStyle = 'rgba(58, 26, 8, .7)'
    ctx.lineWidth = 1.4
    ctx.save()
    ctx.translate(x, y)
    /* Spin is read straight off the x position: no angular state to integrate,
       and the ball still rolls the right way when it bounces back. */
    ctx.rotate(x * 0.045)
    ctx.beginPath()
    ctx.moveTo(-BR, 0)
    ctx.lineTo(BR, 0)
    ctx.moveTo(0, -BR)
    ctx.quadraticCurveTo(BR * 0.8, 0, 0, BR)
    ctx.moveTo(0, -BR)
    ctx.quadraticCurveTo(-BR * 0.8, 0, 0, BR)
    ctx.stroke()
    ctx.restore()
  }

  /* The guide runs the same integration as the live ball, so what it draws is
     exactly the flight you get — it just stops at the floor. */
  function guide() {
    var x = BX
    var y = BY
    var vx = Math.cos(st.ang) * st.pow * MAXV
    var vy = Math.sin(st.ang) * st.pow * MAXV
    var dt = 0.035
    var i
    ctx.fillStyle = 'rgba(236, 242, 255, .32)'
    for (i = 0; i < 30; i++) {
      vy += GRAV * dt
      x += vx * dt
      y += vy * dt
      if (y > FLOOR - BR || x > W) break
      if (i % 2 === 0) {
        ctx.beginPath()
        ctx.arc(x, y, Math.max(0.8, 2.4 - i * 0.05), 0, 6.2832)
        ctx.fill()
      }
    }
  }
  function draw() {
    var uu = u()
    var vw = view.w / uu
    var vh = view.h / uu
    var i, p

    ctx.save()
    ctx.scale(uu, uu)
    ctx.fillStyle = '#070a12'
    ctx.fillRect(0, 0, vw, vh)
    ctx.translate((vw - W) / 2, (vh - H) / 2)

    court()
    hoop()
    shooter()
    if (!st.ball && playing) guide()
    ball(st.ball ? st.ball.x : BX, st.ball ? st.ball.y : BY)

    /* Power reads out on the floor line beside the shooter, well clear of the
       flight path so it never sits between you and the rim. */
    if (!st.ball) {
      ctx.fillStyle = 'rgba(255, 255, 255, .12)'
      ctx.fillRect(30, FLOOR + 11, 120, 7)
      ctx.fillStyle = st.pow > 0.86 ? '#ff8a6a' : '#7df2c0'
      ctx.fillRect(30, FLOOR + 11, 120 * st.pow, 7)
    }

    if (st.streak >= 2) {
      ctx.fillStyle = '#ffe27a'
      ctx.font = '800 15px ui-sans-serif, system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(st.streak + ' in a row', W - 16, FLOOR + 21)
    }

    ctx.textAlign = 'center'
    ctx.font = '800 16px ui-sans-serif, system-ui, sans-serif'
    for (i = 0; i < st.pops.length; i++) {
      p = st.pops[i]
      ctx.globalAlpha = Math.min(1, p.life)
      ctx.fillStyle = p.colour
      ctx.fillText(p.text, p.x, p.y)
    }
    ctx.globalAlpha = 1
    ctx.textAlign = 'left'
    ctx.restore()
  }
  /* -------------------------------------------------------------------- input */
  /* Drag is a direct aim: the line from the ball to your finger is the launch
     angle, and how far away you hold it is the power. */
  function aimAt(p) {
    var x = p.x / u() - offX()
    var y = p.y / u() - offY()
    var dx = Math.max(10, x - BX)
    var dy = Math.min(-6, y - BY)
    st.ang = CV.clamp(Math.atan2(dy, dx), -1.48, -0.08)
    st.pow = CV.clamp(CV.dist(BX, BY, x, y) / 210, 0.2, 1)
  }

  CV.pointer(view.c, {
    down: function (p) { if (playing && !st.ball) { st.aiming = true; aimAt(p) } },
    move: function (p) { if (st.aiming) aimAt(p) },
    up: function () { if (st.aiming) { st.aiming = false; shoot() } }
  })
  k.onDown(['Space', 'Enter'], function () { shoot() })

  function start() {
    reset()
    playing = true
  }

  hud.set('best', CV.fmtInt(CV.best('hoop-streak')))
  reset()
  CV.loop(function (dt) {
    if (!document.hidden) update(dt)
    draw()
  })

  over.show({
    title: 'Hoop Streak',
    body: 'Sixty seconds from one spot on the floor. Drag to set the arc and let ' +
      'go to shoot — the further out you hold, the harder the throw. Nothing but ' +
      'net pays a bonus, and each make in a row is worth more than the last. ' +
      'Ten baskets in, the hoop starts sliding.',
    controls: [['Drag', 'aim + shoot'], ['←→', 'angle'], ['↑↓', 'power'], ['Space', 'shoot']],
    button: 'Tip off',
    onStart: start
  })
})(window.CV)
