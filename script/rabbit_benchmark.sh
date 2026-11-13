#!/usr/bin/env bash
# Train both Rabbit Run brains headlessly and compare them (Node 20+).
#   script/rabbit_benchmark.sh [steps]
# The browser modules import each other as "games/..." (import maps), so this
# copies them to a temp folder with relative imports first.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
for f in rabbit_env q_agent nn dqn_agent; do
  sed 's#from "games/\([a-z_]*\)"#from "./\1.mjs"#' "app/javascript/games/$f.js" > "$tmp/$f.mjs"
done
cat > "$tmp/bench.mjs" <<'JS'
import RabbitEnv, { STATE_COUNT, FEATURE_COUNT } from "./rabbit_env.mjs"
import QAgent from "./q_agent.mjs"
import DQNAgent from "./dqn_agent.mjs"
const steps = Number(process.argv[2] || 50000)
const rng = (seed) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length
for (const kind of ["table", "dqn"]) {
  const random = rng(7)
  const env = new RabbitEnv({ random })
  const agent = kind === "table" ? new QAgent({ states: STATE_COUNT, random }) : new DQNAgent({ inputs: FEATURE_COUNT, random })
  const observe = () => (kind === "table" ? env.state() : env.features())
  const t0 = performance.now()
  let s = observe()
  for (let i = 0; i < steps; i++) {
    const a = agent.act(s)
    const { reward, done } = env.step(env.dirFor(a))
    const s2 = observe()
    agent.learn(s, a, reward, s2, done)
    s = s2
    if (done) { agent.endEpisode(); env.reset(); s = observe() }
  }
  const secs = (performance.now() - t0) / 1000
  const test = []
  for (let k = 0; k < 30; k++) {
    env.reset()
    let o = observe()
    while (env.alive) { env.step(env.dirFor(agent.act(o, { explore: false }))); o = observe() }
    test.push(env.score)
  }
  console.log(`${kind.padEnd(5)}  ${steps} training steps in ${secs.toFixed(1)}s  ->  30 test runs: average ${mean(test).toFixed(1)}, best ${Math.max(...test)}`)
}
JS
node "$tmp/bench.mjs" "${1:-50000}"
