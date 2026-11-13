// Deep Q-Network: the same idea as the Q-table, but a neural network
// estimates how good each move is, so similar situations share what was
// learned. Standard DQN pieces:
//   * experience replay: learn from random past moves, not just the last one
//   * target network: a slowly-updated copy gives stable learning targets
//   * Huber-style clipping of the error so one surprise can't blow up the weights
import MLP from "games/nn"

export default class DQNAgent {
  constructor({
    inputs, actions = 3, hidden = 64, learningRate = 0.001, gamma = 0.95,
    epsilon = 1, epsilonMin = 0.002, epsilonDecay = 0.985,
    batchSize = 32, memory = 20000, targetEvery = 500, trainEvery = 2, random = Math.random,
  } = {}) {
    Object.assign(this, { inputs, actions, gamma, epsilon, epsilonMin, epsilonDecay, batchSize, targetEvery, trainEvery, random })
    this.net = new MLP([inputs, hidden, actions], { learningRate, random })
    this.target = new MLP([inputs, hidden, actions], { random })
    this.target.copyFrom(this.net)
    this.capacity = memory
    this.buffer = []
    this.cursor = 0
    this.steps = 0
    this.loss = 0
  }

  get alpha() { return this.net.lr }
  set alpha(v) { this.net.lr = v / 100 } // the lab's slider range, scaled for Adam

  values(features) {
    return Array.from(this.net.predict(features))
  }

  best(features) {
    const v = this.net.predict(features)
    let a = 0
    for (let i = 1; i < v.length; i++) if (v[i] > v[a]) a = i
    return a
  }

  act(features, { explore = true } = {}) {
    if (explore && this.random() < this.epsilon) return Math.floor(this.random() * this.actions)
    return this.best(features)
  }

  remember(s, a, r, s2, done) {
    const item = [s, a, r, s2, done]
    if (this.buffer.length < this.capacity) this.buffer.push(item)
    else this.buffer[this.cursor] = item
    this.cursor = (this.cursor + 1) % this.capacity
  }

  learn(s, a, r, s2, done) {
    this.remember(s, a, r, s2, done)
    this.steps += 1
    if (this.steps % this.trainEvery === 0 && this.buffer.length >= this.batchSize * 4) this.trainBatch()
    if (this.steps % this.targetEvery === 0) this.target.copyFrom(this.net)
  }

  trainBatch() {
    let loss = 0
    for (let k = 0; k < this.batchSize; k++) {
      const [s, a, r, s2, done] = this.buffer[Math.floor(this.random() * this.buffer.length)]
      const acts = this.net.forward(s)
      const q = acts.at(-1)
      const future = done ? 0 : Math.max(...this.target.predict(s2))
      const error = q[a] - (r + this.gamma * future)
      const clipped = Math.max(-1, Math.min(1, error))
      const grad = new Float32Array(this.actions)
      grad[a] = clipped
      this.net.backward(acts, grad)
      loss += Math.abs(error) < 1 ? 0.5 * error * error : Math.abs(error) - 0.5
    }
    this.net.step(this.batchSize)
    this.loss = 0.98 * this.loss + 0.02 * (loss / this.batchSize)
  }

  endEpisode() {
    this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay)
  }
}
