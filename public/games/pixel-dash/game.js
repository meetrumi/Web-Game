/* Pixel Dash — an endless one-button runner on the shared runtime in ../shared/core.js.
   The whole game is simulated in a 400-unit-tall virtual space and scaled to the
   canvas on the way out, so it plays identically on a phone and on a 1440p monitor.
   Three obstacle kinds, one rule each: blocks and gaps you jump, blades you duck. */

(function (CV) {
  'use strict'

  var H = 400        // virtual height, in units
  var WMIN = 620     // the world is never narrower than this, whatever the aspect
  var GROUND = 318   // the ground line, measured from the top
  var PX = 62        // the runner never moves horizontally; the world does
  var PW = 26
  var PH = 34        // standing height
  var DH = 20        // ducking height
  var GRAV = 2000
  var JUMP = 745
  var V0 = 300       // starting scroll speed, units/sec
  var VMAX = 700
  var BLADE_LOW = 26 // a blade's lower edge: under DH, over PH, so only ducking clears it

  var view = CV.canvas('#c')
  var ctx = view.ctx
  var hud = CV.hud([{ key: 'score', label: 'Score' }, { key: 'best', label: 'Best' }])
  var over = CV.overlay()
  var k = CV.keys()

  var sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#131a3a')
  sky.addColorStop(0.62, '#2b1c48')
  sky.addColorStop(1, '#120d20')

  var st = null
  var playing = false
  var duckHeld = false

  /* Scale is driven by height so jump arcs are always the same size on screen, but
     capped by WMIN so a narrow window cannot shrink the playfield to less than one
     jump wide. Whatever height is left over becomes matte above and below the band. */
  function u() { return Math.min(view.h / H, view.w / WMIN) }
  function W() { return view.w / u() }

  /* Stars and skyline are stored as 0..1 fractions of the screen width so a resize
     or a different aspect ratio cannot leave a bald patch in the parallax. */
  function backdrop() {
    var a = []
    var i
    for (i = 0; i < 46; i++) a.push({ f: Math.random(), y: CV.rand(8, GROUND - 70), r: CV.rand(0.7, 2), p: CV.rand(0.06, 0.3) })
    var b = []
    for (i = 0; i < 14; i++) b.push({ f: Math.random(), w: CV.rand(26, 62), h: CV.rand(40, 130), p: 0.28 })
    return { stars: a, city: b }
  }

  function reset() {
    st = {
      dist: 0, score: 0, v: V0, feet: 0, vy: 0, step: 0,
      obs: [], next: 300, bg: backdrop(), passed: 0
    }
  }
  /* ------------------------------------------------------------------ spawning */
  function spawn(x) {
    var r = Math.random()
    if (r < 0.4) st.obs.push({ t: 'block', x: x, w: CV.rand(24, 40), h: CV.rand(26, 66) })
    else if (r < 0.72) st.obs.push({ t: 'blade', x: x, w: CV.rand(24, 38) })
    else st.obs.push({ t: 'gap', x: x, w: CV.rand(58, 62 + Math.min(44, st.dist / 400)) })
  }

  /* Spacing is measured in seconds of travel, not units, so the reaction window
     stays the same length as the scroll speed climbs. */
  function respace() {
    st.next = st.v * CV.rand(0.82, 1.45)
    if (st.dist > 2600 && CV.chance(0.22)) st.next = st.v * 0.5
  }

  /* -------------------------------------------------------------------- update */
  function jump() {
    if (!playing) return
    if (st.feet > 0.5) return
    st.vy = JUMP
    CV.beep(520, 0.06, 'square', 0.03)
  }

  function hits(o, ph) {
    var top = st.feet + ph        // heights above the ground line
    if (o.x + o.w - 3 < PX || o.x + 3 > PX + PW) return false
    if (o.t === 'block') return st.feet < o.h - 3
    if (o.t === 'blade') return top > BLADE_LOW
    return st.feet <= 1           // a gap: only fatal with your feet down
  }

  function die() {
    playing = false
    CV.chord([392, 311, 233], 90)
    var best = CV.best('pixel-dash', st.score)
    hud.set('best', CV.fmtInt(best))
    over.show({
      title: 'Wiped out',
      score: CV.fmtInt(st.score),
      sub: st.score >= best ? 'New best' : 'Best ' + CV.fmtInt(best),
      body: 'You ran ' + CV.fmtInt(st.dist / 10) + ' m and cleared ' + st.passed + ' obstacles.',
      button: 'Run again',
      onStart: start
    })
  }
  function update(dt) {
    var w = W()
    var i, o

    for (i = 0; i < st.bg.stars.length; i++) {
      var s = st.bg.stars[i]
      s.f -= (st.v * s.p * dt) / w
      if (s.f < 0) s.f += 1
    }
    for (i = 0; i < st.bg.city.length; i++) {
      var b = st.bg.city[i]
      b.f -= (st.v * b.p * dt) / w
      if (b.f < -0.1) b.f += 1.1
    }
    if (!playing) return

    st.v = Math.min(VMAX, V0 + st.dist / 42)
    st.dist += st.v * dt
    st.step += st.v * dt

    var ducking = duckHeld || k.down('ArrowDown', 'KeyS')
    st.vy -= GRAV * dt * (ducking && st.feet > 0 ? 2.6 : 1)
    st.feet += st.vy * dt
    if (st.feet <= 0) { st.feet = 0; st.vy = 0 }

    st.next -= st.v * dt
    if (st.next <= 0) { spawn(w + 30); respace() }

    for (i = st.obs.length - 1; i >= 0; i--) {
      o = st.obs[i]
      o.x -= st.v * dt
      if (!o.done && o.x + o.w < PX) {
        o.done = 1
        st.passed += 1
        CV.beep(880, 0.03, 'triangle', 0.016)
      }
      if (o.x + o.w < -30) st.obs.splice(i, 1)
      else if (hits(o, ducking ? DH : PH)) return die()
    }

    st.score = Math.floor(st.dist / 10) + st.passed * 15
    hud.set('score', CV.fmtInt(st.score))
  }
  /* ---------------------------------------------------------------------- draw */
  function runner(ducking) {
    var ph = ducking ? DH : PH
    var top = GROUND - st.feet - ph
    ctx.fillStyle = 'rgba(0,0,0,.35)'
    ctx.beginPath()
    ctx.ellipse(PX + PW / 2, GROUND - 2, (PW / 2) * (1 - Math.min(0.55, st.feet / 260)), 3.5, 0, 0, 6.284)
    ctx.fill()
    ctx.fillStyle = '#4de3ff'
    if (st.feet > 1) {
      ctx.fillRect(PX + 3, GROUND - st.feet - 1, 8, 6)
      ctx.fillRect(PX + PW - 12, GROUND - st.feet - 5, 8, 6)
    } else {
      var sw = Math.sin(st.step / 13) * 7
      ctx.fillRect(PX + 4 + sw, GROUND - 7, 7, 7)
      ctx.fillRect(PX + PW - 13 - sw, GROUND - 7, 7, 7)
    }
    ctx.fillRect(PX, top, PW, ph)
    ctx.fillStyle = '#1d3df5'
    ctx.fillRect(PX, top + ph - 5, PW, 5)
    ctx.fillStyle = '#08222e'
    ctx.fillRect(PX + PW - 11, top + 5, 7, 5)
  }

  function draw() {
    var uu = u()
    var w = W()
    var hv = view.h / uu
    var oy = (hv - H) / 2   // matte band when the window is taller than the design box
    var ducking = playing && (duckHeld || k.down('ArrowDown', 'KeyS'))
    var i, o, x

    ctx.save()
    ctx.scale(uu, uu)
    if (oy > 0) {
      ctx.fillStyle = '#131a3a'
      ctx.fillRect(0, 0, w, oy + 1)
      ctx.fillStyle = '#1c1436'
      ctx.fillRect(0, oy + H - 1, w, hv - oy - H + 1)
    }
    ctx.translate(0, oy)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, H)

    ctx.fillStyle = 'rgba(255,255,255,.55)'
    for (i = 0; i < st.bg.stars.length; i++) {
      var s = st.bg.stars[i]
      ctx.fillRect(s.f * w, s.y, s.r, s.r)
    }
    for (i = 0; i < st.bg.city.length; i++) {
      var b = st.bg.city[i]
      ctx.fillStyle = 'rgba(90,70,150,.34)'
      ctx.fillRect(b.f * w, GROUND - b.h, b.w, b.h)
      ctx.fillStyle = 'rgba(255,220,140,.16)'
      ctx.fillRect(b.f * w + 6, GROUND - b.h + 9, 5, 5)
      ctx.fillRect(b.f * w + b.w - 12, GROUND - b.h + 22, 5, 5)
    }
    ctx.fillStyle = '#1c1436'
    ctx.fillRect(0, GROUND, w, H - GROUND)
    ctx.fillStyle = 'rgba(77,227,255,.5)'
    for (x = -(st.dist % 46); x < w; x += 46) ctx.fillRect(x, GROUND + 7, 22, 2)
    ctx.fillStyle = '#4de3ff'
    ctx.fillRect(0, GROUND, w, 2)

    for (i = 0; i < st.obs.length; i++) {
      o = st.obs[i]
      if (o.t === 'gap') {
        /* Punching the hole with the sky gradient keeps the bottom of the pit the
           same colour as the horizon, so it reads as depth rather than as a sticker. */
        ctx.fillStyle = sky
        ctx.fillRect(o.x, GROUND, o.w, H - GROUND)
        ctx.fillStyle = '#4de3ff'
        ctx.fillRect(o.x - 2, GROUND, 2, 9)
        ctx.fillRect(o.x + o.w, GROUND, 2, 9)
      } else if (o.t === 'block') {
        ctx.fillStyle = '#31245c'
        ctx.fillRect(o.x, GROUND - o.h, o.w, o.h)
        ctx.fillStyle = '#ff5d8f'
        ctx.fillRect(o.x, GROUND - o.h, o.w, 3)
        ctx.fillRect(o.x, GROUND - o.h, 3, o.h)
      } else {
        ctx.fillStyle = '#2a1b3f'
        ctx.fillRect(o.x, 0, o.w, GROUND - BLADE_LOW)
        ctx.fillStyle = '#ffb703'
        ctx.fillRect(o.x, GROUND - BLADE_LOW - 4, o.w, 4)
        ctx.beginPath()
        for (x = 0; x < o.w - 1; x += 7) {
          ctx.moveTo(o.x + x, GROUND - BLADE_LOW)
          ctx.lineTo(o.x + x + 3.5, GROUND - BLADE_LOW + 7)
          ctx.lineTo(o.x + x + 7, GROUND - BLADE_LOW)
        }
        ctx.fill()
      }
    }

    runner(ducking)
    ctx.restore()
  }
  /* --------------------------------------------------------------------- input */
  k.onDown(['Space', 'ArrowUp', 'KeyW'], jump)

  /* A press in the bottom third ducks for as long as it is held; anywhere else
     jumps. One rule for mouse, touch and pen, which is the whole reason this goes
     through pointer events instead of touchstart. */
  CV.pointer(view.c, {
    down: function (p) { if (p.y > view.h * 0.66) duckHeld = true; else jump() },
    up: function () { duckHeld = false }
  })

  function start() {
    reset()
    playing = true
    hud.set('score', '0')
  }

  hud.set('best', CV.fmtInt(CV.best('pixel-dash')))
  reset()

  /* A hidden tab freezes rather than dying: dt is already clamped in core.js, but a
     runner that keeps running while you are in another tab is just a cheap death. */
  CV.loop(function (dt) {
    if (!document.hidden) update(dt)
    draw()
  })

  over.show({
    title: 'Pixel Dash',
    body: 'Blocks and gaps you jump. Saw blades you duck under. It only gets faster.',
    controls: [['Space', 'jump'], ['↓', 'duck'], ['Tap', 'jump'], ['Hold low', 'duck']],
    button: 'Run',
    onStart: start
  })
})(window.CV)
