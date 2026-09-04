/* ClickVault idle engine.
   Every bundled idle game is this file plus a config: the economy, the UI, the
   save format and the offline-accrual rule are shared, and each game supplies its
   own theme, generators, upgrades and one custom "mechanic" (a boss, a depth
   meter, a combo counter) so they do not all play identically.

   Requires core.js. Exposes CV.Idle.start(config).

   Offline earnings use the three knobs the blog article describes: a RATE (what
   fraction of active income you earn while away), a CAP (how long counts) and a
   MULTIPLIER (upgrades). Change them in OFFLINE below. */

(function (CV) {
  'use strict'

  var OFFLINE = { rate: 0.5, capHours: 4 }
  var SAVE_EVERY = 5

  function costOf(gen, owned) { return gen.cost * Math.pow(gen.mul, owned) }

  /** Geometric-series cost of buying `count` more, starting from `owned`. */
  function bulkCost(gen, owned, count) {
    var first = costOf(gen, owned)
    if (count <= 1) return first
    return first * (Math.pow(gen.mul, count) - 1) / (gen.mul - 1)
  }

  /** How many more of `gen` a balance can afford, capped so Max cannot hang. */
  function affordable(gen, owned, balance) {
    var first = costOf(gen, owned)
    if (balance < first) return 0
    var n = Math.log(1 + (balance * (gen.mul - 1)) / first) / Math.log(gen.mul)
    return Math.max(1, Math.min(1000, Math.floor(n)))
  }

  function start(cfg) {
    var el = CV.el
    var fmt = CV.fmt
    var mech = cfg.mechanic || null

    /* ---------------------------------------------------------------- state */
    var blank = {
      balance: 0, earned: 0, clicks: 0,
      gens: {}, ups: [], prestige: 0, seen: Date.now(),
      m: mech && mech.init ? mech.init() : null
    }

    var s = CV.load(cfg.id, null)
    if (!s || typeof s.balance !== 'number') s = blank
    if (!s.gens) s.gens = {}
    if (!s.ups) s.ups = []
    if (mech && mech.init && !s.m) s.m = mech.init()

    var api = {
      gain: function (n) { s.balance += n; s.earned += n },
      rate: function () { return rate() },
      click: function () { return clickValue() },
      toast: CV.toast,
      state: function () { return s },
      float: null // wired to the stage below
    }

    /* --------------------------------------------------------------- economy */
    function prestigeMult() { return 1 + 0.5 * s.prestige }

    function upsOf(kind, target) {
      var m = 1
      cfg.upgrades.forEach(function (u) {
        if (s.ups.indexOf(u.id) < 0 || u.kind !== kind) return
        if (kind === 'gen' && u.target !== target) return
        m *= u.mult
      })
      return m
    }

    function rate() {
      var total = 0
      cfg.generators.forEach(function (g) {
        var n = s.gens[g.id] || 0
        if (n) total += g.rate * n * upsOf('gen', g.id)
      })
      total *= upsOf('all') * prestigeMult()
      if (mech && mech.mult) total *= mech.mult(s.m)
      return total
    }

    function clickValue() {
      return cfg.tap.value * upsOf('click') * upsOf('all') * prestigeMult()
    }

    function prestigeAt() { return cfg.prestige.at * Math.pow(8, s.prestige) }

    /* -------------------------------------------------------------------- UI */
    document.title = cfg.title + ' — ClickVault'
    var accent = (cfg.theme && cfg.theme.accent) || '#f5b41d'

    var wrap = el('div', 'cv-idle-wrap')
    var stage = el('section', 'cv-stage')
    stage.style.background = (cfg.theme && cfg.theme.stage) ||
      'radial-gradient(120% 100% at 50% 0%, #22305e, #0f1220)'

    var tapBtn = el('button', 'cv-tap')
    tapBtn.type = 'button'
    tapBtn.setAttribute('aria-label', cfg.tap.name)
    var art = el('span', 'cv-tap-art', cfg.tap.art)
    tapBtn.appendChild(art)
    tapBtn.appendChild(el('span', 'cv-tap-hint', cfg.tap.hint))

    var balanceEl = el('div', 'cv-balance', '0')
    var rateEl = el('div', 'cv-rate', '0 / sec')
    stage.appendChild(tapBtn)
    stage.appendChild(balanceEl)
    stage.appendChild(rateEl)

    var mechText = null
    var mechBar = null
    if (mech) {
      mechText = el('div', 'cv-rate', '')
      mechText.style.color = accent
      stage.appendChild(mechText)
      if (mech.fill) {
        mechBar = el('div', 'cv-bar')
        var fillEl = el('i')
        fillEl.style.background = accent
        mechBar.appendChild(fillEl)
        mechBar.fill = fillEl
        stage.appendChild(mechBar)
      }
    }

    /** Floating "+12" at the tap point. */
    api.float = function (text, x, y) {
      var f = el('div', 'cv-float', text)
      f.style.left = (x - 12) + 'px'
      f.style.top = (y - 26) + 'px'
      f.style.color = accent
      stage.appendChild(f)
      setTimeout(function () { f.remove() }, 900)
    }

    /* ------------------------------------------------------- generators card */
    var col = el('div', 'cv-col')
    var genCard = el('div', 'cv-card')
    genCard.appendChild(el('h2', null, cfg.genLabel || 'Producers'))

    var buyN = 1
    var chipRow = el('div', 'cv-buys')
    var chips = []
    ;[1, 10, 'Max'].forEach(function (n) {
      var chip = el('button', 'cv-chip', n === 'Max' ? 'Max' : 'x' + n)
      chip.type = 'button'
      chip.addEventListener('click', function () {
        buyN = n
        chips.forEach(function (c) { c.classList.toggle('is-on', c === chip) })
        paint()
      })
      chips.push(chip)
      chipRow.appendChild(chip)
    })
    chips[0].classList.add('is-on')
    genCard.appendChild(chipRow)

    var genRows = cfg.generators.map(function (g) {
      var row = el('button', 'cv-row')
      row.type = 'button'
      row.appendChild(el('span', 'cv-icon', g.icon))
      var meta = el('div', 'cv-meta')
      meta.appendChild(el('div', 'cv-name', g.name))
      var desc = el('div', 'cv-desc', g.desc)
      meta.appendChild(desc)
      row.appendChild(meta)
      var end = el('div', 'cv-end')
      var cost = el('div', 'cv-cost', '')
      cost.style.color = accent
      var own = el('div', 'cv-own', '')
      end.appendChild(cost)
      end.appendChild(own)
      row.appendChild(end)
      row.addEventListener('click', function () { buy(g) })
      genCard.appendChild(row)
      return { row: row, cost: cost, own: own, desc: desc, gen: g }
    })
    col.appendChild(genCard)

    /* ---------------------------------------------------------- upgrades card */
    var upCard = el('div', 'cv-card')
    upCard.appendChild(el('h2', null, 'Upgrades'))
    var upRows = cfg.upgrades.map(function (u) {
      var row = el('button', 'cv-row')
      row.type = 'button'
      row.appendChild(el('span', 'cv-icon', u.icon))
      var meta = el('div', 'cv-meta')
      meta.appendChild(el('div', 'cv-name', u.name))
      meta.appendChild(el('div', 'cv-desc', u.desc))
      row.appendChild(meta)
      var cost = el('div', 'cv-cost', fmt(u.cost))
      cost.style.color = accent
      row.appendChild(cost)
      row.addEventListener('click', function () { buyUp(u) })
      upCard.appendChild(row)
      return { row: row, cost: cost, up: u }
    })
    col.appendChild(upCard)

    /* ---------------------------------------------------------- prestige card */
    var presCard = el('div', 'cv-card')
    presCard.appendChild(el('h2', null, cfg.prestige.name))
    var presRow = el('button', 'cv-row')
    presRow.type = 'button'
    presRow.appendChild(el('span', 'cv-icon', cfg.prestige.icon))
    var presMeta = el('div', 'cv-meta')
    var presName = el('div', 'cv-name', cfg.prestige.name)
    var presDesc = el('div', 'cv-desc', cfg.prestige.desc)
    presMeta.appendChild(presName)
    presMeta.appendChild(presDesc)
    presRow.appendChild(presMeta)
    presRow.addEventListener('click', doPrestige)
    presCard.appendChild(presRow)
    col.appendChild(presCard)

    var foot = el('p', 'cv-foot')
    foot.appendChild(document.createTextNode('Progress saves in this browser. '))
    var resetBtn = el('button', 'cv-btn cv-btn-ghost', 'Reset save')
    resetBtn.type = 'button'
    resetBtn.addEventListener('click', function () {
      if (!window.confirm('Erase all progress in ' + cfg.title + '?')) return
      CV.wipe(cfg.id)
      window.location.reload()
    })
    foot.appendChild(resetBtn)
    col.appendChild(foot)

    CV.muteToggle(foot)
    wrap.appendChild(stage)
    wrap.appendChild(col)
    document.body.appendChild(wrap)

    /* --------------------------------------------------------------- actions */
    function buy(g) {
      var owned = s.gens[g.id] || 0
      var n = buyN === 'Max' ? affordable(g, owned, s.balance) : buyN
      if (bulkCost(g, owned, n) > s.balance) n = affordable(g, owned, s.balance)
      if (!n) return
      s.balance -= bulkCost(g, owned, n)
      s.gens[g.id] = owned + n
      CV.beep(500 + Math.min(owned, 24) * 9, 0.06, 'triangle', 0.035)
      paint()
    }

    function buyUp(u) {
      if (s.ups.indexOf(u.id) >= 0 || s.balance < u.cost) return
      s.balance -= u.cost
      s.ups.push(u.id)
      CV.chord([660, 880, 1180], 55)
      paint()
    }

    function doPrestige() {
      if (s.earned < prestigeAt()) return
      s.prestige += 1
      s.balance = 0
      s.earned = 0
      s.gens = {}
      s.ups = []
      if (mech && mech.init) s.m = mech.init()
      CV.chord([523, 659, 784, 1046], 85)
      CV.toast(cfg.prestige.name + ' ' + s.prestige + ' unlocked — everything now x' + prestigeMult().toFixed(1))
      save()
      paint()
    }

    function doTap(x, y) {
      var bonus = 1
      if (mech && mech.onTap) {
        var res = mech.onTap(s.m, api) || {}
        if (res.mult) bonus = res.mult
      }
      var got = clickValue() * bonus
      s.balance += got
      s.earned += got
      s.clicks += 1
      api.float('+' + fmt(got), x, y)
      CV.beep(bonus > 1 ? 990 : 640, 0.05, 'square', 0.028)
      paint()
    }

    tapBtn.addEventListener('pointerdown', function (e) {
      var box = stage.getBoundingClientRect()
      doTap(e.clientX - box.left, e.clientY - box.top)
    })
    /* detail === 0 means the click came from the keyboard, not a pointer. */
    tapBtn.addEventListener('click', function (e) {
      if (e.detail !== 0) return
      var box = stage.getBoundingClientRect()
      var art = tapBtn.getBoundingClientRect()
      doTap(art.left - box.left + art.width / 2, art.top - box.top + art.height / 2)
    })

    /* ---------------------------------------------------------------- painting */
    function paint() {
      balanceEl.textContent = fmt(s.balance) + ' ' + cfg.currency.symbol
      rateEl.textContent = fmt(rate()) + ' ' + cfg.currency.name + ' / sec'

      genRows.forEach(function (gr) {
        var owned = s.gens[gr.gen.id] || 0
        var n = buyN === 'Max' ? Math.max(1, affordable(gr.gen, owned, s.balance)) : buyN
        var price = bulkCost(gr.gen, owned, n)
        gr.cost.textContent = fmt(price) + (n > 1 ? '  x' + n : '')
        gr.own.textContent = owned ? 'owned ' + owned : '—'
        gr.row.disabled = price > s.balance
      })

      upRows.forEach(function (ur) {
        var bought = s.ups.indexOf(ur.up.id) >= 0
        ur.cost.textContent = bought ? 'owned' : fmt(ur.up.cost)
        ur.row.disabled = bought || s.balance < ur.up.cost
      })

      var need = prestigeAt()
      presRow.disabled = s.earned < need
      presName.textContent = cfg.prestige.name + (s.prestige ? ' ' + (s.prestige + 1) : '')
      presDesc.textContent = s.earned >= need
        ? 'Reset everything for a permanent x' + (prestigeMult() + 0.5).toFixed(1)
        : 'Needs ' + fmt(need) + ' lifetime ' + cfg.currency.name + ' — ' + fmt(s.earned) + ' so far'

      if (mech) {
        if (mechText) mechText.textContent = mech.text ? mech.text(s.m) : ''
        if (mechBar) mechBar.fill.style.width = (CV.clamp(mech.fill(s.m), 0, 1) * 100) + '%'
      }
    }

    /* ------------------------------------------------------ save and offline */
    function save() {
      s.seen = Date.now()
      CV.save(cfg.id, s)
    }

    function applyOffline() {
      var away = (Date.now() - (s.seen || Date.now())) / 1000
      if (away < 60) return
      var counted = Math.min(away, OFFLINE.capHours * 3600)
      var got = rate() * counted * OFFLINE.rate
      if (got <= 0) return
      s.balance += got
      s.earned += got
      CV.toast('Away ' + CV.fmtTime(away) + ' — collected ' + fmt(got) + ' ' + cfg.currency.name, 4000)
    }

    applyOffline()
    paint()

    var uiAcc = 0
    var saveAcc = 0
    CV.loop(function (dt) {
      var r = rate()
      if (r > 0) {
        s.balance += r * dt
        s.earned += r * dt
      }
      if (mech && mech.tick) mech.tick(s.m, dt, api)
      uiAcc += dt
      if (uiAcc >= 0.1) { uiAcc = 0; paint() }
      saveAcc += dt
      if (saveAcc >= SAVE_EVERY) { saveAcc = 0; save() }
    })

    document.addEventListener('visibilitychange', function () { if (document.hidden) save() })
    window.addEventListener('pagehide', save)
  }

  CV.Idle = { start: start }
})(window.CV)
