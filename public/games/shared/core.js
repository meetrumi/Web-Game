/* ClickVault shared game runtime.
   Loaded by every bundled game before its own game.js. Exposes one global, `CV`.
   No dependencies, no build step, ES5-compatible syntax so it runs anywhere the
   site does. Each game keeps its own save slot under localStorage cv:game:<id>. */

window.CV = (function () {
  'use strict'

  /* ------------------------------------------------------------------ storage */
  var NS = 'cv:game:'

  function save(id, data) {
    try { localStorage.setItem(NS + id, JSON.stringify(data)) } catch (e) { /* private mode */ }
  }

  function load(id, fallback) {
    try {
      var raw = localStorage.getItem(NS + id)
      return raw === null ? fallback : JSON.parse(raw)
    } catch (e) { return fallback }
  }

  function wipe(id) {
    try { localStorage.removeItem(NS + id) } catch (e) { /* ignore */ }
  }

  /** Reads the stored best, and writes `score` first if it beats it. */
  function best(id, score) {
    var key = id + ':best'
    var current = Number(load(key, 0)) || 0
    if (typeof score === 'number' && score > current) { save(key, score); return score }
    return current
  }

  /* ------------------------------------------------------------------ numbers */
  var UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']

  /** Idle-game friendly short form: 1.23K, 4.5M, 8.1Qa, then exponential. */
  function fmt(n) {
    if (!isFinite(n)) return '∞'
    if (n < 0) return '-' + fmt(-n)
    if (n < 1000) return n < 100 && n % 1 !== 0 ? n.toFixed(1) : String(Math.floor(n))
    var tier = Math.floor(Math.log(n) / Math.log(1000))
    if (tier >= UNITS.length) return n.toExponential(2).replace('e+', 'e')
    var s = n / Math.pow(1000, tier)
    return (s < 10 ? s.toFixed(2) : s < 100 ? s.toFixed(1) : String(Math.floor(s))) + UNITS[tier]
  }

  function fmtInt(n) { return Math.floor(n).toLocaleString('en-US') }

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec))
    var h = Math.floor(sec / 3600)
    var m = Math.floor((sec % 3600) / 60)
    var s = sec % 60
    if (h) return h + 'h ' + m + 'm'
    return m + ':' + (s < 10 ? '0' + s : s)
  }

  /* ------------------------------------------------------------------- maths */
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }
  function lerp(a, b, t) { return a + (b - a) * t }
  function rand(a, b) { return a + Math.random() * (b - a) }
  function randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)) }
  function pick(list) { return list[Math.floor(Math.random() * list.length)] }
  function chance(p) { return Math.random() < p }
  function dist(x1, y1, x2, y2) { return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)) }

  /* ------------------------------------------------------------------ canvas */
  /** DPR-aware canvas that keeps `view.w` / `view.h` in CSS pixels. */
  function canvas(sel) {
    var c = typeof sel === 'string' ? document.querySelector(sel) : sel
    var ctx = c.getContext('2d')
    var view = { c: c, ctx: ctx, w: 1, h: 1, dpr: 1, onResize: null }

    view.resize = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2)
      var rect = c.getBoundingClientRect()
      view.w = Math.max(1, Math.round(rect.width))
      view.h = Math.max(1, Math.round(rect.height))
      view.dpr = dpr
      c.width = Math.round(view.w * dpr)
      c.height = Math.round(view.h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (view.onResize) view.onResize(view)
    }

    view.resize()
    window.addEventListener('resize', view.resize)
    return view
  }

  /* -------------------------------------------------------------------- loop */
  /** rAF loop. dt is capped at 50ms so a backgrounded tab cannot tunnel physics. */
  function loop(update) {
    var raf = 0
    var last = 0
    var running = false

    function frame(t) {
      if (!running) return
      var dt = last ? Math.min((t - last) / 1000, 0.05) : 1 / 60
      last = t
      update(dt, t / 1000)
      raf = window.requestAnimationFrame(frame)
    }

    var api = {
      start: function () {
        if (running) return api
        running = true
        last = 0
        raf = window.requestAnimationFrame(frame)
        return api
      },
      stop: function () {
        running = false
        window.cancelAnimationFrame(raf)
        return api
      },
      isRunning: function () { return running }
    }

    document.addEventListener('visibilitychange', function () { if (document.hidden) last = 0 })
    return api.start()
  }

  /* ------------------------------------------------------------------- input */
  /** Unified mouse/touch/pen, with coordinates already in target space. */
  function pointer(target, handlers) {
    function at(e) {
      var r = target.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top, id: e.pointerId }
    }
    target.addEventListener('pointerdown', function (e) {
      e.preventDefault()
      if (e.pointerId != null && target.setPointerCapture) {
        try { target.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
      }
      if (handlers.down) handlers.down(at(e), e)
    })

    target.addEventListener('pointermove', function (e) {
      if (handlers.move) handlers.move(at(e), e)
    })
    target.addEventListener('pointerup', function (e) {
      if (handlers.up) handlers.up(at(e), e)
    })
    target.addEventListener('pointercancel', function (e) {
      if (handlers.up) handlers.up(at(e), e)
    })
  }

  var HELD = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

  /** Keyboard state. `k.down('KeyA','ArrowLeft')` is true if any are held. */
  function keys() {
    var held = {}
    var taps = []

    window.addEventListener('keydown', function (e) {
      if (HELD.indexOf(e.code) >= 0) e.preventDefault()
      if (held[e.code]) return
      held[e.code] = true
      for (var i = 0; i < taps.length; i++) {
        if (taps[i].codes.indexOf(e.code) >= 0) taps[i].cb(e)
      }
    })
    window.addEventListener('keyup', function (e) { held[e.code] = false })
    window.addEventListener('blur', function () { held = {} })

    return {
      down: function () {
        for (var i = 0; i < arguments.length; i++) if (held[arguments[i]]) return true
        return false
      },
      onDown: function (codes, cb) {
        taps.push({ codes: [].concat(codes), cb: cb })
      }
    }
  }

  /** Four-way swipe for the games that need a discrete direction on touch. */
  function swipe(target, cb) {
    var sx = 0, sy = 0, on = false
    target.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; on = true })
    target.addEventListener('pointerup', function (e) {
      if (!on) return
      on = false
      var dx = e.clientX - sx, dy = e.clientY - sy
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return cb('tap')
      cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'))
    })
  }

  /* ------------------------------------------------------------------- audio */
  /* Synthesised blips only -- no audio files to ship, and nothing is created
     until the first real user gesture, so autoplay policies stay happy. */
  var actx = null
  var muted = load('audio:muted', false) === true

  function ac() {
    if (muted) return null
    if (!actx) {
      var Ctor = window.AudioContext || window.webkitAudioContext
      if (!Ctor) return null
      actx = new Ctor()
    }
    if (actx.state === 'suspended' && actx.resume) actx.resume()
    return actx
  }

  function beep(freq, dur, type, gain) {
    var a = ac()
    if (!a) return
    dur = dur || 0.09
    var osc = a.createOscillator()
    var amp = a.createGain()
    osc.type = type || 'square'
    osc.frequency.value = freq
    osc.connect(amp)
    amp.connect(a.destination)
    var t = a.currentTime
    amp.gain.setValueAtTime(0.0001, t)
    amp.gain.linearRampToValueAtTime(gain == null ? 0.05 : gain, t + 0.008)
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  /** Rising or falling arpeggio -- used for scoring and game-over stings. */
  function chord(freqs, step, type) {
    freqs.forEach(function (f, i) {
      setTimeout(function () { beep(f, 0.12, type || 'triangle', 0.045) }, i * (step || 70))
    })
  }

  function muteToggle(parent) {
    var b = document.createElement('button')
    b.type = 'button'
    b.className = 'cv-btn cv-btn-ghost'
    b.setAttribute('aria-label', 'Toggle sound')
    function paint() { b.textContent = muted ? 'Sound off' : 'Sound on' }
    b.addEventListener('click', function () {
      muted = !muted
      save('audio:muted', muted)
      paint()
      if (!muted) beep(880, 0.08, 'triangle')
    })
    paint()
    ;(parent || document.body).appendChild(b)
    return b
  }

  /* ---------------------------------------------------------------------- UI */
  function el(tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text != null) n.textContent = text
    return n
  }

  /** Top status bar. `hud([{key:'score',label:'Score'}])` -> `.set('score', 12)`. */
  function hud(stats) {
    var bar = el('div', 'cv-hud')
    var refs = {}
    ;(stats || []).forEach(function (s) {
      var wrap = el('div', 'cv-stat')
      wrap.appendChild(el('span', 'cv-label', s.label))
      var v = el('span', 'cv-value', s.value == null ? '0' : s.value)
      wrap.appendChild(v)
      refs[s.key] = v
      bar.appendChild(wrap)
    })
    var right = el('div', 'cv-right')
    bar.appendChild(right)
    document.body.appendChild(bar)
    muteToggle(right)
    return {
      el: bar,
      right: right,
      set: function (key, value) { if (refs[key]) refs[key].textContent = value }
    }
  }

  /** Start / game-over card. Only one exists per game; `show()` re-fills it. */
  function overlay() {
    var wrap = el('div', 'cv-overlay')
    var panel = el('div', 'cv-panel')
    wrap.hidden = true
    wrap.appendChild(panel)
    document.body.appendChild(wrap)

    function hide() { wrap.hidden = true }

    function show(o) {
      panel.textContent = ''
      if (o.title) panel.appendChild(el('h1', null, o.title))
      if (o.score != null) {
        panel.appendChild(el('div', 'cv-score', o.score))
        panel.appendChild(el('div', 'cv-sub', o.sub || 'Score'))
      }
      if (o.body) panel.appendChild(el('p', null, o.body))

      if (o.controls && o.controls.length) {
        var list = el('div', 'cv-keys')
        o.controls.forEach(function (pair) {
          var span = el('span')
          span.appendChild(el('kbd', null, pair[0]))
          span.appendChild(document.createTextNode(' ' + pair[1]))
          list.appendChild(span)
        })
        panel.appendChild(list)
      }
      var btn = el('button', 'cv-btn', o.button || 'Play')
      btn.type = 'button'
      btn.addEventListener('click', function () {
        hide()
        if (o.onStart) o.onStart()
      })
      panel.appendChild(btn)
      wrap.hidden = false
      btn.focus()
    }

    return { show: show, hide: hide, el: wrap }
  }

  var toastEl = null
  var toastTimer = 0

  function toast(msg, ms) {
    if (!toastEl) {
      toastEl = el('div', 'cv-toast')
      document.body.appendChild(toastEl)
    }
    toastEl.textContent = msg
    toastEl.classList.add('is-on')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on') }, ms || 1600)
  }

  /** Enter/Space anywhere presses the overlay's button -- keyboard-only restart. */
  window.addEventListener('keydown', function (e) {
    if (e.code !== 'Enter' && e.code !== 'Space') return
    var btn = document.querySelector('.cv-overlay:not([hidden]) .cv-btn')
    if (btn) { e.preventDefault(); btn.click() }
  })

  return {
    save: save, load: load, wipe: wipe, best: best,
    fmt: fmt, fmtInt: fmtInt, fmtTime: fmtTime,
    clamp: clamp, lerp: lerp, rand: rand, randInt: randInt, pick: pick, chance: chance, dist: dist,
    canvas: canvas, loop: loop, pointer: pointer, keys: keys, swipe: swipe,
    beep: beep, chord: chord, muteToggle: muteToggle,
    el: el, hud: hud, overlay: overlay, toast: toast
  }
})()
