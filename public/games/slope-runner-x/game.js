/* Slope Runner X — a pseudo-3D endless runner on the shared runtime in
   ../shared/core.js. There is no 3D anything here: each strip of road is a
   trapezoid drawn between two projected distances, and the projection is one
   division — scale = FOV / z. The track is not stored either. Where the road
   bends and where the pylons stand are both pure functions of absolute distance
   travelled, so the course is endless, identical on every device, and costs
   nothing to keep. Steering is two keys; everything else is speed. */

(function (CV) {
  'use strict'

  var W = 640
  var H = 400
  var SEG = 26         // world length of one road strip
  var DRAW = 44        // strips drawn ahead
  var FOV = 240
  var CAMH = 76        // camera height above the road
  var HZ = 166         // horizon line
  var NEAR = 90        // z of the camera's near plane
  var PZ = NEAR + 26   // z the runner is drawn at, just ahead of the camera
  var PR = 9           // runner radius in world units
  var LAT = 205        // top lateral speed
  var BRUSH = 26       // how close a pylon has to pass to pay a bonus

  var view = CV.canvas('#c')
  var ctx = view.ctx
  var hud = CV.hud([
    { key: 'dist', label: 'Distance' },
    { key: 'score', label: 'Score' },
    { key: 'best', label: 'Best' }
  ])
  var over = CV.overlay()
  var k = CV.keys()

  var st = null
  var playing = false
  var touch = { on: false, x: 0 }

  function u() { return Math.min(view.h / H, view.w / W) }
  function offX() { return (view.w / u() - W) / 2 }

  /* The course: two sines of different periods so the bends never settle into a
     rhythm you can drive on memory. */
  function bend(d) { return 74 * Math.sin(d / 620) + 38 * Math.sin(d / 213 + 1.1) }
  function halfW(d) { return 92 - Math.min(26, d / 2600) }
  function speed(d) { return 270 + Math.min(300, d / 21) }

  /* Fract-of-a-big-sine hash. Deterministic, stateless, and good enough to make
     a layout that never repeats within a run. */
  function hash(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453
    return x - Math.floor(x)
  }
  /* Pylons per strip, from a clear run-in to a busy course by a few thousand
     units out. Two in one strip can never seal the road: the gap left over is
     always wider than the runner. */
  function pylons(n) {
    var d = n * SEG
    if (d < 300) return 0
    if (hash(n) >= Math.min(0.44, 0.11 + d / 22000)) return 0
    return hash(n + 91) < Math.min(0.32, d / 26000) ? 2 : 1
  }
  function pylonX(n, j) {
    var t = hash(n * 3 + 17 + j * 53) * 2 - 1
    var d = n * SEG + SEG / 2
    return bend(d) + t * (halfW(d) - 17)
  }

  function reset() {
    st = {
      d: 0, px: bend(0), vx: 0, score: 0, brushes: 0,
      shake: 0, flash: 0, sparks: []
    }
    hud.set('dist', '0m')
    hud.set('score', '0')
  }

  function steer() {
    if (touch.on) {
      /* Hold anywhere: how far from the middle you hold is how hard it turns,
         so a thumb near the centre still gives you fine adjustments. */
      return CV.clamp((touch.x - W / 2) / 95, -1, 1)
    }
    return (k.down('ArrowRight', 'KeyD') ? 1 : 0) - (k.down('ArrowLeft', 'KeyA') ? 1 : 0)
  }

  function crash(why) {
    var best
    if (!playing) return
    playing = false
    st.shake = 1
    CV.chord([330, 233, 165], 95)
    best = CV.best('slope-runner-x', st.score)
    hud.set('best', CV.fmtInt(best))
    over.show({
      title: st.d > 4000 ? 'Deep run' : 'Wiped out',
      score: CV.fmtInt(st.score),
      sub: st.score >= best && st.score > 0 ? 'New best score' : 'Best ' + CV.fmtInt(best),
      body: why + ' ' + CV.fmtInt(st.d / 10) + 'm covered with ' + st.brushes +
        ' close ' + (st.brushes === 1 ? 'pass' : 'passes') + '.',
      button: 'Run again',
      onStart: start
    })
  }

  function spark(x, y, dir) {
    var i
    for (i = 0; i < 6; i++) {
      st.sparks.push({
        x: x, y: y, life: 1,
        vx: dir * CV.rand(40, 190), vy: CV.rand(-150, 40)
      })
    }
  }

  function update(dt) {
    var i, p, prev, v, n, n0, n1, j, cnt, pd, x, dx
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt * 2)
    if (st.flash > 0) st.flash = Math.max(0, st.flash - dt * 3)
    for (i = st.sparks.length - 1; i >= 0; i--) {
      p = st.sparks[i]
      p.life -= dt * 1.9
      p.vy += 420 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.life <= 0) st.sparks.splice(i, 1)
    }
    if (!playing) return

    v = speed(st.d)
    prev = st.d
    st.d += v * dt
    st.vx += (steer() * LAT - st.vx) * Math.min(1, 10 * dt)
    st.px += st.vx * dt
    /* The bend throws you to the outside of the corner. Without it you could
       hold any line by never touching the keys. */
    st.px -= (bend(st.d + 9) - bend(st.d - 9)) / 18 * v * dt * 0.42

    if (Math.abs(st.px - bend(st.d)) > halfW(st.d) - PR) {
      crash('You went over the edge.')
      return
    }

    /* Sweep every strip the runner's plane crossed this frame, so nothing is
       missed at three hundred units a second. */
    n0 = Math.floor((prev - 14) / SEG)
    n1 = Math.floor((st.d + 14) / SEG)
    for (n = n0; n <= n1; n++) {
      cnt = pylons(n)
      pd = n * SEG + SEG / 2
      if (pd < prev - 10 || pd > st.d + 10) continue
      for (j = 0; j < cnt; j++) {
        x = pylonX(n, j)
        dx = Math.abs(st.px - x)
        if (dx < PR + 5.5) {
          crash('You clipped a pylon.')
          return
        }
        if (dx < BRUSH) {
          st.brushes += 1
          st.score += 25
          st.flash = 1
          spark(W / 2 + (st.px < x ? 26 : -26), 322, st.px < x ? 1 : -1)
          CV.beep(760, 0.045, 'sine', 0.028)
        }
      }
    }

    st.score += v * dt * 0.12
    hud.set('dist', CV.fmtInt(st.d / 10) + 'm')
    hud.set('score', CV.fmtInt(st.score))
  }

  /* --------------------------------------------------------------------- draw */
  var sky = ctx.createLinearGradient(0, 0, 0, HZ + 30)
  sky.addColorStop(0, '#07091a')
  sky.addColorStop(0.62, '#1a1140')
  sky.addColorStop(1, '#57205f')

  function backdrop() {
    var i, x, y
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, HZ + 30)
    /* Star field from the same hash as the course, so it is fixed rather than
       flickering, and costs no storage. */
    ctx.fillStyle = 'rgba(255, 255, 255, .5)'
    for (i = 0; i < 46; i++) {
      x = hash(i * 5 + 1) * W
      y = hash(i * 5 + 2) * (HZ - 26)
      ctx.fillRect(x, y, 1.4, 1.4)
    }
    /* The glow sits where the road will be a long way ahead, which gives the
       corner a direction before you can see the road bend into it. */
    x = W / 2 + (bend(st.d + 900) - st.px) * FOV / (NEAR + 900)
    ctx.fillStyle = 'rgba(255, 96, 158, .16)'
    ctx.beginPath()
    ctx.arc(x, HZ, 64, 0, 6.2832)
    ctx.fill()
    ctx.fillStyle = 'rgba(255, 176, 214, .3)'
    ctx.beginPath()
    ctx.arc(x, HZ, 22, 0, 6.2832)
    ctx.fill()
    ctx.fillStyle = 'rgba(45, 225, 255, .16)'
    ctx.fillRect(0, HZ - 1, W, 2)
  }

  function course() {
    var n0 = Math.floor(st.d / SEG)
    var i, j, n, d1, d2, z1, z2, y1, y2, x1, x2, w1, w2, e1, e2, c1, c2
    var cnt, pz, s, bx, by, pw, ph
    for (i = DRAW; i >= 0; i--) {
      n = n0 + i
      d1 = n * SEG
      d2 = d1 + SEG
      z1 = Math.max(2, NEAR + d1 - st.d)
      z2 = NEAR + d2 - st.d
      y1 = HZ + CAMH * FOV / z1
      y2 = HZ + CAMH * FOV / z2
      x1 = W / 2 + (bend(d1) - st.px) * FOV / z1
      x2 = W / 2 + (bend(d2) - st.px) * FOV / z2
      w1 = halfW(d1) * FOV / z1
      w2 = halfW(d2) * FOV / z2
      e1 = 5 * FOV / z1
      e2 = 5 * FOV / z2

      ctx.fillStyle = n % 2 === 0 ? '#151b31' : '#101627'
      ctx.beginPath()
      ctx.moveTo(x1 - w1, y1)
      ctx.lineTo(x1 + w1, y1)
      ctx.lineTo(x2 + w2, y2)
      ctx.lineTo(x2 - w2, y2)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = n % 2 === 0 ? '#39e5ff' : '#12435a'
      for (j = -1; j <= 1; j += 2) {
        ctx.beginPath()
        ctx.moveTo(x1 + j * (w1 + e1), y1)
        ctx.lineTo(x1 + j * w1, y1)
        ctx.lineTo(x2 + j * w2, y2)
        ctx.lineTo(x2 + j * (w2 + e2), y2)
        ctx.closePath()
        ctx.fill()
      }
      if (n % 2 === 0) {
        c1 = 2.2 * FOV / z1
        c2 = 2.2 * FOV / z2
        ctx.fillStyle = 'rgba(255, 255, 255, .07)'
        ctx.beginPath()
        ctx.moveTo(x1 - c1, y1)
        ctx.lineTo(x1 + c1, y1)
        ctx.lineTo(x2 + c2, y2)
        ctx.lineTo(x2 - c2, y2)
        ctx.closePath()
        ctx.fill()
      }

      /* Pylons are drawn inside the strip loop, so a nearer strip painting over
         a farther one hides the pylons behind it for free. */
      cnt = pylons(n)
      pz = NEAR + d1 + SEG / 2 - st.d
      if (pz < 8) continue
      s = FOV / pz
      by = HZ + CAMH * s
      pw = 11 * s
      ph = 44 * s
      for (j = 0; j < cnt; j++) {
        bx = W / 2 + (pylonX(n, j) - st.px) * s
        ctx.fillStyle = 'rgba(255, 61, 120, .2)'
        ctx.fillRect(bx - pw * 0.95, by - ph * 1.06, pw * 1.9, ph * 1.06)
        ctx.fillStyle = '#ff3d78'
        ctx.fillRect(bx - pw / 2, by - ph, pw, ph)
        ctx.fillStyle = '#ffd3e3'
        ctx.fillRect(bx - pw / 2, by - ph, pw, Math.max(1.4, ph * 0.15))
      }
    }
  }

  function runner() {
    var s = FOV / PZ
    var r = PR * s
    var gx = W / 2 + st.vx * 0.06
    var gy = HZ + CAMH * s
    ctx.save()
    ctx.translate(gx, gy)
    ctx.scale(1, 0.38)
    ctx.fillStyle = 'rgba(0, 0, 0, .45)'
    ctx.beginPath()
    ctx.arc(0, 0, r * 1.15, 0, 6.2832)
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = 'rgba(94, 238, 255, .2)'
    ctx.beginPath()
    ctx.arc(gx, gy - r, r * 1.7, 0, 6.2832)
    ctx.fill()
    ctx.fillStyle = '#eafcff'
    ctx.beginPath()
    ctx.arc(gx, gy - r, r, 0, 6.2832)
    ctx.fill()
    ctx.fillStyle = '#38d7ff'
    ctx.beginPath()
    ctx.arc(gx, gy - r + r * 0.18, r * 0.66, 0, 6.2832)
    ctx.fill()
  }

  function draw() {
    var uu = u()
    var vw = view.w / uu
    var vh = view.h / uu
    var i, p

    ctx.save()
    ctx.scale(uu, uu)
    ctx.fillStyle = '#05060f'
    ctx.fillRect(0, 0, vw, vh)
    ctx.translate((vw - W) / 2, (vh - H) / 2)
    ctx.save()
    if (st.shake > 0) {
      ctx.translate(CV.rand(-5, 5) * st.shake, CV.rand(-4, 4) * st.shake)
    }
    ctx.fillStyle = '#05060f'
    ctx.fillRect(0, 0, W, H)
    backdrop()
    course()
    runner()
    for (i = 0; i < st.sparks.length; i++) {
      p = st.sparks[i]
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillStyle = '#ffe27a'
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3)
    }
    ctx.globalAlpha = 1
    if (st.flash > 0) {
      ctx.fillStyle = 'rgba(125, 242, 192, ' + (st.flash * 0.1).toFixed(3) + ')'
      ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
    ctx.restore()
  }

  /* -------------------------------------------------------------------- input */
  CV.pointer(view.c, {
    down: function (p) { touch.on = true; touch.x = p.x / u() - offX() },
    move: function (p) { if (touch.on) touch.x = p.x / u() - offX() },
    up: function () { touch.on = false }
  })

  function start() {
    reset()
    playing = true
  }

  hud.set('best', CV.fmtInt(CV.best('slope-runner-x')))
  reset()
  CV.loop(function (dt) {
    if (!document.hidden) update(dt)
    draw()
  })

  over.show({
    title: 'Slope Runner X',
    body: 'Hold a line down an endless neon slope. It only gets faster, the road ' +
      'only gets narrower, and the corners push you towards the drop. Shaving past ' +
      'a pylon pays a bonus — touching one ends the run.',
    controls: [['←→', 'steer'], ['A D', 'steer'], ['Hold', 'steer']],
    button: 'Drop in',
    onStart: start
  })
})(window.CV)
