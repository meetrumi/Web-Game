/* Idle Mine Shaft — a config for the shared idle engine in ../shared/idle.js.
   Its own mechanic is depth. Taps and the haul crew sink the shaft; every 250 m
   strikes a seam worth half a minute of income, and deeper rock is richer, so
   passive output scales with how far down you have got. Depth resets with the
   shaft on prestige. */

;(function () {
  var SEAM = 250   // metres between seams
  var MAX_DIG = 8  // metres per second the crew can haul, however large it gets

  /* Sink the shaft and pay out every seam crossed on the way. Called from the tap
     handler and from the tick, so the payout rule lives in exactly one place. */
  function dig(m, metres, api) {
    m.depth += metres
    while (m.depth >= m.seam) {
      m.seam += SEAM
      api.gain(api.rate() * 30 + api.click() * 15)
      api.toast('Seam struck at ' + CV.fmtInt(m.seam - SEAM) + ' m — 30 seconds of ore')
      CV.chord([392, 523, 659], 70)
    }
  }

  /* Crew size drives the passive dig speed, which is why buying generators feels
     like it does two things at once. */
  function crew(api) {
    var gens = api.state().gens
    var n = 0
    for (var k in gens) if (Object.prototype.hasOwnProperty.call(gens, k)) n += gens[k]
    return n
  }

  CV.Idle.start({
    id: 'idle-mine-shaft',
    title: 'Idle Mine Shaft',
    theme: { accent: '#ffb703', stage: 'radial-gradient(120% 100% at 50% 0%, #3d3122, #0d0b08)' },
    currency: { name: 'ore', symbol: '🪨' },
    genLabel: 'Crew',
    tap: { art: '⛏️', hint: 'Tap to dig', name: 'Swing the pick', value: 1 },

    generators: [
      { id: 'hand', name: 'Pick hand', desc: 'Paid in sandwiches', icon: '🧑‍🏭', cost: 15, mul: 1.15, rate: 0.5 },
      { id: 'cart', name: 'Ore cart', desc: 'Rolls itself downhill', icon: '🛒', cost: 110, mul: 1.15, rate: 3 },
      { id: 'drill', name: 'Rock drill', desc: 'Loud, effective', icon: '🔨', cost: 1000, mul: 1.15, rate: 17 },
      { id: 'lift', name: 'Cage lift', desc: 'Hauls while you sleep', icon: '🛗', cost: 11000, mul: 1.15, rate: 105 },
      { id: 'blast', name: 'Blast crew', desc: 'Opens a seam a shift', icon: '🧨', cost: 125000, mul: 1.15, rate: 680 },
      { id: 'borer', name: 'Tunnel borer', desc: 'Eats granite for breakfast', icon: '🚜', cost: 1300000, mul: 1.15, rate: 4300 },
      { id: 'mech', name: 'Mining mech', desc: 'One pilot, forty arms', icon: '🦾', cost: 19000000, mul: 1.15, rate: 29000 },
      { id: 'core', name: 'Mantle rig', desc: 'Drills where maps stop', icon: '🌋', cost: 310000000, mul: 1.15, rate: 195000 }
    ],

    upgrades: [
      { id: 'grip', name: 'Rubber grip', desc: 'Double every swing', icon: '🧤', kind: 'click', mult: 2, cost: 450 },
      { id: 'carb', name: 'Carbide tip', desc: 'Triple every swing', icon: '💠', kind: 'click', mult: 3, cost: 45000 },
      { id: 'boot', name: 'Steel boots', desc: 'Pick hands work three times harder', icon: '🥾', kind: 'gen', target: 'hand', mult: 3, cost: 4500 },
      { id: 'rail', name: 'Steel rails', desc: 'Ore carts triple their haul', icon: '🛤️', kind: 'gen', target: 'cart', mult: 3, cost: 55000 },
      { id: 'lamp', name: 'Carbide lamps', desc: 'Everything earns 50% more', icon: '🔆', kind: 'all', mult: 1.5, cost: 220000 },
      { id: 'assay', name: 'Assay office', desc: 'Everything earns double', icon: '⚖️', kind: 'all', mult: 2, cost: 7000000 }
    ],

    prestige: { name: 'New shaft', icon: '🕳️', desc: '', at: 750000 },

    mechanic: {
      init: function () { return { depth: 0, seam: SEAM } },

      tick: function (m, dt, api) {
        dig(m, dt * Math.min(MAX_DIG, 0.4 + 0.12 * crew(api)), api)
      },

      onTap: function (m, api) {
        dig(m, 2, api)
        return { mult: 1 }
      },

      /* Sub-linear on purpose: sqrt keeps a long session rewarding without letting
         an overnight idle turn the multiplier into a rounding error on everything else. */
      mult: function (m) { return 1 + Math.sqrt(m.depth) / 25 },
      fill: function (m) { return 1 - (m.seam - m.depth) / SEAM },

      text: function (m) {
        return 'Depth ' + CV.fmtInt(m.depth) + ' m — x' + (1 + Math.sqrt(m.depth) / 25).toFixed(2) +
          ' ore · next seam ' + CV.fmtInt(m.seam) + ' m'
      }
    }
  })
})()
