// Tabular Q-learning. The agent keeps a score Q(state, action) for how good
// each move is in each situation, and nudges it after every step:
//
//   Q(s, a) ← Q(s, a) + α · (reward + γ · max Q(s', ·) − Q(s, a))
//
// It explores with probability ε (a random move) and otherwise picks the
// move it currently rates best. ε shrinks after every run.

export default class QAgent {
  constructor({ states, actions = 3, alpha = 0.1, gamma = 0.9, epsilon = 1, epsilonMin = 0.01, epsilonDecay = 0.98, random = Math.random } = {}) {
    Object.assign(this, { states, actions, alpha, gamma, epsilon, epsilonMin, epsilonDecay, random })
    this.q = new Float32Array(states * actions)
    this.visited = new Uint8Array(states)
  }

  values(state) {
    return Array.from(this.q.subarray(state * this.actions, (state + 1) * this.actions))
  }

  best(state) {
    const v = this.values(state)
    let a = 0
    for (let i = 1; i < v.length; i++) if (v[i] > v[a]) a = i
    return a
  }

  act(state, { explore = true } = {}) {
    if (explore && this.random() < this.epsilon) return Math.floor(this.random() * this.actions)
    return this.best(state)
  }

  learn(state, action, reward, next, done) {
    this.visited[state] = 1
    const i = state * this.actions + action
    const future = done ? 0 : Math.max(...this.values(next))
    this.q[i] += this.alpha * (reward + this.gamma * future - this.q[i])
  }

  endEpisode() {
    this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay)
  }

  get statesSeen() {
    return this.visited.reduce((n, v) => n + v, 0)
  }
}
