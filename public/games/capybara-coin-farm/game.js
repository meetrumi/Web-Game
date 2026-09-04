/* Capybara Coin Farm — a config for the shared idle engine in ../shared/idle.js.
   Its own mechanic is contentment: a meter that drifts down slowly and rises when
   you pet something. Nothing here punishes you for leaving — the multiplier just
   settles back to x1 — because the whole point of this one is that it is calm. */

;(function () {
  var DECAY = 0.004 // per second: a full meter takes about four minutes to empty
  var PET = 0.05    // per tap

  CV.Idle.start({
    id: 'capybara-coin-farm',
    title: 'Capybara Coin Farm',
    theme: { accent: '#8fd694', stage: 'radial-gradient(120% 100% at 50% 0%, #33502f, #101a12)' },
    currency: { name: 'coins', symbol: '🪙' },
    genLabel: 'Meadow',
    tap: { art: '🦫', hint: 'Tap to pet a capybara', name: 'Pet a capybara', value: 1 },

    generators: [
      { id: 'nap', name: 'Napping capybara', desc: 'Earns money horizontally', icon: '😴', cost: 15, mul: 1.15, rate: 0.5 },
      { id: 'melon', name: 'Melon patch', desc: 'Snacks with a margin', icon: '🍉', cost: 118, mul: 1.15, rate: 3 },
      { id: 'spring', name: 'Hot spring', desc: 'Charges admission', icon: '♨️', cost: 1080, mul: 1.15, rate: 17 },
      { id: 'grove', name: 'Orange grove', desc: 'Hats sold separately', icon: '🍊', cost: 11800, mul: 1.15, rate: 110 },
      { id: 'jetty', name: 'Reed jetty', desc: 'River tolls, gently collected', icon: '🛶', cost: 126000, mul: 1.15, rate: 700 },
      { id: 'spa', name: 'Capy day spa', desc: 'Booked out for months', icon: '🧖', cost: 1360000, mul: 1.15, rate: 4400 },
      { id: 'mill', name: 'Bamboo mill', desc: 'Somebody has to make the jetties', icon: '🎍', cost: 19800000, mul: 1.15, rate: 29800 },
      { id: 'orch', name: 'Coin orchard', desc: 'Do not ask how it grows', icon: '🌳', cost: 315000000, mul: 1.15, rate: 199000 }
    ],

    /* The upgrades are all hats, which is both the joke and the reason people keep
       scrolling the list. */
    upgrades: [
      { id: 'straw', name: 'Straw hat', desc: 'Double every pet', icon: '👒', kind: 'click', mult: 2, cost: 460 },
      { id: 'somb', name: 'Tiny sombrero', desc: 'Triple every pet', icon: '🎩', kind: 'click', mult: 3, cost: 46000 },
      { id: 'mask', name: 'Sleep mask', desc: 'Nappers earn three times more', icon: '🌙', kind: 'gen', target: 'nap', mult: 3, cost: 4600 },
      { id: 'sprink', name: 'Sprinkler line', desc: 'Melon patches triple their yield', icon: '💧', kind: 'gen', target: 'melon', mult: 3, cost: 56000 },
      { id: 'scarf', name: 'Matching scarves', desc: 'Everything earns 50% more', icon: '🧣', kind: 'all', mult: 1.5, cost: 230000 },
      { id: 'top', name: 'Formal top hats', desc: 'Everything earns double', icon: '🎩', kind: 'all', mult: 2, cost: 7200000 }
    ],

    prestige: { name: 'New season', icon: '🌸', desc: '', at: 500000 },

    mechanic: {
      init: function () { return { joy: 0.7 } },

      tick: function (m, dt) { m.joy = CV.clamp(m.joy - DECAY * dt, 0, 1) },

      onTap: function (m) {
        m.joy = CV.clamp(m.joy + PET, 0, 1)
        return { mult: 1 + 2 * m.joy }
      },

      mult: function (m) { return 1 + m.joy },
      fill: function (m) { return m.joy },

      text: function (m) {
        return m.joy < 0.25
          ? 'Everyone is asleep — pet someone for x' + (1 + m.joy).toFixed(2)
          : 'Capybaras ' + Math.round(m.joy * 100) + '% content — x' + (1 + m.joy).toFixed(2) + ' coins'
      }
    }
  })
})()
