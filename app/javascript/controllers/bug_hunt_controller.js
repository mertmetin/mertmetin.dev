import { Controller } from "@hotwired/stimulus"

// Bug Hunt: bugs crawl down a code editor toward production. Squash them
// before they ship. Each squash reveals a real bug I found and fixed.
const ROUND_SECONDS = 30

const FIXES = [
  ["cpy = D", "Copied a reference, not the dict: every thesis user shared one feature row."],
  ["sql + where", "Built the WHERE clause, then threw it away. The filter never ran."],
  ["'Québec' ×3", "One city spelled three ways silently dropped 13 users from the data."],
  ["''.join(tokens)", "Glued every word together: the CNN saw one giant word per user."],
  ["random split", "Same person in train and test: the model memorised people, not places."],
  ["no auth", "Inventory endpoints anyone could write to. Admin-only in the rewrite."],
  ["key in a comment", "AWS keys pasted in a 2020 comment. Scrubbed from history, revoked."],
  ["+20× latency", "A shiny reranker made search worse and slower. Measured, then dropped."],
  ["predict 'Toronto'", "Two models had learned nothing; they guessed Toronto for everyone."],
  ["title-only index", "2014 search only indexed titles. Adding fields: +6 exact matches per 100."],
]

export default class extends Controller {
  static targets = ["board", "start", "score", "shipped", "timer", "toast", "best"]

  connect() {
    this.best = this.readBest()
    this.renderBest()
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
  }

  disconnect() {
    this.stop()
  }

  start() {
    this.stop()
    this.bugs = []
    this.score = 0
    this.shipped = 0
    this.endsAt = performance.now() + ROUND_SECONDS * 1000
    this.nextSpawn = 0
    this.factIndex = Math.floor(Math.random() * FIXES.length)
    this.startTarget.hidden = true
    this.toastTarget.hidden = true
    this.boardTarget.querySelectorAll(".bug").forEach((b) => b.remove())
    this.update()
    this.running = true
    this.last = performance.now()
    this.frame = requestAnimationFrame((t) => this.loop(t))
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.frame)
  }

  loop(now) {
    if (!this.running) return
    const dt = Math.min(50, now - this.last) / 1000
    this.last = now
    const left = Math.max(0, this.endsAt - now)
    const elapsed = ROUND_SECONDS - left / 1000

    // More bugs, and faster ones, as the round goes on.
    if (now >= this.nextSpawn) {
      this.spawn(elapsed)
      this.nextSpawn = now + Math.max(380, 1100 - elapsed * 28)
    }

    const height = this.boardTarget.clientHeight
    for (const bug of [...this.bugs]) {
      bug.y += bug.speed * dt
      bug.x += Math.sin((now + bug.wobble) / 300) * 0.25
      bug.el.style.transform = `translate(${bug.x}px, ${bug.y}px)`
      if (bug.y > height - 34) this.ship(bug)
    }

    this.timerTarget.textContent = `${Math.ceil(left / 1000)}s`
    if (left <= 0) return this.finish()
    this.frame = requestAnimationFrame((t) => this.loop(t))
  }

  spawn(elapsed) {
    const width = this.boardTarget.clientWidth
    const el = document.createElement("button")
    el.type = "button"
    el.className = "bug absolute left-0 top-0 grid size-11 place-items-center rounded-full text-2xl " +
      "transition-[filter] hover:brightness-125 focus-visible:outline-2 focus-visible:outline-accent"
    el.setAttribute("aria-label", "Squash bug")
    el.textContent = Math.random() < 0.15 ? "🪲" : "🐛"
    const bug = {
      el,
      x: 12 + Math.random() * (width - 56),
      y: -10,
      speed: (this.reduced ? 28 : 38) + elapsed * 2.2 + Math.random() * 18,
      wobble: Math.random() * 1000,
    }
    el.style.transform = `translate(${bug.x}px, ${bug.y}px)`
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); this.squash(bug) })
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.squash(bug) } })
    this.boardTarget.append(el)
    this.bugs.push(bug)
  }

  squash(bug) {
    if (!this.running || !this.bugs.includes(bug)) return
    this.remove(bug)
    this.score += 1
    this.splat(bug)
    if (this.score % 3 === 1) this.showFact()
    this.update()
  }

  ship(bug) {
    this.remove(bug)
    this.shipped += 1
    this.update()
    this.boardTarget.animate(
      [{ boxShadow: "inset 0 -6px 0 0 #f85149" }, { boxShadow: "inset 0 0 0 0 transparent" }],
      { duration: 400 },
    )
  }

  remove(bug) {
    this.bugs = this.bugs.filter((b) => b !== bug)
    bug.el.remove()
  }

  splat(bug) {
    const s = document.createElement("span")
    s.className = "pointer-events-none absolute left-0 top-0 text-xl"
    s.textContent = "✓"
    s.style.color = "var(--color-accent-ink)"
    s.style.transform = `translate(${bug.x + 12}px, ${bug.y + 8}px)`
    this.boardTarget.append(s)
    s.animate([{ opacity: 1, translate: "0 0" }, { opacity: 0, translate: "0 -24px" }], { duration: 600, easing: "ease-out" })
      .finished.then(() => s.remove())
  }

  showFact() {
    const [title, body] = FIXES[this.factIndex % FIXES.length]
    this.factIndex += 1
    this.toastTarget.hidden = false
    this.toastTarget.querySelector("[data-title]").textContent = title
    this.toastTarget.querySelector("[data-body]").textContent = body
  }

  finish() {
    this.stop()
    this.bugs.forEach((b) => b.el.remove())
    this.bugs = []
    this.best = Math.max(this.best, this.score)
    this.writeBest(this.best)
    this.renderBest()
    const verdict = this.shipped === 0 ? "Zero bugs shipped. Clean release 🚀"
      : this.shipped <= 3 ? "A few slipped through. Hotfix Friday."
      : "Production is on fire 🔥 Rollback!"
    this.startTarget.hidden = false
    this.startTarget.querySelector("[data-result]").textContent =
      `${this.score} squashed · ${this.shipped} shipped. ${verdict}`
    this.startTarget.querySelector("[data-button]").textContent = "Play again"
  }

  update() {
    this.scoreTarget.textContent = String(this.score)
    this.shippedTarget.textContent = String(this.shipped)
  }

  renderBest() {
    this.bestTarget.textContent = String(this.best)
  }

  // Best score is a per-visitor nicety; the game works without storage.
  readBest() {
    try { return Number(localStorage.getItem("bug-hunt-best")) || 0 } catch { return 0 }
  }

  writeBest(value) {
    try { localStorage.setItem("bug-hunt-best", String(value)) } catch { /* private mode */ }
  }
}
