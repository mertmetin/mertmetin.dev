import { Controller } from "@hotwired/stimulus"
import RabbitEnv, { SENSOR_LABELS, STATE_COUNT, FEATURE_COUNT } from "games/rabbit_env"
import RabbitBoard from "games/rabbit_board"
import QAgent from "games/q_agent"
import DQNAgent from "games/dqn_agent"

// The AI lab: an agent teaches itself Rabbit Run in the browser, with one of
// two brains: a Q-table over 11 yes/no sensors, or a neural network (DQN)
// over 41 inputs that include a view around the head and open space ahead.
// Watch speed shows every step; Fast and Turbo run many steps per frame and
// draw only the latest position.
const SPEEDS = { watch: 1, fast: 40, turbo: 600 }
const ACTIONS = ["straight", "right", "left"]
const WINDOW = 20 // runs in the moving average

export default class extends Controller {
  static targets = ["board", "curve", "sensors", "qvalues", "toggle", "episode", "average", "best", "epsilon", "seen",
                    "alpha", "alphaOut", "gamma", "gammaOut", "speed", "status", "brain", "seenLabel"]

  connect() {
    this.board = new RabbitBoard(this.boardTarget)
    this.speed = "watch"
    this.brain = "table"
    this.reset()
    this.observer = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; if (!this.visible) this.pause() })
    this.observer.observe(this.element)
    this.onResize = () => { this.board.resize(); this.drawAll() }
    window.addEventListener("resize", this.onResize)
  }

  disconnect() {
    this.pause()
    this.observer?.disconnect()
    window.removeEventListener("resize", this.onResize)
  }

  // ---------------------------------------------------------------- controls

  reset() {
    this.pause()
    this.env = new RabbitEnv()
    const alpha = Number(this.alphaTarget.value)
    const gamma = Number(this.gammaTarget.value)
    this.agent = this.brain === "table"
      ? new QAgent({ states: STATE_COUNT, alpha, gamma })
      : new DQNAgent({ inputs: FEATURE_COUNT, learningRate: alpha / 100, gamma })
    this.scores = []
    this.best = 0
    this.lastAction = 0
    this.renderSensors(true)
    this.updateStats()
    this.drawAll()
    this.statusTarget.textContent = "Untrained: it knows nothing yet. Press Train."
  }

  toggle() {
    this.running ? this.pause() : this.play()
  }

  play() {
    if (this.running) return
    this.running = true
    this.toggleTarget.textContent = "❚❚ Pause"
    this.toggleTarget.setAttribute("aria-pressed", "true")
    this.last = performance.now()
    this.acc = 0
    this.frame = requestAnimationFrame((t) => this.loop(t))
  }

  pause() {
    this.running = false
    cancelAnimationFrame(this.frame)
    if (this.hasToggleTarget) {
      this.toggleTarget.textContent = this.scores?.length ? "▶ Resume" : "▶ Train"
      this.toggleTarget.setAttribute("aria-pressed", "false")
    }
  }

  setBrain(event) {
    this.brain = event.currentTarget.dataset.brain
    this.brainTargets.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.brain === this.brain)))
    this.reset()
  }

  // What the current brain sees: a state number for the table, a feature
  // vector for the network.
  observe() {
    return this.brain === "table" ? this.env.state() : this.env.features()
  }

  setSpeed(event) {
    this.speed = event.currentTarget.dataset.speed
    this.speedTargets.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.speed === this.speed)))
  }

  tune() {
    const alpha = Number(this.alphaTarget.value)
    this.agent.alpha = alpha
    this.agent.gamma = Number(this.gammaTarget.value)
    this.alphaOutTarget.textContent = alpha.toFixed(2)
    this.gammaOutTarget.textContent = this.agent.gamma.toFixed(2)
  }

  // ---------------------------------------------------------------- training

  loop(now) {
    if (!this.running) return
    const budget = SPEEDS[this.speed]
    if (budget === 1) {
      // Watch: about 16 moves a second.
      this.acc += now - this.last
      while (this.acc >= 60) { this.acc -= 60; this.step() }
    } else {
      const deadline = performance.now() + 10
      let n = 0
      while (n < budget && performance.now() < deadline) { this.step(); n++ }
    }
    this.last = now
    this.board.draw(this.env)
    this.renderSensors()
    this.frame = requestAnimationFrame((t) => this.loop(t))
  }

  step() {
    const state = this.observe()
    const action = this.agent.act(state)
    const { reward, done } = this.env.step(this.env.dirFor(action))
    this.agent.learn(state, action, reward, this.observe(), done)
    this.lastAction = action
    if (done) this.endEpisode()
  }

  endEpisode() {
    this.scores.push(this.env.score)
    this.best = Math.max(this.best, this.env.score)
    this.agent.endEpisode()
    this.env.reset()
    // Stats and the curve are cheap; refresh them after every run.
    this.updateStats()
    this.drawCurve()
  }

  updateStats() {
    const recent = this.scores.slice(-WINDOW)
    const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0
    this.episodeTarget.textContent = String(this.scores.length)
    this.averageTarget.textContent = avg.toFixed(1)
    this.bestTarget.textContent = String(this.best)
    this.epsilonTarget.textContent = `${Math.round(this.agent.epsilon * 100)}%`
    if (this.brain === "table") {
      this.seenLabelTarget.textContent = "situations seen"
      this.seenTarget.textContent = `${this.agent.statesSeen} of ${STATE_COUNT}`
    } else {
      this.seenLabelTarget.textContent = "network 41→64→3"
      this.seenTarget.textContent = `${this.agent.net.parameterCount.toLocaleString()} weights · loss ${this.agent.loss.toFixed(2)}`
    }
    if (this.scores.length) this.statusTarget.textContent = this.verdict(avg)
  }

  verdict(avg) {
    if (avg < 0.5) return "Crashing into walls a lot. It's learning what hurts."
    if (avg < 3) return "Starting to chase groceries."
    if (avg < 10) return "Getting the hang of it."
    const watchHint = this.speed === "watch" ? "" : " Switch to Watch to see it play."
    if (avg < 18) return `Better than most first-time human players.${watchHint}`
    if (avg < 30) return `Senior rabbit. 🐇${watchHint}`
    return `Staff-level rabbit. It sees traps coming. 🐇✨${watchHint}`
  }

  // ---------------------------------------------------------------- drawing

  drawAll() {
    this.board.draw(this.env)
    this.drawCurve()
  }

  renderSensors(initial = false) {
    const on = this.env.sensors()
    if (initial || !this.sensorEls) {
      this.sensorsTarget.replaceChildren()
      this.sensorEls = SENSOR_LABELS.map((label) => {
        const li = document.createElement("li")
        li.className = "flex items-center gap-2"
        const dot = document.createElement("span")
        dot.className = "size-2.5 shrink-0 rounded-full border border-line"
        const text = document.createElement("span")
        text.textContent = label
        li.append(dot, text)
        this.sensorsTarget.append(li)
        return { li, dot }
      })
      this.qEls = ACTIONS.map((name) => {
        const row = document.createElement("div")
        row.className = "grid grid-cols-[4.5rem_1fr_3rem] items-center gap-2"
        const label = document.createElement("span")
        label.textContent = name
        const track = document.createElement("span")
        track.className = "relative h-2 overflow-hidden rounded-full bg-tint"
        const bar = document.createElement("span")
        bar.className = "absolute inset-y-0 left-0 rounded-full"
        track.append(bar)
        const value = document.createElement("span")
        value.className = "text-right tabular-nums"
        row.append(label, track, value)
        this.qvaluesTarget.append(row)
        return { row, bar, value }
      })
    }
    on.forEach((active, i) => {
      const { li, dot } = this.sensorEls[i]
      const danger = i < 3
      dot.style.background = active ? (danger ? "#f85149" : "var(--color-accent)") : "transparent"
      dot.style.borderColor = active ? "transparent" : ""
      li.classList.toggle("text-ink", active)
      li.classList.toggle("text-ink-3", !active)
    })

    const obs = this.observe()
    const q = this.agent.values(obs)
    const best = this.agent.best(obs)
    const scale = Math.max(1, ...q.map(Math.abs))
    q.forEach((v, i) => {
      const { row, bar, value } = this.qEls[i]
      bar.style.width = `${Math.min(100, (Math.abs(v) / scale) * 100)}%`
      bar.style.background = v < 0 ? "#f85149" : "var(--color-accent)"
      value.textContent = v.toFixed(1)
      row.classList.toggle("text-ink", i === best)
      row.classList.toggle("text-ink-3", i !== best)
    })
  }

  // Score per run (faint dots) and the moving average (line).
  drawCurve() {
    const canvas = this.curveTarget
    const ratio = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * ratio
    canvas.height = h * ratio
    const ctx = canvas.getContext("2d")
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    const css = getComputedStyle(document.documentElement)
    const color = (n) => css.getPropertyValue(n).trim()
    ctx.clearRect(0, 0, w, h)

    const pad = { l: 28, r: 8, t: 8, b: 18 }
    const n = this.scores.length
    const maxY = Math.max(10, ...this.scores) * 1.1
    const maxX = Math.max(50, n)
    const x = (i) => pad.l + (i / maxX) * (w - pad.l - pad.r)
    const y = (v) => h - pad.b - (v / maxY) * (h - pad.t - pad.b)

    ctx.strokeStyle = color("--color-line")
    ctx.fillStyle = color("--color-ink-3")
    ctx.font = "10px ui-monospace, Menlo, monospace"
    ctx.textAlign = "right"
    ctx.textBaseline = "middle"
    ctx.lineWidth = 1
    for (const t of [0, Math.round(maxY / 2), Math.round(maxY / 1.1)]) {
      ctx.beginPath(); ctx.moveTo(pad.l, Math.round(y(t)) + 0.5); ctx.lineTo(w - pad.r, Math.round(y(t)) + 0.5); ctx.stroke()
      ctx.fillText(String(t), pad.l - 6, y(t))
    }
    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"
    ctx.fillText(n ? `${n} runs` : "runs", pad.l, h - 4)

    if (!n) return
    const accent = color("--color-accent")
    ctx.fillStyle = accent
    ctx.globalAlpha = 0.25
    const step = Math.max(1, Math.floor(n / 600))
    for (let i = 0; i < n; i += step) ctx.fillRect(x(i) - 1, y(this.scores[i]) - 1, 2, 2)
    ctx.globalAlpha = 1

    ctx.strokeStyle = accent
    ctx.lineWidth = 2
    ctx.lineJoin = "round"
    ctx.beginPath()
    let sum = 0
    for (let i = 0; i < n; i++) {
      sum += this.scores[i]
      if (i >= WINDOW) sum -= this.scores[i - WINDOW]
      const avg = sum / Math.min(i + 1, WINDOW)
      i === 0 ? ctx.moveTo(x(i), y(avg)) : ctx.lineTo(x(i), y(avg))
    }
    ctx.stroke()
  }
}

