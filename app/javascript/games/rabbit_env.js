// Rabbit Run rules with no drawing, so a person and an AI agent play the
// exact same game. The rabbit moves one cell per step; groceries make the
// trail longer; walls and the trail end the run.

export const COLS = 24
export const ROWS = 14
export const ITEMS = ["🥕", "🥦", "🍎", "🧀", "🥖", "🥚", "🍌", "🥛"]
export const DIRS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }
export const CLOCKWISE = ["up", "right", "down", "left"]
const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" }

export const REWARD = { food: 10, crash: -10, step: 0 }

export default class RabbitEnv {
  constructor({ random = Math.random } = {}) {
    this.random = random
    this.reset()
  }

  reset() {
    const mid = Math.floor(ROWS / 2)
    this.body = [[6, mid], [5, mid], [4, mid]]
    this.dir = "right"
    this.score = 0
    this.steps = 0
    this.hungry = 0 // steps since the last grocery
    this.alive = true
    this.cause = null
    this.placeItem()
    return this
  }

  placeItem() {
    const taken = new Set(this.body.map(([x, y]) => `${x},${y}`))
    let x, y
    do {
      x = Math.floor(this.random() * COLS)
      y = Math.floor(this.random() * ROWS)
    } while (taken.has(`${x},${y}`))
    this.item = { x, y, emoji: ITEMS[Math.floor(this.random() * ITEMS.length)] }
  }

  canTurn(dir) {
    return Boolean(DIRS[dir]) && dir !== OPPOSITE[this.dir]
  }

  // Relative actions for the agent: 0 = straight, 1 = turn right, 2 = turn left.
  dirFor(action) {
    const i = CLOCKWISE.indexOf(this.dir)
    return action === 1 ? CLOCKWISE[(i + 1) % 4] : action === 2 ? CLOCKWISE[(i + 3) % 4] : this.dir
  }

  blocked([x, y]) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true
    // The tail cell moves away this step, so it isn't an obstacle.
    return this.body.slice(0, -1).some(([bx, by]) => bx === x && by === y)
  }

  ahead(dir) {
    const [dx, dy] = DIRS[dir]
    const [hx, hy] = this.body[0]
    return [hx + dx, hy + dy]
  }

  // Advance one cell. Returns { reward, done, ate }.
  step(dir = this.dir) {
    if (!this.alive) return { reward: 0, done: true, ate: false }
    if (this.canTurn(dir)) this.dir = dir
    const head = this.ahead(this.dir)
    this.steps += 1
    this.hungry += 1

    // Starving ends a run too, so an agent can't circle forever.
    if (this.blocked(head) || this.hungry > 100 + this.body.length * 4) {
      this.alive = false
      this.cause = this.blocked(head) ? "crash" : "starved"
      return { reward: REWARD.crash, done: true, ate: false }
    }

    this.body.unshift(head)
    if (head[0] === this.item.x && head[1] === this.item.y) {
      this.score += 1
      this.hungry = 0
      this.placeItem()
      return { reward: REWARD.food, done: false, ate: true }
    }
    this.body.pop()
    return { reward: REWARD.step, done: false, ate: false }
  }

  // What the agent senses: 11 yes/no signals, packed into one number.
  //   danger straight / right / left
  //   facing up / right / down / left
  //   grocery is up / right / down / left of the head
  sensors() {
    const [hx, hy] = this.body[0]
    const { x: fx, y: fy } = this.item
    return [
      this.blocked(this.ahead(this.dirFor(0))),
      this.blocked(this.ahead(this.dirFor(1))),
      this.blocked(this.ahead(this.dirFor(2))),
      this.dir === "up", this.dir === "right", this.dir === "down", this.dir === "left",
      fy < hy, fx > hx, fy > hy, fx < hx,
    ]
  }

  state() {
    return this.sensors().reduce((acc, on, i) => acc | ((on ? 1 : 0) << i), 0)
  }
}

export const SENSOR_LABELS = [
  "danger ahead", "danger right", "danger left",
  "facing up", "facing right", "facing down", "facing left",
  "food up", "food right", "food down", "food left",
]
export const STATE_COUNT = 1 << SENSOR_LABELS.length
