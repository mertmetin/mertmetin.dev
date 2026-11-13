// Draws a RabbitEnv onto a canvas. Shared by the human game and the AI lab.
import { COLS, ROWS, DIRS } from "games/rabbit_env"

export default class RabbitBoard {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
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
    }
  }

  resize() {
    const ratio = window.devicePixelRatio || 1
    this.cell = Math.max(8, Math.floor(this.canvas.clientWidth / COLS))
    const w = this.cell * COLS
    const h = this.cell * ROWS
    this.canvas.style.height = `${h}px`
    this.canvas.width = w * ratio
    this.canvas.height = h * ratio
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  }

  draw(env, overlay = null) {
    const { ctx, cell, colors } = this
    const w = cell * COLS
    const h = cell * ROWS
    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = colors.grid
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= COLS; x++) { ctx.moveTo(x * cell + 0.5, 0); ctx.lineTo(x * cell + 0.5, h) }
    for (let y = 0; y <= ROWS; y++) { ctx.moveTo(0, y * cell + 0.5); ctx.lineTo(w, y * cell + 0.5) }
    ctx.stroke()

    ctx.font = `${Math.floor(cell * 0.8)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(env.item.emoji, env.item.x * cell + cell / 2, env.item.y * cell + cell / 2 + 1)

    env.body.slice(1).forEach(([x, y], i) => {
      ctx.globalAlpha = Math.max(0.35, 1 - i * 0.04)
      ctx.fillStyle = colors.trail
      ctx.beginPath()
      ctx.roundRect(x * cell + 3, y * cell + 3, cell - 6, cell - 6, 4)
      ctx.fill()
    })
    ctx.globalAlpha = 1
    this.drawRabbit(env.body[0], env.dir)

    if (overlay) {
      ctx.fillStyle = "rgba(0,0,0,0.55)"
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = "#fff"
      ctx.font = `600 ${Math.floor(cell * 1.0)}px ui-monospace, Menlo, monospace`
      ctx.fillText(overlay, w / 2, h / 2)
    }
  }

  // A small rabbit head: face, two ears pointing the way it's going.
  drawRabbit([x, y], dir) {
    const { ctx, cell, colors } = this
    const cx = x * cell + cell / 2
    const cy = y * cell + cell / 2
    const [dx, dy] = DIRS[dir]
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
}
