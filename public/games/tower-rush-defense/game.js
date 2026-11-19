/* Tower Rush Defense — a compact tower-defence game on ../shared/core.js.
   Enemies walk a fixed path; the player taps one of the build pads beside it to
   place an Arrow tower (fast, single target) or, once placed, taps again to
   upgrade. Every fifth wave adds armoured brutes, every tenth a boss. Leaks cost
   lives; gold comes from kills and an interest bonus for finishing waves fast. */
(function (CV) {
  'use strict'
  var WD = 640, HD = 420
  var PATH = [[-20, 80], [180, 80], [180, 220], [420, 220], [420, 90], [560, 90], [560, 330], [260, 330], [260, 400], [-20, 400]]
  var PADS = [[110, 140], [250, 150], [330, 160], [480, 150], [340, 280], [490, 260], [180, 290], [620, 210], [100, 340], [400, 380], [250, 40], [480, 40]]
  var COST = 60, UPG = [0, 70, 120, 200]
  var view = CV.canvas('#c'), ctx = view.ctx
  var hud = CV.hud([{ key: 'wave', label: 'Wave' }, { key: 'gold', label: 'Gold' }, { key: 'lives', label: 'Lives' }, { key: 'best', label: 'Best' }])
  var over = CV.overlay(), k = CV.keys()
  var st, playing = false
  var segs = [], total = 0
  ;(function () { for (var i = 0; i < PATH.length - 1; i++) { var l = CV.dist(PATH[i][0], PATH[i][1], PATH[i + 1][0], PATH[i + 1][1]); segs.push(l); total += l } })()

  function u() { return Math.min(view.h / HD, view.w / WD) }
  function posAt(d) {
    for (var i = 0; i < segs.length; i++) {
      if (d <= segs[i]) { var t = d / segs[i]; return [CV.lerp(PATH[i][0], PATH[i + 1][0], t), CV.lerp(PATH[i][1], PATH[i + 1][1], t)] }
      d -= segs[i]
    }
    return PATH[PATH.length - 1]
  }

  function reset() {
    st = { gold: 150, lives: 20, wave: 0, towers: {}, enemies: [], shots: [], spawn: [], gap: 0, between: 2.5, sel: -1, pops: [] }
    sync()
  }
  function sync() { hud.set('wave', String(st.wave)); hud.set('gold', String(Math.floor(st.gold))); hud.set('lives', String(st.lives)) }

  function startWave() {
    st.wave += 1
    var n = 6 + st.wave * 2, hp = 30 * Math.pow(1.18, st.wave)
    for (var i = 0; i < n; i++) {
      var brute = st.wave >= 5 && i % 4 === 3
      st.spawn.push({ hp: hp * (brute ? 3 : 1), speed: brute ? 38 : 55 + Math.min(40, st.wave * 2), r: brute ? 11 : 8, gold: brute ? 9 : 4, col: brute ? '#8e44ad' : '#e67e22' })
    }
    if (st.wave % 10 === 0) st.spawn.push({ hp: hp * 25, speed: 30, r: 16, gold: 80, col: '#c0392b', boss: true })
    st.gap = 0; sync()
    CV.toast('Wave ' + st.wave + (st.wave % 10 === 0 ? ' — boss incoming!' : ''))
  }

  function towerStats(t) { return { range: 95 + t.lvl * 15, rate: 0.8 - t.lvl * 0.12, dmg: 12 * Math.pow(1.9, t.lvl) } }

  function tapPad(i) {
    if (!playing) return
    var t = st.towers[i]
    if (!t) {
      if (st.gold < COST) return CV.toast('Need ' + COST + ' gold')
      st.gold -= COST; st.towers[i] = { lvl: 0, cd: 0, ang: 0 }; CV.beep(660, 0.06, 'triangle', 0.04)
    } else if (t.lvl < 3) {
      var c = UPG[t.lvl + 1]
      if (st.gold < c) return CV.toast('Upgrade costs ' + c + ' gold')
      st.gold -= c; t.lvl += 1; CV.beep(880, 0.08, 'triangle', 0.04)
    } else CV.toast('Max level')
    sync()
  }

  function lose() {
    playing = false
    CV.chord([330, 247, 165], 100)
    var w = st.wave - 1, best = CV.best('tower-rush-defense', w)
    hud.set('best', CV.fmtInt(best))
    over.show({ title: 'The gate has fallen', score: 'Wave ' + w, sub: w >= best && w > 0 ? 'New best' : 'Best wave ' + CV.fmtInt(best),
      body: 'Build towers on the pads beside the road and tap them again to upgrade. Brutes arrive from wave 5, a boss every 10 waves.', button: 'Defend again', onStart: start })
  }

  function update(dt) {
    if (!playing) return
    var i, e, t
    if (!st.spawn.length && !st.enemies.length) {
      st.between -= dt
      if (st.between <= 0) { if (st.wave > 0) { st.gold += 20 + st.wave * 3; CV.toast('Wave cleared +' + (20 + st.wave * 3) + ' gold') } startWave(); st.between = 4 }
    }
    if (st.spawn.length) { st.gap -= dt; if (st.gap <= 0) { var s = st.spawn.shift(); s.d = 0; s.max = s.hp; st.enemies.push(s); st.gap = 0.75 } }
    for (i = st.enemies.length - 1; i >= 0; i--) {
      e = st.enemies[i]; e.d += e.speed * dt
      if (e.d >= total) { st.enemies.splice(i, 1); st.lives -= e.boss ? 5 : 1; CV.beep(120, 0.1, 'square', 0.04); sync(); if (st.lives <= 0) return lose() }
    }
    for (var key in st.towers) {
      t = st.towers[key]; var p = PADS[key], S = towerStats(t)
      t.cd -= dt
      var target = null, far = -1
      for (i = 0; i < st.enemies.length; i++) {
        e = st.enemies[i]; var ep = posAt(e.d)
        if (CV.dist(p[0], p[1], ep[0], ep[1]) <= S.range && e.d > far) { far = e.d; target = e }
      }
      if (target) {
        var tp = posAt(target.d); t.ang = Math.atan2(tp[1] - p[1], tp[0] - p[0])
        if (t.cd <= 0) { t.cd = S.rate; st.shots.push({ x: p[0], y: p[1], tgt: target, dmg: S.dmg, lvl: t.lvl }) }
      }
    }
    for (i = st.shots.length - 1; i >= 0; i--) {
      var sh = st.shots[i]
      if (st.enemies.indexOf(sh.tgt) < 0) { st.shots.splice(i, 1); continue }
      var q = posAt(sh.tgt.d), dx = q[0] - sh.x, dy = q[1] - sh.y, d = Math.hypot(dx, dy)
      if (d < 8) {
        sh.tgt.hp -= sh.dmg; st.shots.splice(i, 1)
        if (sh.tgt.hp <= 0) { st.gold += sh.tgt.gold; st.pops.push({ x: q[0], y: q[1], t: 0, txt: '+' + sh.tgt.gold }); st.enemies.splice(st.enemies.indexOf(sh.tgt), 1); sync() }
      } else { sh.x += dx / d * 520 * dt; sh.y += dy / d * 520 * dt }
    }
    for (i = st.pops.length - 1; i >= 0; i--) { st.pops[i].t += dt; if (st.pops[i].t > 0.8) st.pops.splice(i, 1) }
  }

  function draw() {
    var uu = u(), ox = (view.w / uu - WD) / 2, oy = (view.h / uu - HD) / 2, i, p
    ctx.save(); ctx.scale(uu, uu)
    ctx.fillStyle = '#1b2614'; ctx.fillRect(0, 0, view.w / uu, view.h / uu)
    ctx.translate(ox, oy)
    ctx.fillStyle = '#5c9e3f'; ctx.fillRect(0, 0, WD, HD)
    ctx.fillStyle = 'rgba(255,255,255,.05)'; for (i = 0; i < 60; i++) ctx.fillRect((i * 137) % WD, (i * 89) % HD, 3, 3)
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    ctx.strokeStyle = '#a07c4f'; ctx.lineWidth = 36; ctx.beginPath(); ctx.moveTo(PATH[0][0], PATH[0][1])
    for (i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i][0], PATH[i][1]); ctx.stroke()
    ctx.strokeStyle = '#c29b66'; ctx.lineWidth = 26; ctx.stroke()
    // castle gate at the end
    ctx.fillStyle = '#7f8c8d'; ctx.fillRect(4, 372, 30, 46); ctx.fillStyle = '#5d6d6e'; ctx.fillRect(12, 392, 14, 26)
    for (i = 0; i < PADS.length; i++) {
      p = PADS[i]; var t = st.towers[i]
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(p[0], p[1] + 3, 17, 0, 7); ctx.fill()
      ctx.fillStyle = t ? '#95a5a6' : 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(p[0], p[1], 16, 0, 7); ctx.fill()
      if (!t) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '800 16px ui-sans-serif'; ctx.textAlign = 'center'; ctx.fillText('+', p[0], p[1] + 6); continue }
      ctx.fillStyle = ['#2980b9', '#16a085', '#d35400', '#8e44ad'][t.lvl]; ctx.beginPath(); ctx.arc(p[0], p[1], 10, 0, 7); ctx.fill()
      ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + Math.cos(t.ang) * 16, p[1] + Math.sin(t.ang) * 16); ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.font = '700 9px ui-sans-serif'; ctx.textAlign = 'center'
      for (var s2 = 0; s2 < t.lvl; s2++) ctx.fillRect(p[0] - 8 + s2 * 6, p[1] + 19, 4, 4)
    }
    st.enemies.forEach(function (e) {
      var q = posAt(e.d)
      ctx.fillStyle = e.col; ctx.beginPath(); ctx.arc(q[0], q[1], e.r, 0, 7); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.fillRect(q[0] - 3, q[1] - 3, 2, 2); ctx.fillRect(q[0] + 2, q[1] - 3, 2, 2)
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(q[0] - e.r, q[1] - e.r - 7, e.r * 2, 3)
      ctx.fillStyle = '#2ecc71'; ctx.fillRect(q[0] - e.r, q[1] - e.r - 7, e.r * 2 * Math.max(0, e.hp / e.max), 3)
    })
    st.shots.forEach(function (s) { ctx.fillStyle = s.lvl >= 2 ? '#ffeb3b' : '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, 7); ctx.fill() })
    ctx.font = '800 12px ui-sans-serif'; ctx.textAlign = 'center'
    st.pops.forEach(function (pp) { ctx.fillStyle = 'rgba(255,215,0,' + (1 - pp.t) + ')'; ctx.fillText(pp.txt, pp.x, pp.y - pp.t * 30) })
    if (playing && st.between > 0 && !st.enemies.length && !st.spawn.length) {
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(WD / 2 - 110, 12, 220, 26)
      ctx.fillStyle = '#fff'; ctx.fillText('Next wave in ' + Math.ceil(st.between) + 's — build towers!', WD / 2, 30)
    }
    ctx.restore()
  }

  CV.pointer(view.c, { down: function (pt) {
    var uu = u(), x = pt.x / uu - (view.w / uu - WD) / 2, y = pt.y / uu - (view.h / uu - HD) / 2
    for (var i = 0; i < PADS.length; i++) if (CV.dist(x, y, PADS[i][0], PADS[i][1]) < 22) return tapPad(i)
  } })
  k.onDown(['KeyN'], function () { if (playing && st.between > 0.5 && !st.enemies.length && !st.spawn.length) st.between = 0.01 })

  function start() { reset(); playing = true }
  hud.set('best', CV.fmtInt(CV.best('tower-rush-defense')))
  reset()
  CV.loop(function (dt) { if (!document.hidden) update(dt); draw() })
  over.show({ title: 'Tower Rush Defense', body: 'Monsters march down the road towards your gate. Tap the + pads to build towers (60 gold), tap a tower again to upgrade it. Survive as many waves as you can.',
    controls: [['Tap a pad', 'build / upgrade'], ['N', 'skip the wait']], button: 'Defend the gate', onStart: start })
})(window.CV)
