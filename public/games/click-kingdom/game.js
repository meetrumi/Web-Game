/* Click Kingdom — a config for the shared idle engine in ../shared/idle.js.
   Its own mechanic is the duel: a boss always stands in front of you, taps land
   one hit, your retinue chips in the rest, and every kill pays a bounty scaled to
   your current income so it stays worth caring about at any point in a run. */

;(function () {
  var FOES = ['Slime', 'Goblin', 'Wolf pack', 'Bandit chief', 'Ogre', 'Wyvern', 'Lich', 'Dragon']

  function maxHp(lvl) { return 10 + 6 * lvl }
  function foeName(lvl) { return FOES[(lvl - 1) % FOES.length] }

  /* Retinue size sets the passive damage, so buying generators arms the party as
     well as filling the treasury. */
  function party(api) {
    var gens = api.state().gens
    var n = 0
    for (var k in gens) if (Object.prototype.hasOwnProperty.call(gens, k)) n += gens[k]
    return n
  }

  function hit(m, dmg, api) {
    m.hp -= dmg
    if (m.hp > 0) return
    api.gain(api.rate() * 12 + api.click() * 20)
    api.toast(foeName(m.lvl) + ' slain — the kingdom pays up')
    CV.chord([523, 659, 880], 60)
    m.lvl += 1
    m.hp = maxHp(m.lvl)
  }

  CV.Idle.start({
    id: 'click-kingdom',
    title: 'Click Kingdom',
    theme: { accent: '#f2c14e', stage: 'radial-gradient(120% 100% at 50% 0%, #2f2445, #0f0a18)' },
    currency: { name: 'gold', symbol: '🪙' },
    genLabel: 'Retinue',
    tap: { art: '⚔️', hint: 'Tap to strike', name: 'Swing your sword', value: 1 },

    generators: [
      { id: 'squire', name: 'Squire', desc: 'Keen, inexpensive', icon: '🧒', cost: 15, mul: 1.15, rate: 0.5 },
      { id: 'archer', name: 'Archer', desc: 'Paid per quiver', icon: '🏹', cost: 115, mul: 1.15, rate: 3 },
      { id: 'knight', name: 'Knight', desc: 'Expensive, worth it', icon: '🛡️', cost: 1050, mul: 1.15, rate: 17 },
      { id: 'mage', name: 'Court mage', desc: 'Turns gold into more gold', icon: '🧙', cost: 11500, mul: 1.15, rate: 108 },
      { id: 'guild', name: 'Mercenary guild', desc: 'Never asks questions', icon: '🏰', cost: 128000, mul: 1.15, rate: 690 },
      { id: 'griff', name: 'Griffin rider', desc: 'Collects taxes from above', icon: '🦅', cost: 1350000, mul: 1.15, rate: 4400 },
      { id: 'legion', name: 'Iron legion', desc: 'Marches on payday', icon: '⚙️', cost: 19500000, mul: 1.15, rate: 29500 },
      { id: 'crown', name: 'Crown treasury', desc: 'Money making money', icon: '👑', cost: 320000000, mul: 1.15, rate: 198000 }
    ],

    upgrades: [
      { id: 'whet', name: 'Whetstone', desc: 'Double every strike', icon: '🪨', kind: 'click', mult: 2, cost: 480 },
      { id: 'runes', name: 'Runed blade', desc: 'Triple every strike', icon: '✨', kind: 'click', mult: 3, cost: 48000 },
      { id: 'drill', name: 'Squire drills', desc: 'Squires work three times harder', icon: '📣', kind: 'gen', target: 'squire', mult: 3, cost: 4800 },
      { id: 'yew', name: 'Yew longbows', desc: 'Archers triple their take', icon: '🎯', kind: 'gen', target: 'archer', mult: 3, cost: 58000 },
      { id: 'tax', name: 'Tax reform', desc: 'Everything earns 50% more', icon: '📜', kind: 'all', mult: 1.5, cost: 240000 },
      { id: 'mint', name: 'Royal mint', desc: 'Everything earns double', icon: '🏦', kind: 'all', mult: 2, cost: 7500000 }
    ],

    prestige: { name: 'Rebirth', icon: '👑', desc: '', at: 1000000 },

    mechanic: {
      init: function () { return { lvl: 1, hp: maxHp(1) } },

      tick: function (m, dt, api) { hit(m, dt * (0.4 + 0.06 * party(api)), api) },
      onTap: function (m, api) { hit(m, 1, api); return { mult: 1 } },

      mult: function (m) { return 1 + 0.03 * (m.lvl - 1) },
      fill: function (m) { return m.hp / maxHp(m.lvl) },

      text: function (m) {
        return foeName(m.lvl) + ' Lv ' + m.lvl + ' — ' +
          Math.max(0, Math.ceil(m.hp)) + ' / ' + maxHp(m.lvl) + ' HP'
      }
    }
  })
})()
