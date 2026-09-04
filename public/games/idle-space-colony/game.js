/* Idle Space Colony — a config for the shared idle engine in ../shared/idle.js.
   Its own mechanic is the power grid. Domes drain it, your shifts charge it, and
   the multiplier is a straight either/or: lit (x1.6) or browned out (x0.75). The
   `lo` flag is the single source of truth for which state you are in, so the
   multiplier and the toast can never disagree with each other. */

;(function () {
  var DRAIN = 0.8      // base %/second
  var PER_DOME = 0.02  // extra %/second for every building you own
  var MAX_DRAIN = 3
  var SHIFT = 4        // % restored per tap
  var OUT = 30         // fall below this and the grid browns out
  var IN = 42          // climb above this and it recovers (hysteresis, so no toast spam)

  function domes(api) {
    var gens = api.state().gens
    var n = 0
    for (var k in gens) if (Object.prototype.hasOwnProperty.call(gens, k)) n += gens[k]
    return n
  }

  CV.Idle.start({
    id: 'idle-space-colony',
    title: 'Idle Space Colony',
    theme: { accent: '#6ee7f0', stage: 'radial-gradient(120% 100% at 50% 0%, #12294a, #05070f)' },
    currency: { name: 'credits', symbol: '💠' },
    genLabel: 'Colony',
    tap: { art: '🚀', hint: 'Tap to work a shift', name: 'Work a shift', value: 1 },

    generators: [
      { id: 'solar', name: 'Solar mast', desc: 'Cheap, and it shows', icon: '☀️', cost: 15, mul: 1.15, rate: 0.5 },
      { id: 'hydro', name: 'Hydroponic dome', desc: 'Sells lettuce at a markup', icon: '🥬', cost: 122, mul: 1.15, rate: 3 },
      { id: 'ice', name: 'Ice quarry', desc: 'Water is the local currency', icon: '🧊', cost: 1120, mul: 1.15, rate: 18 },
      { id: 'fusion', name: 'Fusion plant', desc: 'Thirsty, but it pays', icon: '⚛️', cost: 12500, mul: 1.15, rate: 112 },
      { id: 'fab', name: 'Fabricator bay', desc: 'Prints whatever is short', icon: '🏗️', cost: 132000, mul: 1.15, rate: 710 },
      { id: 'lift', name: 'Orbital elevator', desc: 'Freight, by the tonne', icon: '🛗', cost: 1420000, mul: 1.15, rate: 4550 },
      { id: 'driver', name: 'Mass driver', desc: 'Exports ore at 8 km/s', icon: '🛰️', cost: 20500000, mul: 1.15, rate: 30500 },
      { id: 'terra', name: 'Terraformer', desc: 'Turns the rock into an address', icon: '🌍', cost: 335000000, mul: 1.15, rate: 202000 }
    ],

    upgrades: [
      { id: 'exo', name: 'Powered exosuit', desc: 'Double every shift', icon: '🦾', kind: 'click', mult: 2, cost: 520 },
      { id: 'nano', name: 'Nanite gloves', desc: 'Triple every shift', icon: '🧬', kind: 'click', mult: 3, cost: 52000 },
      { id: 'track', name: 'Sun trackers', desc: 'Solar masts triple their output', icon: '🔭', kind: 'gen', target: 'solar', mult: 3, cost: 5200 },
      { id: 'led', name: 'Full-spectrum LEDs', desc: 'Hydroponics triple their yield', icon: '💡', kind: 'gen', target: 'hydro', mult: 3, cost: 62000 },
      { id: 'charter', name: 'Trade charter', desc: 'Everything earns 50% more', icon: '📈', kind: 'all', mult: 1.5, cost: 260000 },
      { id: 'ai', name: 'Logistics AI', desc: 'Everything earns double', icon: '🧠', kind: 'all', mult: 2, cost: 8500000 }
    ],

    prestige: { name: 'Jump system', icon: '🌌', desc: '', at: 2000000 },

    mechanic: {
      init: function () { return { pw: 55, lo: 0 } },

      tick: function (m, dt, api) {
        m.pw = CV.clamp(m.pw - dt * Math.min(MAX_DRAIN, DRAIN + PER_DOME * domes(api)), 0, 100)
        if (!m.lo && m.pw < OUT) {
          m.lo = 1
          api.toast('Brownout — colony output cut to x0.75')
          CV.chord([330, 262], 90)
        } else if (m.lo && m.pw > IN) {
          m.lo = 0
          api.toast('Grid restored — output back to x1.6')
          CV.chord([523, 784], 70)
        }
      },

      onTap: function (m) {
        m.pw = CV.clamp(m.pw + SHIFT, 0, 100)
        return { mult: 1 }
      },

      mult: function (m) { return m.lo ? 0.75 : 1.6 },
      fill: function (m) { return m.pw / 100 },

      text: function (m) {
        return m.lo
          ? '⚠ BROWNOUT ' + Math.round(m.pw) + '% — tap to spin the turbines'
          : 'Grid ' + Math.round(m.pw) + '% — every dome lit, x1.6 output'
      }
    }
  })
})()
