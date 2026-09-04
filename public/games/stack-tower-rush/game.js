/* Stack Tower Rush — a timing game on the shared runtime in ../shared/core.js.
   Play happens inside a fixed 520 x 400 design box that is scaled and centred on the
   canvas, so a resize never moves the tower. The block already placed is the target:
   whatever hangs over its edge is sliced off and dropped, and the next block inherits
   the width that is left. Land within a few units and you get some of it back. */

(function (CV) {
  'use strict'

  var WD = 520       // design width
  var HD = 400       // design height
  var BH = 22        // block height
  var TOPY = 252     // the top of the tower always sits at this line
  var SLIDE = 96     // the live block slides along this line
  var BASEW = 150
  var PERFECT = 4.5  // how close counts as dead centre
  var FALLV = 1150

  var view = CV.canvas('#c')
  var ctx = view.ctx
  var hud = CV.hud([{ key: 'h', label: 'Height' }, { key: 'best', label: 'Best' }])
  var over = CV.overlay()
  var k = CV.keys()

  var sky = ctx.createLinearGradient(0, 0, 0, HD)
  sky.addColorStop(0, '#122043')
  sky.addColorStop(0.58, '#1c2c5e')
  sky.addColorStop(1, '#0d1428')

  var st = null
  var playing = false

  function u() { return Math.min(view.h / HD, view.w / WD) }
  function hue(i) { return (188 + i * 9) % 360 }

  function nextBlock() {
    var top = st.tower[st.tower.length - 1]
    var right = st.tower.length % 2 === 1
    st.live = { x: right ? 0 : WD - top.w, w: top.w, dir: right ? 1 : -1, y: SLIDE, drop: false }
  }

  function reset() {
    st = { tower: [{ x: (WD - BASEW) / 2, w: BASEW }], live: null, shards: [], streak: 0, flash: 0 }
    nextBlock()
    hud.set('h', '0')
  }

  /* Slide speed climbs with height; the cap is set so the block still crosses the
     box in a bit over a second, which is the point where reading it stops being fair. */
  function speed() { return Math.min(430, 118 + st.tower.length * 6) }
  function shard(x, w, dir) {
    st.shards.push({ x: x, y: TOPY, w: w, vx: dir * CV.rand(40, 90), vy: -CV.rand(20, 70), r: 0 })
  }

  /* Called the moment the falling block reaches the tower. Everything about the
     game's difficulty curve is in here: the overlap becomes the next block's width. */
  function land() {
    var top = st.tower[st.tower.length - 1]
    var b = st.live
    var l = Math.max(b.x, top.x)
    var r = Math.min(b.x + b.w, top.x + top.w)

    if (r - l <= 0) {
      shard(b.x, b.w, b.x < top.x ? -1 : 1)
      st.live = null
      return die()
    }

    if (Math.abs(b.x - top.x) <= PERFECT) {
      st.streak += 1
      st.flash = 1
      st.tower.push({ x: top.x, w: Math.min(BASEW, top.w + 6) })
      CV.beep(700 + Math.min(st.streak, 12) * 70, 0.07, 'triangle', 0.04)
    } else {
      if (b.x < l) shard(b.x, l - b.x, -1)
      if (b.x + b.w > r) shard(r, b.x + b.w - r, 1)
      st.streak = 0
      st.tower.push({ x: l, w: r - l })
      CV.beep(320, 0.06, 'square', 0.03)
    }

    hud.set('h', String(st.tower.length - 1))
    nextBlock()
  }

  function drop() {
    if (!playing || !st.live || st.live.drop) return
    st.live.drop = true
  }

  function die() {
    playing = false
    CV.chord([392, 294, 208], 95)
    var h = st.tower.length - 1
    var best = CV.best('stack-tower-rush', h)
    hud.set('best', CV.fmtInt(best))
    over.show({
      title: h >= 12 ? 'That is a tower' : 'Timber',
      score: CV.fmtInt(h),
      sub: h >= best && h > 0 ? 'New best height' : 'Best ' + CV.fmtInt(best),
      body: 'The overhang missed the block below entirely, so there was nothing left to stack on.',
      button: 'Stack again',
      onStart: start
    })
  }
  function update(dt) {
    var i, s
    for (i = st.shards.length - 1; i >= 0; i--) {
      s = st.shards[i]
      s.vy += 900 * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.r += dt * 2.4 * (s.vx > 0 ? 1 : -1)
      if (s.y > HD + 80) st.shards.splice(i, 1)
    }
    if (st.flash > 0) st.flash = Math.max(0, st.flash - dt * 2.6)
    if (!playing || !st.live) return

    var b = st.live
    if (b.drop) {
      b.y += FALLV * dt
      if (b.y >= TOPY) { b.y = TOPY; land() }
      return
    }
    b.x += b.dir * speed() * dt
    if (b.x <= 0) { b.x = 0; b.dir = 1 }
    else if (b.x + b.w >= WD) { b.x = WD - b.w; b.dir = -1 }
  }

  function block(x, y, w, i, live) {
    ctx.fillStyle = 'hsl(' + hue(i) + ', 68%, ' + (live ? 62 : 52) + '%)'
    ctx.fillRect(x, y, w, BH)
    ctx.fillStyle = 'hsla(' + hue(i) + ', 80%, 78%, .85)'
    ctx.fillRect(x, y, w, 3)
    ctx.fillStyle = 'rgba(0, 0, 0, .22)'
    ctx.fillRect(x, y + BH - 4, w, 4)
  }

  function draw() {
    var uu = u()
    var ox = (view.w / uu - WD) / 2
    var oy = (view.h / uu - HD) / 2
    var i, j, b, s

    ctx.save()
    ctx.scale(uu, uu)
    ctx.fillStyle = '#0a0f1f'
    ctx.fillRect(0, 0, view.w / uu, view.h / uu)
    ctx.translate(ox, oy)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, WD, HD)
    /* Faint guides down from the live block's edges. Without them the drop is a
       guess on a narrow block, because the tower top is 130 units away. */
    if (playing && st.live && !st.live.drop) {
      ctx.fillStyle = 'rgba(255, 255, 255, .13)'
      ctx.fillRect(st.live.x, SLIDE + BH, 1, TOPY - SLIDE - BH)
      ctx.fillRect(st.live.x + st.live.w - 1, SLIDE + BH, 1, TOPY - SLIDE - BH)
    }

    for (j = 0; j < st.tower.length; j++) {
      var y = TOPY + j * BH
      if (y > HD) break
      i = st.tower.length - 1 - j
      block(st.tower[i].x, y, st.tower[i].w, i, false)
    }

    for (j = 0; j < st.shards.length; j++) {
      s = st.shards[j]
      ctx.save()
      ctx.translate(s.x + s.w / 2, s.y + BH / 2)
      ctx.rotate(s.r)
      ctx.fillStyle = 'rgba(150, 205, 235, .55)'
      ctx.fillRect(-s.w / 2, -BH / 2, s.w, BH)
      ctx.restore()
    }

    b = st.live
    if (b) block(b.x, b.y, b.w, st.tower.length, true)

    if (st.flash > 0) {
      ctx.globalAlpha = st.flash
      ctx.fillStyle = '#fff'
      ctx.font = '800 15px ui-sans-serif, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('PERFECT' + (st.streak > 1 ? '  x' + st.streak : ''), WD / 2, TOPY - 14)
    }
    ctx.restore()
  }

  /* --------------------------------------------------------------------- input */
  k.onDown(['Space', 'ArrowDown', 'Enter'], drop)
  CV.pointer(view.c, { down: drop })

  function start() {
    reset()
    playing = true
  }

  hud.set('best', CV.fmtInt(CV.best('stack-tower-rush')))
  reset()
  CV.loop(function (dt) {
    if (!document.hidden) update(dt)
    draw()
  })

  over.show({
    title: 'Stack Tower Rush',
    body: 'Drop each block dead centre. Whatever hangs over the edge is sliced off — a perfect landing hands a little width back.',
    controls: [['Space', 'drop'], ['Tap', 'drop']],
    button: 'Stack',
    onStart: start
  })
})(window.CV)
