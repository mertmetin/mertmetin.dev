// Rabbit Run: steer the delivery rabbit around the city grid, pick up
// groceries, and don't run into the walls or your own trail of bags.
//
//   const game = new RabbitRun(canvas, { onEnd: (score) => ... })
//   game.start(); game.turn("up"); game.stop()

const COLS = 24
const ROWS = 14
const ITEMS = ["🥕", "🥦", "🍎", "🧀", "🥖", "🥚", "🍌", "🥛"]
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" }

export default class RabbitRun {
  constructor(canvas, { onEnd = () => {}, onScore = () => {} } = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
    this.onEnd = onEnd
    this.onScore = onScore
    this.colors = this.readColors()
    this.resize()
  }

  readColors() {
    const css = getComputedStyle(document.documentElement)
    const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback
    return {
      bg: v("--color-card", "#11161d"),
      grid: v("--color-line", "#262e39"),
      rabbit: v("--color-ink", "#e6edf3"),
      trail: v("--color-accent", "#3fb950"),
      text: v("--color-ink-3", "#8b949e"),
    }
  }

  resize() {
    const ratio = window.devicePixelRatio || 1
    const width = this.canvas.clientWidth
    this.cell = Math.floor(width / COLS)
    const w = this.cell * COLS
    const h = this.cell * ROWS
    this.canvas.style.height = `${h}px`
    this.canvas.width = w * ratio
    this.canvas.height = h * ratio
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  }

  start() {
    const mid = Math.floor(ROWS / 2)
    this.body = [[6, mid], [5, mid], [4, mid]]
    this.dir = "right"
    this.queue = []
    this.score = 0
    this.tickMs = 150
    this.running = true
    this.waiting = true // nothing moves until the first arrow key or swipe
    this.placeItem()
    this.draw()
  }

  stop() {
    this.running = false
    clearTimeout(this.timer)
  }

  // Queue turns so two quick key presses between ticks both count.
  turn(dir) {
    if (!this.running || !DIRS[dir]) return
    if (this.waiting) {
      this.waiting = false
      if (dir !== OPPOSITE[this.dir]) this.dir = dir
      this.draw()
      this.schedule()
      return
    }
    const last = this.queue.at(-1) ?? this.dir
    if (dir !== last && dir !== OPPOSITE[last] && this.queue.length < 3) this.queue.push(dir)
  }

  schedule() {
    this.timer = setTimeout(() => this.tick(), this.tickMs)
  }

  placeItem() {
    const taken = new Set(this.body.map(([x, y]) => `${x},${y}`))
    let x, y
    do {
      x = Math.floor(Math.random() * COLS)
      y = Math.floor(Math.random() * ROWS)
    } while (taken.has(`${x},${y}`))
    this.item = { x, y, emoji: ITEMS[Math.floor(Math.random() * ITEMS.length)] }
  }

  tick() {
    if (!this.running) return
    if (this.queue.length) this.dir = this.queue.shift()
    const [dx, dy] = DIRS[this.dir]
    const [hx, hy] = this.body[0]
    const head = [hx + dx, hy + dy]

    const hitWall = head[0] < 0 || head[1] < 0 || head[0] >= COLS || head[1] >= ROWS
    const hitSelf = this.body.slice(0, -1).some(([x, y]) => x === head[0] && y === head[1])
    if (hitWall || hitSelf) return this.end()

    this.body.unshift(head)
    if (head[0] === this.item.x && head[1] === this.item.y) {
      this.score += 1
      this.onScore(this.score)
      this.tickMs = Math.max(70, this.tickMs - 4)
      this.placeItem()
    } else {
      this.body.pop()
    }
    this.draw()
    this.schedule()
  }

  end() {
    this.stop()
    this.draw(true)
    this.onEnd(this.score)
  }

  draw(over = false) {
    const { ctx, cell, colors } = this
    const w = cell * COLS
    const h = cell * ROWS
    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, w, h)

    // City blocks: a faint grid.
    ctx.strokeStyle = colors.grid
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= COLS; x++) { ctx.moveTo(x * cell + 0.5, 0); ctx.lineTo(x * cell + 0.5, h) }
    for (let y = 0; y <= ROWS; y++) { ctx.moveTo(0, y * cell + 0.5); ctx.lineTo(w, y * cell + 0.5) }
    ctx.stroke()

    // Grocery to pick up.
    ctx.font = `${Math.floor(cell * 0.8)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(this.item.emoji, this.item.x * cell + cell / 2, this.item.y * cell + cell / 2 + 1)

    // Trail of delivery bags, then the rabbit.
    this.body.slice(1).forEach(([x, y], i) => {
      ctx.globalAlpha = Math.max(0.35, 1 - i * 0.04)
      ctx.fillStyle = colors.trail
      this.roundRect(x * cell + 3, y * cell + 3, cell - 6, cell - 6, 4)
    })
    ctx.globalAlpha = 1
    this.drawRabbit(this.body[0])

    if (over || this.waiting) {
      ctx.fillStyle = "rgba(0,0,0,0.55)"
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = "#fff"
      ctx.font = `600 ${Math.floor(cell * 1.0)}px ui-monospace, Menlo, monospace`
      const touch = matchMedia("(pointer: coarse)").matches
      const message = over ? `delivered: ${this.score}` : touch ? "swipe to start" : "press an arrow key to start"
      ctx.fillText(message, w / 2, h / 2)
    }
  }

  // A small rabbit head: face, two ears pointing the way it's going.
  drawRabbit([x, y]) {
    const { ctx, cell, colors } = this
    const cx = x * cell + cell / 2
    const cy = y * cell + cell / 2
    const [dx, dy] = DIRS[this.dir]
    ctx.fillStyle = colors.rabbit
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.translate(cx + dx * cell * 0.28 + -dy * side * cell * 0.16, cy + dy * cell * 0.28 + dx * side * cell * 0.16)
      ctx.rotate(Math.atan2(dy, dx) + Math.PI / 2)
      ctx.beginPath()
      ctx.ellipse(0, 0, cell * 0.11, cell * 0.3, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.beginPath()
    ctx.arc(cx - dx * cell * 0.05, cy - dy * cell * 0.05, cell * 0.36, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = colors.bg
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(cx + dx * cell * 0.1 + -dy * side * cell * 0.13, cy + dy * cell * 0.1 + dx * side * cell * 0.13, cell * 0.05, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  roundRect(x, y, w, h, r) {
    const { ctx } = this
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    ctx.fill()
  }
}
