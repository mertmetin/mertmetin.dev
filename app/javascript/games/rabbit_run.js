// Rabbit Run for people: steer with arrows / WASD / swipes.
//
//   const game = new RabbitRun(canvas, { onEnd: (score) => ..., onScore })
//   game.start(); game.turn("up"); game.stop()
import RabbitEnv from "games/rabbit_env"
import RabbitBoard from "games/rabbit_board"

export default class RabbitRun {
  constructor(canvas, { onEnd = () => {}, onScore = () => {} } = {}) {
    this.board = new RabbitBoard(canvas)
    this.onEnd = onEnd
    this.onScore = onScore
  }

  get score() { return this.env?.score ?? 0 }

  resize() {
    this.board.resize()
    if (this.env) this.render()
  }

  start() {
    this.env = new RabbitEnv()
    this.queue = []
    this.tickMs = 150
    this.running = true
    this.waiting = true // nothing moves until the first arrow key or swipe
    this.render()
  }

  stop() {
    this.running = false
    clearTimeout(this.timer)
  }

  // Queue turns so two quick key presses between ticks both count.
  turn(dir) {
    if (!this.running) return
    if (this.waiting) {
      this.waiting = false
      this.queue = [dir]
      this.render()
      this.schedule()
      return
    }
    const last = this.queue.at(-1) ?? this.env.dir
    if (dir !== last && this.queue.length < 3) this.queue.push(dir)
  }

  schedule() {
    this.timer = setTimeout(() => this.tick(), this.tickMs)
  }

  tick() {
    if (!this.running) return
    const { done, ate } = this.env.step(this.queue.shift() ?? this.env.dir)
    if (done) return this.end()
    if (ate) {
      this.onScore(this.env.score)
      this.tickMs = Math.max(70, this.tickMs - 4)
    }
    this.render()
    this.schedule()
  }

  render() {
    const touch = matchMedia("(pointer: coarse)").matches
    const overlay = this.waiting ? (touch ? "swipe to start" : "press an arrow key to start") : null
    this.board.draw(this.env, overlay)
  }

  end() {
    this.stop()
    this.board.draw(this.env, `delivered: ${this.env.score}`)
    this.onEnd(this.env.score)
  }
}
