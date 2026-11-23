/* Checkmate Chess — full-rules chess against a computer opponent on ../shared/core.js.
   Legal-move generation covers castling, en passant and promotion (pawns promote to a
   queen). The bot is a small alpha-beta search over material plus piece-square
   bonuses: Easy looks one move ahead with some randomness, Normal two, Hard three
   with a capture search on top. Checkmate, stalemate, the 50-move rule and bare
   kings all end the game. Wins are counted per level. */
(function (CV) {
  'use strict'
  var ID = 'checkmate-chess'
  var LEVELS = [{ name: 'Easy', depth: 1, noise: 80 }, { name: 'Normal', depth: 2, noise: 15 }, { name: 'Hard', depth: 3, noise: 0, q: true }]
  var VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 }
  var GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  var CENTER = [0, 1, 2, 3, 3, 2, 1, 0]
  var KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]
  var KG = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
  var ROOK = [[1, 0], [-1, 0], [0, 1], [0, -1]], BISHOP = [[1, 1], [1, -1], [-1, 1], [-1, -1]]

  var view = CV.canvas('#c'), ctx = view.ctx
  var hud = CV.hud([{ key: 'st', label: 'Status' }, { key: 'w', label: 'Wins' }])
  var over = CV.overlay()
  var level = Number(CV.load(ID + ':level', 1)) || 0
  var G, sel = null, targets = [], last = null, thinking = false, playing = false, L = {}

  var lvlBtn = CV.el('button', 'cv-btn cv-btn-ghost'); lvlBtn.type = 'button'
  var undoBtn = CV.el('button', 'cv-btn cv-btn-ghost', 'Undo'); undoBtn.type = 'button'
  hud.right.insertBefore(undoBtn, hud.right.firstChild)
  hud.right.insertBefore(lvlBtn, hud.right.firstChild)
  lvlBtn.addEventListener('click', function () { if (thinking) return; level = (level + 1) % LEVELS.length; CV.save(ID + ':level', level); newGame(); playing = true; CV.toast(LEVELS[level].name + ' bot - new game') })
  undoBtn.addEventListener('click', function () {
    if (thinking || !G.hist.length) return
    // take back the bot's reply and your move together
    G = G.hist.length >= 2 ? G.hist[G.hist.length - 2] : G.hist[0]
    sel = null; targets = []; last = G.lastMove || null; playing = true; paint()
  })

  function white(p) { return p && p === p.toUpperCase() }
  function colorOf(p) { return p ? (white(p) ? 'w' : 'b') : null }
  function at(b, r, f) { return r < 0 || r > 7 || f < 0 || f > 7 ? undefined : b[r * 8 + f] }

  function startPos() {
    var rows = ['rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR']
    var b = []
    rows.forEach(function (row) { for (var i = 0; i < 8; i++) b.push(row[i] === '.' ? null : row[i]) })
    return { b: b, turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0, hist: [], lastMove: null }
  }

  /* -------------------------------------------------------- move generation */
  function attacked(b, sq, by) {
    var r = sq >> 3, f = sq & 7, i, p, d, rr, ff
    var pr = by === 'w' ? r + 1 : r - 1, pawn = by === 'w' ? 'P' : 'p'
    if (at(b, pr, f - 1) === pawn || at(b, pr, f + 1) === pawn) return true
    var kn = by === 'w' ? 'N' : 'n', kg = by === 'w' ? 'K' : 'k'
    for (i = 0; i < 8; i++) { if (at(b, r + KN[i][0], f + KN[i][1]) === kn) return true; if (at(b, r + KG[i][0], f + KG[i][1]) === kg) return true }
    var rq = by === 'w' ? 'RQ' : 'rq', bq = by === 'w' ? 'BQ' : 'bq'
    for (i = 0; i < 4; i++) {
      d = ROOK[i]; rr = r + d[0]; ff = f + d[1]
      while ((p = at(b, rr, ff)) !== undefined) { if (p) { if (rq.indexOf(p) >= 0) return true; break } rr += d[0]; ff += d[1] }
      d = BISHOP[i]; rr = r + d[0]; ff = f + d[1]
      while ((p = at(b, rr, ff)) !== undefined) { if (p) { if (bq.indexOf(p) >= 0) return true; break } rr += d[0]; ff += d[1] }
    }
    return false
  }

  function kingSq(b, c) { var k = c === 'w' ? 'K' : 'k'; return b.indexOf(k) }
  function inCheck(s, c) { var k = kingSq(s.b, c); return k >= 0 && attacked(s.b, k, c === 'w' ? 'b' : 'w') }

  function pseudo(s, capturesOnly) {
    var b = s.b, c = s.turn, ms = [], sq, p, r, f, i, d, rr, ff, t
    function add(from, to, flag) {
      var cap = b[to]
      if (capturesOnly && !cap && flag !== 'ep') return
      ms.push({ from: from, to: to, cap: flag === 'ep' ? (c === 'w' ? 'p' : 'P') : cap, flag: flag || null, piece: b[from] })
    }
    for (sq = 0; sq < 64; sq++) {
      p = b[sq]
      if (!p || colorOf(p) !== c) continue
      r = sq >> 3; f = sq & 7
      var lp = p.toLowerCase()
      if (lp === 'p') {
        var dir = c === 'w' ? -1 : 1, startRow = c === 'w' ? 6 : 1
        if (!capturesOnly && at(b, r + dir, f) === null) {
          add(sq, sq + dir * 8)
          if (r === startRow && at(b, r + 2 * dir, f) === null) add(sq, sq + dir * 16, 'double')
        }
        for (i = -1; i <= 1; i += 2) {
          t = at(b, r + dir, f + i)
          if (t && colorOf(t) !== c) add(sq, (r + dir) * 8 + f + i)
          else if (t === null && s.ep === (r + dir) * 8 + f + i) add(sq, s.ep, 'ep')
        }
      } else if (lp === 'n' || lp === 'k') {
        var set = lp === 'n' ? KN : KG
        for (i = 0; i < 8; i++) {
          rr = r + set[i][0]; ff = f + set[i][1]; t = at(b, rr, ff)
          if (t === undefined || (t && colorOf(t) === c)) continue
          add(sq, rr * 8 + ff)
        }
        if (lp === 'k' && !capturesOnly) castles(s, sq, add)
      } else {
        var dirs = lp === 'r' ? ROOK : lp === 'b' ? BISHOP : ROOK.concat(BISHOP)
        for (i = 0; i < dirs.length; i++) {
          d = dirs[i]; rr = r + d[0]; ff = f + d[1]
          while ((t = at(b, rr, ff)) !== undefined) {
            if (t && colorOf(t) === c) break
            add(sq, rr * 8 + ff)
            if (t) break
            rr += d[0]; ff += d[1]
          }
        }
      }
    }
    return ms
  }

  function castles(s, sq, add) {
    var b = s.b, c = s.turn, opp = c === 'w' ? 'b' : 'w', row = c === 'w' ? 7 : 0
    if (sq !== row * 8 + 4 || attacked(b, sq, opp)) return
    var kSide = c === 'w' ? 'K' : 'k', qSide = c === 'w' ? 'Q' : 'q', rook = c === 'w' ? 'R' : 'r'
    if (s.castle[kSide] && b[row * 8 + 7] === rook && !b[row * 8 + 5] && !b[row * 8 + 6] && !attacked(b, row * 8 + 5, opp) && !attacked(b, row * 8 + 6, opp)) add(sq, row * 8 + 6, 'castleK')
    if (s.castle[qSide] && b[row * 8] === rook && !b[row * 8 + 1] && !b[row * 8 + 2] && !b[row * 8 + 3] && !attacked(b, row * 8 + 3, opp) && !attacked(b, row * 8 + 2, opp)) add(sq, row * 8 + 2, 'castleQ')
  }

  function make(s, m) {
    var b = s.b.slice(), c = s.turn, p = b[m.from]
    var castle = { K: s.castle.K, Q: s.castle.Q, k: s.castle.k, q: s.castle.q }
    b[m.to] = p; b[m.from] = null
    if (m.flag === 'ep') b[m.to + (c === 'w' ? 8 : -8)] = null
    if (m.flag === 'castleK') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = null }
    if (m.flag === 'castleQ') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = null }
    var row = m.to >> 3
    if ((p === 'P' && row === 0) || (p === 'p' && row === 7)) { b[m.to] = c === 'w' ? 'Q' : 'q'; m.promo = true }
    if (p === 'K') { castle.K = castle.Q = false }
    if (p === 'k') { castle.k = castle.q = false }
    if (m.from === 63 || m.to === 63) castle.K = false
    if (m.from === 56 || m.to === 56) castle.Q = false
    if (m.from === 7 || m.to === 7) castle.k = false
    if (m.from === 0 || m.to === 0) castle.q = false
    return { b: b, turn: c === 'w' ? 'b' : 'w', castle: castle, ep: m.flag === 'double' ? (m.from + m.to) / 2 : -1,
      half: p.toLowerCase() === 'p' || m.cap ? 0 : s.half + 1, hist: s.hist, lastMove: m }
  }

  function legal(s) {
    return pseudo(s).filter(function (m) { var n = make(s, m); return !inCheck(n, s.turn) })
  }

  /* --------------------------------------------------------------- search */
  function evaluate(b) {
    var score = 0
    for (var sq = 0; sq < 64; sq++) {
      var p = b[sq]
      if (!p) continue
      var lp = p.toLowerCase(), r = sq >> 3, f = sq & 7, v = VAL[lp]
      if (lp === 'p') v += (white(p) ? 6 - r : r - 1) * 8 + CENTER[f] * 3
      else if (lp === 'n' || lp === 'b') v += (CENTER[r] + CENTER[f]) * 6
      else if (lp === 'q') v += (CENTER[r] + CENTER[f]) * 2
      else if (lp === 'k') v += (white(p) ? (r === 7 ? 10 : -10) : (r === 0 ? 10 : -10))
      score += white(p) ? v : -v
    }
    return score
  }

  function order(ms) {
    ms.forEach(function (m) { m.o = m.cap ? VAL[m.cap.toLowerCase()] * 10 - VAL[m.piece.toLowerCase()] : 0 })
    return ms.sort(function (a, b) { return b.o - a.o })
  }

  function quiesce(s, alpha, beta, depth) {
    var stand = evaluate(s.b) * (s.turn === 'w' ? 1 : -1)
    if (depth === 0 || stand >= beta) return stand
    if (stand > alpha) alpha = stand
    var ms = order(pseudo(s, true))
    for (var i = 0; i < ms.length; i++) {
      if (ms[i].cap && ms[i].cap.toLowerCase() === 'k') return 50000
      var v = -quiesce(make(s, ms[i]), -beta, -alpha, depth - 1)
      if (v >= beta) return v
      if (v > alpha) alpha = v
    }
    return alpha
  }

  function negamax(s, depth, alpha, beta, lvl) {
    var ms = legal(s)
    if (!ms.length) return inCheck(s, s.turn) ? -40000 - depth : 0
    if (depth === 0) return lvl.q ? quiesce(s, alpha, beta, 4) : evaluate(s.b) * (s.turn === 'w' ? 1 : -1)
    order(ms)
    var best = -Infinity
    for (var i = 0; i < ms.length; i++) {
      var v = -negamax(make(s, ms[i]), depth - 1, -beta, -alpha, lvl)
      if (v > best) best = v
      if (v > alpha) alpha = v
      if (alpha >= beta) break
    }
    return best
  }

  function botMove() {
    var lvl = LEVELS[level], ms = order(legal(G)), best = null, bestV = -Infinity
    for (var i = 0; i < ms.length; i++) {
      var v = -negamax(make(G, ms[i]), lvl.depth - 1, -Infinity, Infinity, lvl) + (lvl.noise ? CV.rand(-lvl.noise, lvl.noise) : 0)
      if (v > bestV) { bestV = v; best = ms[i] }
    }
    return best
  }

  /* ----------------------------------------------------------------- game */
  function newGame() { G = startPos(); sel = null; targets = []; last = null; thinking = false; paint() }

  function winsKey() { return ID + ':wins:' + LEVELS[level].name }
  function paint() {
    lvlBtn.textContent = LEVELS[level].name
    hud.set('w', String(CV.load(winsKey(), 0)))
    hud.set('st', thinking ? 'Thinking...' : G.turn === 'w' ? (inCheck(G, 'w') ? 'Check!' : 'Your move') : 'Bot')
  }

  function play(m) {
    var prev = G
    G = make(G, m)
    G.hist = prev.hist.concat([prev])
    last = m; sel = null; targets = []
    CV.beep(m.cap ? 300 : 520, 0.06, m.cap ? 'square' : 'triangle', 0.045)
    if (inCheck(G, G.turn)) CV.beep(880, 0.09, 'triangle', 0.04)
    paint()
    return checkEnd()
  }

  function insufficient(b) {
    var rest = b.filter(function (p) { return p && p.toLowerCase() !== 'k' })
    return !rest.length || (rest.length === 1 && 'nNbB'.indexOf(rest[0]) >= 0)
  }

  function checkEnd() {
    var ms = legal(G), title = null, body = ''
    if (!ms.length) {
      if (inCheck(G, G.turn)) {
        if (G.turn === 'b') { title = 'Checkmate - you win!'; CV.save(winsKey(), Number(CV.load(winsKey(), 0)) + 1); CV.chord([523, 659, 784, 1047], 90) }
        else { title = 'Checkmate'; body = 'The bot got you this time. Watch for undefended pieces and checks you can block.'; CV.chord([392, 311, 262], 120) }
      } else { title = 'Stalemate - draw'; body = 'No legal moves but not in check. When you are winning, leave the enemy king a square to move to.' }
    } else if (insufficient(G.b)) title = 'Draw - not enough pieces'
    else if (G.half >= 100) title = 'Draw - 50-move rule'
    if (!title) return false
    playing = false; paint()
    setTimeout(function () {
      over.show({ title: title, body: body || 'Wins against the ' + LEVELS[level].name + ' bot: ' + CV.load(winsKey(), 0) + '. Change level from the top bar.', button: 'New game', onStart: function () { newGame(); playing = true } })
    }, 600)
    return true
  }

  function botTurn() {
    thinking = true; paint()
    setTimeout(function () {
      var m = botMove()
      thinking = false
      if (m) play(m)
      paint()
    }, 250)
  }

  /* ---------------------------------------------------------------- input */
  function layout() {
    var top = 54, pad = 10
    L.size = Math.floor(Math.min(view.w - pad * 2, view.h - top - pad) / 8) * 8
    L.sq = L.size / 8
    L.x = Math.floor((view.w - L.size) / 2); L.y = top + Math.floor((view.h - top - pad - L.size) / 2)
  }
  view.onResize = layout

  CV.pointer(view.c, {
    down: function (pt) {
      if (!playing || thinking || G.turn !== 'w') return
      var f = Math.floor((pt.x - L.x) / L.sq), r = Math.floor((pt.y - L.y) / L.sq)
      if (f < 0 || f > 7 || r < 0 || r > 7) return
      var sq = r * 8 + f
      var mv = targets.filter(function (m) { return m.to === sq })[0]
      if (mv) { if (!play(mv)) botTurn(); return }
      if (G.b[sq] && white(G.b[sq])) {
        sel = sq; targets = legal(G).filter(function (m) { return m.from === sq })
        CV.beep(660, 0.03, 'sine', 0.03)
      } else { sel = null; targets = [] }
    }
  })

  function render() {
    var w = view.w, h = view.h, s = L.sq, r, f
    ctx.fillStyle = '#141829'; ctx.fillRect(0, 0, w, h)
    var checkSq = inCheck(G, G.turn) ? kingSq(G.b, G.turn) : -1
    for (r = 0; r < 8; r++) for (f = 0; f < 8; f++) {
      var sq = r * 8 + f, x = L.x + f * s, y = L.y + r * s
      ctx.fillStyle = (r + f) % 2 ? '#7486b8' : '#e6eaf4'
      ctx.fillRect(x, y, s, s)
      if (last && (last.from === sq || last.to === sq)) { ctx.fillStyle = 'rgba(255,214,77,.45)'; ctx.fillRect(x, y, s, s) }
      if (sel === sq) { ctx.fillStyle = 'rgba(63,193,242,.55)'; ctx.fillRect(x, y, s, s) }
      if (checkSq === sq) { var g = ctx.createRadialGradient(x + s / 2, y + s / 2, 2, x + s / 2, y + s / 2, s * 0.7); g.addColorStop(0, 'rgba(255,60,80,.95)'); g.addColorStop(1, 'rgba(255,60,80,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, s, s) }
      if (r === 7) { ctx.fillStyle = (r + f) % 2 ? '#e6eaf4' : '#7486b8'; ctx.font = '700 ' + Math.round(s * 0.18) + 'px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('abcdefgh'[f], x + s - 3, y + s - 2) }
      if (f === 0) { ctx.fillStyle = (r + f) % 2 ? '#e6eaf4' : '#7486b8'; ctx.font = '700 ' + Math.round(s * 0.18) + 'px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(String(8 - r), x + 3, y + 2) }
      var p = G.b[sq]
      if (p) {
        ctx.font = Math.round(s * 0.8) + 'px "Segoe UI Symbol", "DejaVu Sans", "Noto Sans Symbols 2", serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        var glyph = GLYPH[p.toLowerCase()] + '︎'
        ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.lineJoin = 'round'
        ctx.strokeStyle = white(p) ? '#1d2133' : '#f4f5f9'
        ctx.strokeText(glyph, x + s / 2, y + s * 0.54)
        ctx.fillStyle = white(p) ? '#ffffff' : '#1d2133'
        ctx.fillText(glyph, x + s / 2, y + s * 0.54)
      }
    }
    targets.forEach(function (m) {
      var x = L.x + (m.to & 7) * s + s / 2, y = L.y + (m.to >> 3) * s + s / 2
      ctx.fillStyle = 'rgba(20,24,41,.35)'
      ctx.beginPath()
      if (G.b[m.to] || m.flag === 'ep') { ctx.arc(x, y, s * 0.46, 0, 7); ctx.arc(x, y, s * 0.36, 0, 7, true) } else ctx.arc(x, y, s * 0.15, 0, 7)
      ctx.fill()
    })
    undoBtn.disabled = thinking || !G.hist.length
  }

  newGame(); layout()
  CV.loop(function () { render() })
  over.show({ title: 'Checkmate Chess', body: 'You play White against the computer. Tap a piece to see its moves, then tap a highlighted square. Pawns promote to a queen. Pick Easy, Normal or Hard from the top bar.',
    controls: [['Tap piece', 'select'], ['Tap square', 'move'], ['Undo', 'take back']], button: 'Play White', onStart: function () { playing = true } })
})(window.CV)
