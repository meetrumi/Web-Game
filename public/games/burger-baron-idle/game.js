/* Burger Baron Idle — a config for the shared idle engine in ../shared/idle.js.
   Its own mechanic is the order queue. Tickets arrive on a timer whether you are
   watching or not; a full counter quietly pays more per second, but every ticket
   you clear by hand is worth four times a normal flip. Letting it fill or working
   it down are both valid — that choice is the whole minute-to-minute game. */

;(function () {
  var EVERY = 2.4  // seconds between tickets
  var MAXQ = 12
  var TIP = 4      // multiplier for serving a waiting order by hand

  CV.Idle.start({
    id: 'burger-baron-idle',
    title: 'Burger Baron Idle',
    theme: { accent: '#ff8a3d', stage: 'radial-gradient(120% 100% at 50% 0%, #55301a, #150c07)' },
    currency: { name: 'dollars', symbol: '💵' },
    genLabel: 'Kitchen',
    tap: { art: '🍔', hint: 'Tap to flip a patty', name: 'Flip a patty', value: 1 },

    generators: [
      { id: 'grill', name: 'Flat-top grill', desc: 'Four patties at a time', icon: '🍳', cost: 15, mul: 1.15, rate: 0.5 },
      { id: 'fry', name: 'Fry station', desc: 'The actual profit centre', icon: '🍟', cost: 116, mul: 1.15, rate: 3 },
      { id: 'shake', name: 'Milkshake bar', desc: 'Sells at 400% margin', icon: '🥤', cost: 1060, mul: 1.15, rate: 17 },
      { id: 'thru', name: 'Drive-thru lane', desc: 'Never closes, never empties', icon: '🚗', cost: 11600, mul: 1.15, rate: 108 },
      { id: 'second', name: 'Second location', desc: 'Someone else opens up', icon: '🏬', cost: 127000, mul: 1.15, rate: 690 },
      { id: 'city', name: 'City franchise', desc: 'Twelve stores, one logo', icon: '🌆', cost: 1330000, mul: 1.15, rate: 4350 },
      { id: 'test', name: 'Test kitchen', desc: 'Invents the next limited edition', icon: '🧪', cost: 19200000, mul: 1.15, rate: 29200 },
      { id: 'brand', name: 'Global brand', desc: 'The logo earns more than the food', icon: '🌐', cost: 318000000, mul: 1.15, rate: 197000 }
    ],

    upgrades: [
      { id: 'spat', name: 'Two spatulas', desc: 'Double every flip', icon: '🍴', kind: 'click', mult: 2, cost: 470 },
      { id: 'press', name: 'Smash press', desc: 'Triple every flip', icon: '🔩', kind: 'click', mult: 3, cost: 47000 },
      { id: 'seas', name: 'Secret seasoning', desc: 'Grills earn three times more', icon: '🧂', kind: 'gen', target: 'grill', mult: 3, cost: 4700 },
      { id: 'oil', name: 'Filtered oil', desc: 'Fry stations triple their take', icon: '🛢️', kind: 'gen', target: 'fry', mult: 3, cost: 57000 },
      { id: 'combo', name: 'Combo deals', desc: 'Everything earns 50% more', icon: '🎟️', kind: 'all', mult: 1.5, cost: 235000 },
      { id: 'ad', name: 'Radio jingle', desc: 'Everything earns double', icon: '📻', kind: 'all', mult: 2, cost: 7600000 }
    ],

    prestige: { name: 'Sell the chain', icon: '🏢', desc: '', at: 1000000 },

    mechanic: {
      init: function () { return { q: 0, t: EVERY } },

      tick: function (m, dt) {
        m.t -= dt
        if (m.t > 0) return
        m.t = EVERY
        if (m.q < MAXQ) m.q += 1
      },

      onTap: function (m) {
        if (m.q <= 0) return { mult: 1 }
        m.q -= 1
        return { mult: TIP }
      },

      mult: function (m) { return 1 + 0.06 * m.q },
      fill: function (m) { return m.q / MAXQ },

      text: function (m) {
        if (m.q >= MAXQ) return 'Counter swamped — ' + MAXQ + ' orders up, tap for x' + TIP
        if (m.q > 0) return m.q + (m.q === 1 ? ' order' : ' orders') + ' waiting — tap to serve for x' + TIP
        return 'Counter clear — next ticket in ' + Math.ceil(m.t) + 's'
      }
    }
  })
})()
