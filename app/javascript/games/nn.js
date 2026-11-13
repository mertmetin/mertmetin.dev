// A small fully-connected neural network, written from scratch:
// input → hidden (ReLU) → output (linear), trained with backpropagation and
// the Adam optimizer. Everything is plain Float32Arrays; no libraries.

export default class MLP {
  constructor(sizes, { learningRate = 0.001, random = Math.random } = {}) {
    this.sizes = sizes
    this.lr = learningRate
    this.random = random
    this.layers = []
    for (let l = 0; l < sizes.length - 1; l++) {
      const n = sizes[l]
      const m = sizes[l + 1]
      // He initialisation keeps ReLU activations from dying or exploding.
      const scale = Math.sqrt(2 / n)
      const w = new Float32Array(n * m).map(() => this.gaussian() * scale)
      this.layers.push({
        n, m, w, b: new Float32Array(m),
        gw: new Float32Array(n * m), gb: new Float32Array(m),
        mw: new Float32Array(n * m), vw: new Float32Array(n * m),
        mb: new Float32Array(m), vb: new Float32Array(m),
      })
    }
    this.t = 0
  }

  gaussian() {
    const u = 1 - this.random()
    const v = this.random()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  get parameterCount() {
    return this.layers.reduce((sum, l) => sum + l.w.length + l.b.length, 0)
  }

  // Returns every layer's activations; the last one is the output.
  forward(input) {
    const acts = [input]
    this.layers.forEach((layer, li) => {
      const { n, m, w, b } = layer
      const x = acts[li]
      const out = new Float32Array(m)
      for (let j = 0; j < m; j++) {
        let s = b[j]
        for (let i = 0; i < n; i++) s += x[i] * w[i * m + j]
        out[j] = li < this.layers.length - 1 ? Math.max(0, s) : s
      }
      acts.push(out)
    })
    return acts
  }

  predict(input) {
    return this.forward(input).at(-1)
  }

  // Accumulate gradients for one example, given dLoss/dOutput.
  backward(acts, gradOut) {
    let grad = gradOut
    for (let li = this.layers.length - 1; li >= 0; li--) {
      const { n, m, w, gw, gb } = this.layers[li]
      const x = acts[li]
      const gradIn = new Float32Array(n)
      for (let j = 0; j < m; j++) {
        const g = grad[j]
        if (g === 0) continue
        gb[j] += g
        for (let i = 0; i < n; i++) {
          gw[i * m + j] += g * x[i]
          gradIn[i] += g * w[i * m + j]
        }
      }
      if (li > 0) for (let i = 0; i < n; i++) if (acts[li][i] <= 0) gradIn[i] = 0 // ReLU
      grad = gradIn
    }
  }

  // Adam update with the averaged accumulated gradients, then reset them.
  step(batchSize) {
    this.t += 1
    const b1 = 0.9, b2 = 0.999, eps = 1e-8
    const c1 = 1 - b1 ** this.t
    const c2 = 1 - b2 ** this.t
    for (const layer of this.layers) {
      for (const [p, g, m, v] of [[layer.w, layer.gw, layer.mw, layer.vw], [layer.b, layer.gb, layer.mb, layer.vb]]) {
        for (let k = 0; k < p.length; k++) {
          const grad = g[k] / batchSize
          m[k] = b1 * m[k] + (1 - b1) * grad
          v[k] = b2 * v[k] + (1 - b2) * grad * grad
          p[k] -= (this.lr * (m[k] / c1)) / (Math.sqrt(v[k] / c2) + eps)
          g[k] = 0
        }
      }
    }
  }

  copyFrom(other) {
    this.layers.forEach((l, i) => { l.w.set(other.layers[i].w); l.b.set(other.layers[i].b) })
  }
}
