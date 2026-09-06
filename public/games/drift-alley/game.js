/* Drift Alley — a top-down drift racer on the shared runtime in ../shared/core.js.
   There is no track data to load: the alley is a pure function of distance,
   `centre(y)`, so it is smooth, endless and identical on every device without
   storing a single segment. The car only ever moves down the world; steering
   changes lateral velocity, and the one thing the drift key changes is how
   quickly that velocity follows your input — hold it and the car keeps sliding
   after you let go of the wheel, which is the whole point. Clip a wall and the
   run is over, so a combo is a bet you can hold the slide through the apex. */

(function (CV) {
  'use strict'

  var H = 440        // design height; the width is whatever the frame gives us
  var WMIN = 440     // never scale so wide that the alley leaves the view
  var CARW = 20
  var CARL = 34
  var GRIP_V = 190   // lateral speed at full lock, tyres gripping
  var DRIFT_V = 345  // ... and while drifting
  var GRIP_K = 9     // how fast lateral velocity follows the target
  var DRIFT_K = 2.5
  var SLIDE = 92     // lateral speed that counts as a real slide

  var view = CV.canvas('#c')
  var ctx = view.ctx
  var hud = CV.hud([
    { key: 'score', label: 'Score' },
    { key: 'combo', label: 'Chain' },
    { key: 'best', label: 'Best' }
  ])
  var over = CV.overlay()
  var k = CV.keys()

  var st = null
  var playing = false
  var touch = { on: false, x: 0 }

  function u() { return Math.min(view.h / H, view.w / WMIN) }
  function vw() { return view.w / u() }
  function vh() { return view.h / u() }

  /* The alley: two sines, one long and one short, so corners arrive in an
     irregular rhythm instead of a metronome. */
  function centre(y) { return vw() / 2 + 70 * Math.sin(y / 265) + 34 * Math.sin(y / 98 + 1.7) }
  function curve(y) { return 0.264 * Math.cos(y / 265) + 0.347 * Math.cos(y / 98 + 1.7) }
  function halfW(y) { return 82 - Math.min(24, y / 3200) }
  function speed(y) { return 200 + Math.min(210, y / 26) }
  function reset() {
    st = {
      y: 0, x: 0, vx: 0, steer: 0, drift: false,
      score: 0, combo: 0, bestCombo: 0, corners: 0, driftTime: 0, cornerDrift: 0,
      sign: 0, marks: [], flash: 0, shake: 0
    }
    st.x = centre(0)
    hud.set('score', '0')
    hud.set('combo', 'x1')
  }

  function steerInput() {
    if (touch.on) {
      /* One finger does both jobs: where you hold decides the lock, holding at
         all engages the drift. Releasing straightens up and grips. */
      var dx = touch.x - st.x
      return CV.clamp(dx / 42, -1, 1)
    }
    return (k.down('ArrowRight', 'KeyD') ? 1 : 0) - (k.down('ArrowLeft', 'KeyA') ? 1 : 0)
  }

  function crash() {
    playing = false
    st.shake = 1
    CV.chord([330, 247, 165], 90)
    var best = CV.best('drift-alley', st.score)
    hud.set('best', CV.fmtInt(best))
    over.show({
      title: st.combo >= 4 ? 'Held it a long way' : 'Into the wall',
      score: CV.fmtInt(st.score),
      sub: st.score >= best && st.score > 0 ? 'New best score' : 'Best ' + CV.fmtInt(best),
      body: CV.fmtInt(st.y / 10) + 'm of alley, ' + st.corners + ' clean ' +
        (st.corners === 1 ? 'apex' : 'apexes') + ', best chain x' + st.bestCombo + '.',
      button: 'Run it again',
      onStart: start
    })
  }

  /* An apex is where the alley stops turning one way and starts turning the
     other. Arrive sideways and the chain grows; arrive straight and it resets. */
  function apex() {
    st.corners += 1
    if (st.cornerDrift > 0.3) {
      st.combo += 1
      if (st.combo > st.bestCombo) st.bestCombo = st.combo
      st.score += 40 * st.combo
      st.flash = 1
      CV.beep(560 + Math.min(st.combo, 10) * 60, 0.08, 'triangle', 0.04)
    } else if (st.combo > 0) {
      st.combo = 0
      CV.beep(220, 0.07, 'square', 0.03)
    }
    st.cornerDrift = 0
    hud.set('combo', 'x' + (st.combo + 1))
  }
  function update(dt) {
    if (st.flash > 0) st.flash = Math.max(0, st.flash - dt * 2.4)
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt * 2.2)
    if (!playing) return

    st.steer = steerInput()
    st.drift = touch.on || k.down('Space', 'ShiftLeft', 'ShiftRight')

    var target = st.steer * (st.drift ? DRIFT_V : GRIP_V)
    var kk = Math.min(1, (st.drift ? DRIFT_K : GRIP_K) * dt)
    st.vx += (target - st.vx) * kk

    st.x += st.vx * dt
    st.y += speed(st.y) * dt

    var sliding = Math.abs(st.vx) > SLIDE
    if (sliding) {
      st.driftTime += dt
      st.cornerDrift += dt
      st.score += dt * Math.abs(st.vx) * 0.055 * (1 + st.combo * 0.2)
      /* Tyre marks are sampled, not per-frame, so the trail length is the same
         whatever the frame rate. */
      var tail = st.marks[st.marks.length - 1]
      if (!tail || st.y - tail.y > 7) {
        st.marks.push({ x: st.x, y: st.y, a: Math.atan2(st.vx, speed(st.y)) })
        if (st.marks.length > 150) st.marks.shift()
      }
    }

    var d = curve(st.y) > 0 ? 1 : -1
    if (st.sign === 0) st.sign = d
    else if (d !== st.sign) { st.sign = d; apex() }

    st.score += dt * speed(st.y) * 0.07
    hud.set('score', CV.fmtInt(st.score))

    if (Math.abs(st.x - centre(st.y)) > halfW(st.y) - CARW / 2) crash()
  }

  /* --------------------------------------------------------------------- draw */
  function edge(from, to, side, step) {
    var y
    ctx.moveTo(centre(from) + side * halfW(from), from)
    for (y = from; y <= to; y += step) ctx.lineTo(centre(y) + side * halfW(y), y)
    ctx.lineTo(centre(to) + side * halfW(to), to)
  }
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

  function draw() {
    var uu = u()
    var W2 = vw()
    var Hv = vh()
    /* The car sits low in the frame and the same number of units is visible in
       front of it whatever the aspect, so a tall phone frame does not turn into
       a telescope. */
    var ahead = Math.min(Hv - 90, Math.max(340, Hv * 0.55))
    var top = st.y + ahead + 30
    var bot = st.y - (Hv - ahead) - 30
    var y, i, s, m

    ctx.save()
    ctx.scale(uu, uu)
    ctx.fillStyle = '#0a0d16'
    ctx.fillRect(0, 0, W2, Hv)

    ctx.save()
    ctx.translate(st.shake > 0 ? CV.rand(-4, 4) * st.shake : 0, ahead + st.y)
    ctx.scale(1, -1)

    /* Blocks either side of the alley. Nothing gameplay depends on them, but on
       a long straight they are the only thing that shows how fast you are going. */
    ctx.fillStyle = 'rgba(255, 255, 255, .028)'
    for (y = Math.floor(bot / 90) * 90; y < top; y += 90) {
      ctx.fillRect(centre(y) - halfW(y) - 64, y, 46, 58)
      ctx.fillRect(centre(y) + halfW(y) + 18, y + 34, 46, 58)
    }

    ctx.beginPath()
    edge(bot, top, -1, 12)
    for (y = top; y >= bot; y -= 12) ctx.lineTo(centre(y) + halfW(y), y)
    ctx.closePath()
    ctx.fillStyle = '#191e2d'
    ctx.fill()

    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(236, 242, 255, .4)'
    for (s = -1; s <= 1; s += 2) {
      ctx.beginPath()
      edge(bot, top, s, 12)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(255, 212, 92, .45)'
    ctx.lineWidth = 3
    ctx.beginPath()
    for (y = Math.floor(bot / 46) * 46; y < top; y += 46) {
      ctx.moveTo(centre(y), y)
      ctx.lineTo(centre(y + 22), y + 22)
    }
    ctx.stroke()

    ctx.strokeStyle = 'rgba(0, 0, 0, .3)'
    ctx.lineWidth = 4
    for (s = -1; s <= 1; s += 2) {
      ctx.beginPath()
      for (i = 0; i < st.marks.length; i++) {
        m = st.marks[i]
        if (i === 0 || m.y - st.marks[i - 1].y > 26) ctx.moveTo(m.x + s * 7, m.y)
        else ctx.lineTo(m.x + s * 7, m.y)
      }
      ctx.stroke()
    }

    ctx.save()
    ctx.translate(st.x, st.y)
    ctx.rotate(-Math.atan2(st.vx, speed(st.y)))
    ctx.scale(1, -1)
    ctx.fillStyle = '#0a0e1a'
    ctx.fillRect(-CARW / 2 - 3, -CARL / 2 + 4, 3, 9)
    ctx.fillRect(CARW / 2, -CARL / 2 + 4, 3, 9)
    ctx.fillRect(-CARW / 2 - 3, CARL / 2 - 13, 3, 9)
    ctx.fillRect(CARW / 2, CARL / 2 - 13, 3, 9)
    ctx.fillStyle = st.drift ? '#4f92ff' : '#2f7dfb'
    rr(-CARW / 2, -CARL / 2, CARW, CARL, 5)
    ctx.fillStyle = 'rgba(214, 234, 255, .82)'
    rr(-CARW / 2 + 3, -CARL / 2 + 8, CARW - 6, 9, 2)
    ctx.fillStyle = 'rgba(255, 244, 200, .9)'
    ctx.fillRect(-CARW / 2 + 2, -CARL / 2, 4, 2.5)
    ctx.fillRect(CARW / 2 - 6, -CARL / 2, 4, 2.5)
    ctx.restore()
    ctx.restore()

    if (st.flash > 0) {
      ctx.globalAlpha = st.flash
      ctx.fillStyle = '#ffe27a'
      ctx.font = '800 17px ui-sans-serif, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('CLEAN APEX  x' + st.combo, st.x, ahead - 42)
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }
  /* -------------------------------------------------------------------- input */
  CV.pointer(view.c, {
    down: function (p) { touch.on = true; touch.x = p.x / u() },
    move: function (p) { if (touch.on) touch.x = p.x / u() },
    up: function () { touch.on = false }
  })

  function start() {
    reset()
    playing = true
  }

  hud.set('best', CV.fmtInt(CV.best('drift-alley')))
  reset()
  CV.loop(function (dt) {
    if (!document.hidden) update(dt)
    draw()
  })

  over.show({
    title: 'Drift Alley',
    body: 'Hold drift to swing the back out, release to grip and straighten. ' +
      'Slide through an apex and your chain grows; arrive straight and it resets. ' +
      'Touch a wall and the run is over.',
    controls: [['←→', 'steer'], ['Space', 'drift'], ['Hold', 'steer + drift']],
    button: 'Drive',
    onStart: start
  })
})(window.CV)
