/* Sky Hopper — a vertical bounce-climber on ../shared/core.js.
   The hopper bounces automatically; the player only steers. Platforms are generated
   above the camera with a guaranteed reachable gap. Blue ones slide, cracked ones
   break after one bounce, and springs launch you three times higher. The screen
   wraps horizontally, and falling below the camera ends the run. */
(function (CV) {
  'use strict'
  var WD = 360, HD = 600, PW = 64, PH = 12
  var G = 1500, JUMP = 760, SPRING = 1250, MAXGAP = 150
  var view = CV.canvas('#c'), ctx = view.ctx
  var hud = CV.hud([{ key: 's', label: 'Height' }, { key: 'best', label: 'Best' }])
  var over = CV.overlay(), k = CV.keys()
  var st, playing = false, touchDir = 0

  function u() { return Math.min(view.h / HD, view.w / WD) }

  function addPlatform(y) {
    var h = st.top
    var diff = Math.min(1, h / 9000)
    var r = Math.random(), type = 'n'
    if (h > 600 && r < 0.12 + diff * 0.18) type = 'm'
    else if (h > 1200 && r < 0.28 + diff * 0.2) type = 'b'
    var p = { x: CV.rand(0, WD - PW), y: y, type: type, vx: type === 'm' ? CV.rand(50, 90 + diff * 80) * (Math.random() < 0.5 ? -1 : 1) : 0, gone: false, spring: type !== 'b' && Math.random() < 0.07 }
    st.plats.push(p)
    // breakable platforms never count as the guaranteed step, so add a safe one nearby
    if (type === 'b') st.plats.push({ x: CV.rand(0, WD - PW), y: y - CV.rand(20, 50), type: 'n', vx: 0, gone: false, spring: false })
  }

  function reset() {
    st = { x: WD / 2 - 14, y: HD - 80, vy: -JUMP, cam: 0, plats: [], top: 0, maxH: 0, face: 1 }
    st.plats.push({ x: WD / 2 - PW / 2, y: HD - 40, type: 'n', vx: 0, gone: false, spring: false })
    var y = HD - 40
    while (y > -HD) { y -= CV.rand(55, 95); st.top = HD - y; addPlatform(y) }
    st.next = y
    hud.set('s', '0')
  }

  function die() {
    playing = false
    CV.chord([440, 330, 220], 90)
    var h = Math.floor(st.maxH / 10), best = CV.best('sky-hopper', h)
    hud.set('best', CV.fmtInt(best))
    over.show({ title: 'Down you go', score: CV.fmtInt(h), sub: h >= best && h > 0 ? 'New best height' : 'Best ' + CV.fmtInt(best),
      body: 'You bounce on your own — just steer. Springs launch you high, cracked platforms break, and the sides wrap around.', button: 'Hop again', onStart: start })
  }

  function update(dt) {
    if (!playing) return
    var dir = (k.down('ArrowRight', 'KeyD') ? 1 : 0) - (k.down('ArrowLeft', 'KeyA') ? 1 : 0) || touchDir
    st.x += dir * 330 * dt
    if (dir) st.face = dir
    if (st.x < -28) st.x = WD; if (st.x > WD) st.x = -28
    var prevY = st.y
    st.vy += G * dt; st.y += st.vy * dt
    var i, p
    for (i = 0; i < st.plats.length; i++) {
      p = st.plats[i]
      if (p.vx) { p.x += p.vx * dt; if (p.x < 0 || p.x > WD - PW) p.vx *= -1 }
      if (st.vy > 0 && !p.gone && prevY + 30 <= p.y && st.y + 30 >= p.y && st.x + 22 > p.x && st.x + 6 < p.x + PW) {
        if (p.type === 'b') { p.gone = true; CV.beep(180, 0.08, 'sawtooth', 0.03); continue }
        st.y = p.y - 30
        if (p.spring) { st.vy = -SPRING; CV.beep(880, 0.1, 'triangle', 0.05) }
        else { st.vy = -JUMP; CV.beep(560, 0.04, 'sine', 0.03) }
      }
    }
    // camera only ever moves up
    var line = st.cam + HD * 0.42
    if (st.y < line) st.cam -= line - st.y
    var h = (HD - 80) - st.y
    if (h > st.maxH) { st.maxH = h; hud.set('s', String(Math.floor(h / 10))) }
    while (st.next > st.cam - 60) { st.next -= CV.rand(55, Math.min(MAXGAP, 90 + st.maxH / 200)); st.top = st.maxH; addPlatform(st.next) }
    st.plats = st.plats.filter(function (q) { return q.y < st.cam + HD + 40 })
    if (st.y > st.cam + HD + 20) die()
  }

  function draw() {
    var uu = u(), ox = (view.w / uu - WD) / 2, oy = (view.h / uu - HD) / 2
    ctx.save(); ctx.scale(uu, uu)
    ctx.fillStyle = '#0c1630'; ctx.fillRect(0, 0, view.w / uu, view.h / uu)
    ctx.translate(ox, oy)
    var t = Math.min(1, -st.cam / 20000)
    var sky = ctx.createLinearGradient(0, 0, 0, HD)
    sky.addColorStop(0, 'hsl(' + (205 + t * 60) + ',70%,' + (62 - t * 40) + '%)')
    sky.addColorStop(1, 'hsl(' + (195 + t * 60) + ',75%,' + (82 - t * 50) + '%)')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, WD, HD)
    ctx.beginPath(); ctx.rect(0, 0, WD, HD); ctx.clip()
    // parallax clouds
    ctx.fillStyle = 'rgba(255,255,255,.35)'
    for (var c = 0; c < 6; c++) {
      var cy = ((c * 170 - st.cam * 0.3) % (HD + 100)) - 50, cx = (c * 97) % WD
      ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 7); ctx.arc(cx + 24, cy + 4, 18, 0, 7); ctx.arc(cx - 22, cy + 6, 15, 0, 7); ctx.fill()
    }
    ctx.translate(0, -st.cam)
    var i, p
    for (i = 0; i < st.plats.length; i++) {
      p = st.plats[i]; if (p.gone) continue
      ctx.fillStyle = p.type === 'm' ? '#3d8bfd' : p.type === 'b' ? '#b08355' : '#3fbf5a'
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p.x, p.y, PW, PH, 6) : ctx.rect(p.x, p.y, PW, PH); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(p.x + 4, p.y + 2, PW - 8, 3)
      if (p.type === 'b') { ctx.strokeStyle = '#6d4a28'; ctx.beginPath(); ctx.moveTo(p.x + 20, p.y); ctx.lineTo(p.x + 28, p.y + PH); ctx.lineTo(p.x + 38, p.y + 2); ctx.stroke() }
      if (p.spring) { ctx.fillStyle = '#cfd6e4'; ctx.fillRect(p.x + PW / 2 - 8, p.y - 10, 16, 10); ctx.fillStyle = '#e53935'; ctx.fillRect(p.x + PW / 2 - 10, p.y - 13, 20, 4) }
    }
    // hopper: a round green blob with eyes and a little snout
    var x = st.x, y = st.y, sq = st.vy < -500 ? 1.1 : st.vy > 300 ? 0.92 : 1
    ctx.save(); ctx.translate(x + 14, y + 16); ctx.scale(1 / sq, sq)
    ctx.fillStyle = '#9be15d'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill()
    ctx.fillStyle = '#7cc243'; ctx.fillRect(-12, 10, 6, 6); ctx.fillRect(6, 10, 6, 6)
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(st.face * 5, -4, 5, 0, 7); ctx.fill()
    ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(st.face * 6.5, -4, 2.2, 0, 7); ctx.fill()
    ctx.fillStyle = '#7cc243'; ctx.fillRect(st.face > 0 ? 10 : -18, 0, 8, 5)
    ctx.restore()
    ctx.restore()
  }

  CV.pointer(view.c, {
    down: function (pt) { touchDir = pt.x < view.w / 2 ? -1 : 1 },
    move: function (pt, e) { if (e.buttons || e.pointerType === 'touch') touchDir = pt.x < view.w / 2 ? -1 : 1 },
    up: function () { touchDir = 0 }
  })
  function start() { reset(); playing = true }
  hud.set('best', CV.fmtInt(CV.best('sky-hopper')))
  reset()
  CV.loop(function (dt) { if (!document.hidden) update(dt); draw() })
  over.show({ title: 'Sky Hopper', body: 'Bounce from platform to platform and climb as high as you can. Blue platforms slide, cracked ones snap, springs send you flying.',
    controls: [['← →', 'steer'], ['Hold left / right side', 'steer on touch']], button: 'Start hopping', onStart: start })
})(window.CV)
