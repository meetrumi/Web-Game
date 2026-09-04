/* Crystal Tap Tycoon — a config for the shared idle engine in ../shared/idle.js.
   Its own mechanic is the combo: taps inside a 1.2 second window stack up to 50,
   which pushes tap value to x8.5, and the stack bleeds away fast once you stop.
   Costs and the prestige threshold are deliberately low — this is the short-session
   game of the set, tuned so a first Resonate lands in well under an hour. */

;(function () {
  var WINDOW = 1.2  // seconds allowed between taps before the stack starts to fall
  var CAP = 50
  var PER = 0.15    // tap multiplier added per combo step
  var BLEED = 8     // combo steps lost per second once the window lapses

  function tapMult(c) { return 1 + c * PER }

  CV.Idle.start({
    id: 'crystal-tap-tycoon',
    title: 'Crystal Tap Tycoon',
    theme: { accent: '#c084fc', stage: 'radial-gradient(120% 100% at 50% 0%, #3a2467, #0c0714)' },
    currency: { name: 'shards', symbol: '💎' },
    genLabel: 'Drills',
    tap: { art: '💎', hint: 'Tap to shatter', name: 'Shatter a crystal', value: 1 },

    generators: [
      { id: 'chisel', name: 'Auto chisel', desc: 'Tireless, tiny', icon: '🔨', cost: 10, mul: 1.15, rate: 0.6 },
      { id: 'drill', name: 'Hand drill', desc: 'Works a seam alone', icon: '🌀', cost: 85, mul: 1.15, rate: 3.5 },
      { id: 'rig', name: 'Shard rig', desc: 'Sorts as it cuts', icon: '⚙️', cost: 700, mul: 1.15, rate: 20 },
      { id: 'laser', name: 'Cutting laser', desc: 'No dust, no waste', icon: '🔺', cost: 6500, mul: 1.15, rate: 125 },
      { id: 'geode', name: 'Geode cracker', desc: 'One hit, whole payload', icon: '🥚', cost: 70000, mul: 1.15, rate: 800 },
      { id: 'reso', name: 'Resonance array', desc: 'Shatters a cavern at a time', icon: '📡', cost: 800000, mul: 1.15, rate: 5000 },
      { id: 'ley', name: 'Ley tap', desc: 'Draws straight from the vein', icon: '🕸️', cost: 9000000, mul: 1.15, rate: 33000 },
      { id: 'prism', name: 'Prism engine', desc: 'Makes crystal out of light', icon: '🔷', cost: 95000000, mul: 1.15, rate: 220000 }
    ],

    upgrades: [
      { id: 'mall', name: 'Weighted mallet', desc: 'Double every tap', icon: '🪓', kind: 'click', mult: 2, cost: 300 },
      { id: 'tune', name: 'Tuning fork', desc: 'Triple every tap', icon: '🎵', kind: 'click', mult: 3, cost: 30000 },
      { id: 'servo', name: 'Servo arms', desc: 'Auto chisels work three times harder', icon: '🦾', kind: 'gen', target: 'chisel', mult: 3, cost: 3000 },
      { id: 'bits', name: 'Diamond bits', desc: 'Hand drills triple their output', icon: '💠', kind: 'gen', target: 'drill', mult: 3, cost: 36000 },
      { id: 'polish', name: 'Polishing line', desc: 'Everything earns 50% more', icon: '✨', kind: 'all', mult: 1.5, cost: 150000 },
      { id: 'buyer', name: 'Standing buyer', desc: 'Everything earns double', icon: '🤝', kind: 'all', mult: 2, cost: 4000000 }
    ],

    prestige: { name: 'Resonate', icon: '🔮', desc: '', at: 250000 },

    mechanic: {
      /* `t` starts high so the very first tap opens a fresh combo rather than
         continuing one from a previous session. */
      init: function () { return { c: 0, t: 99 } },

      tick: function (m, dt) {
        m.t += dt
        if (m.t > WINDOW) m.c = Math.max(0, m.c - dt * BLEED)
      },

      onTap: function (m) {
        m.c = m.t < WINDOW ? Math.min(CAP, Math.floor(m.c) + 1) : 1
        m.t = 0
        return { mult: tapMult(m.c) }
      },

      mult: function (m) { return 1 + m.c * 0.02 },
      fill: function (m) { return m.c / CAP },

      text: function (m) {
        var c = Math.floor(m.c)
        return c > 1
          ? '🔥 Combo ' + c + ' — taps pay x' + tapMult(c).toFixed(1)
          : 'Tap fast — a full combo pays x' + tapMult(CAP).toFixed(1)
      }
    }
  })
})()
