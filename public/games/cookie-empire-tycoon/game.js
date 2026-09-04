/* Cookie Empire Tycoon — a config for the shared idle engine in ../shared/idle.js.
   The economy, saving and offline accrual live there. What is here: the theme, the
   eight producers, six upgrades, and one mechanic of its own — a golden cookie that
   turns up on a timer and multiplies taps while it lasts. */

CV.Idle.start({
  id: 'cookie-empire-tycoon',
  title: 'Cookie Empire Tycoon',
  theme: { accent: '#f5b41d', stage: 'radial-gradient(120% 100% at 50% 0%, #6b431d, #1b1209)' },
  currency: { name: 'cookies', symbol: '🍪' },
  genLabel: 'Bakery',
  tap: { art: '🍪', hint: 'Tap to bake', name: 'Bake a cookie', value: 1 },

  generators: [
    { id: 'gran', name: 'Grandma', desc: 'Bakes from memory', icon: '👵', cost: 15, mul: 1.15, rate: 0.5 },
    { id: 'farm', name: 'Cocoa farm', desc: 'Grows the good stuff', icon: '🌱', cost: 120, mul: 1.15, rate: 3 },
    { id: 'ref', name: 'Sugar refinery', desc: 'Industrial sweetness', icon: '🏭', cost: 1100, mul: 1.15, rate: 18 },
    { id: 'oven', name: 'Conveyor oven', desc: 'Never stops turning', icon: '🔥', cost: 12000, mul: 1.15, rate: 110 },
    { id: 'shop', name: 'Franchise store', desc: 'Someone else does the work', icon: '🏪', cost: 130000, mul: 1.15, rate: 700 },
    { id: 'bot', name: 'Dough robot', desc: 'Kneads at 400 rpm', icon: '🤖', cost: 1400000, mul: 1.15, rate: 4500 },
    { id: 'lab', name: 'Flavour lab', desc: 'Invents cookies that should not exist', icon: '🧪', cost: 20000000, mul: 1.15, rate: 30000 },
    { id: 'orbit', name: 'Orbital bakery', desc: 'Bakes in zero gravity', icon: '🛰️', cost: 330000000, mul: 1.15, rate: 200000 }
  ],

  upgrades: [
    { id: 'mitts', name: 'Oven mitts', desc: 'Double every tap', icon: '🧤', kind: 'click', mult: 2, cost: 500 },
    { id: 'reci', name: 'Secret recipe', desc: 'Triple every tap', icon: '📜', kind: 'click', mult: 3, cost: 50000 },
    { id: 'tea', name: 'Grandma union', desc: 'Grandmas work three times harder', icon: '☕', kind: 'gen', target: 'gran', mult: 3, cost: 5000 },
    { id: 'irri', name: 'Drip irrigation', desc: 'Cocoa farms triple output', icon: '💧', kind: 'gen', target: 'farm', mult: 3, cost: 60000 },
    { id: 'ship', name: 'Overnight shipping', desc: 'Everything earns 50% more', icon: '🚚', kind: 'all', mult: 1.5, cost: 250000 },
    { id: 'brand', name: 'National advert', desc: 'Everything earns double', icon: '📺', kind: 'all', mult: 2, cost: 8000000 }
  ],

  prestige: {
    name: 'Franchise',
    icon: '🏆',
    desc: '',
    at: 1000000
  },

  /* The golden cookie: 10 seconds of x7 taps and double passive output, then a
     40-90 second wait. Nothing here is timed to an ad break on purpose. */
  mechanic: {
    init: function () { return { next: 35, on: 0 } },

    tick: function (m, dt, api) {
      if (m.on > 0) {
        m.on -= dt
        if (m.on <= 0) m.next = 40 + Math.random() * 50
        return
      }
      m.next -= dt
      if (m.next <= 0) {
        m.on = 10
        api.toast('Golden cookie! Taps pay x7 for 10 seconds')
        CV.chord([784, 988, 1319], 80)
      }
    },

    onTap: function (m) { return { mult: m.on > 0 ? 7 : 1 } },
    mult: function (m) { return m.on > 0 ? 2 : 1 },
    fill: function (m) { return m.on > 0 ? m.on / 10 : 1 - m.next / 90 },

    text: function (m) {
      return m.on > 0
        ? '✨ GOLDEN COOKIE — x7 taps, ' + Math.ceil(m.on) + 's'
        : 'Golden cookie in ' + Math.ceil(m.next) + 's'
    }
  }
})
