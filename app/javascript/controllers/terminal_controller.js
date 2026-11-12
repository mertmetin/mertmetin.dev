import { Controller } from "@hotwired/stimulus"
import RabbitRun from "games/rabbit_run"

// The hero terminal. Without JavaScript it's a static transcript; with it,
// visitors can type commands, open projects and play Rabbit Run.
export default class extends Controller {
  static targets = ["static", "output", "form", "input", "game", "canvas", "score"]
  static values = { projects: Array, githubUrl: String }

  connect() {
    this.history = []
    this.historyIndex = 0
    this.staticTarget.hidden = true
    this.outputTarget.hidden = false
    this.formTarget.hidden = false
    this.print([["accent", "$ "], ["ink", "whoami"]])
    this.print("Mert Metin · Senior Software Engineer · Ottawa, ON")
    this.print("")
    this.print([["muted", "Type "], ["cyan", "help"], ["muted", " and press Enter, or try "], ["cyan", "play"], ["muted", "."]])
    this.onResize = () => this.game?.resize()
    window.addEventListener("resize", this.onResize)
  }

  disconnect() {
    this.game?.stop()
    window.removeEventListener("resize", this.onResize)
  }

  // ---------------------------------------------------------------- input

  focus(event) {
    if (this.playing || window.getSelection()?.toString()) return
    if (event.target.closest("a, button")) return
    this.inputTarget.focus({ preventScroll: true })
  }

  submit(event) {
    event.preventDefault()
    const line = this.inputTarget.value.trim()
    this.inputTarget.value = ""
    this.print([["accent", "$ "], ["ink", line]])
    if (line) {
      this.history.push(line)
      this.historyIndex = this.history.length
      this.run(line)
    }
    this.scrollToEnd()
  }

  keydown(event) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      if (!this.history.length) return
      event.preventDefault()
      const step = event.key === "ArrowUp" ? -1 : 1
      this.historyIndex = Math.min(this.history.length, Math.max(0, this.historyIndex + step))
      this.inputTarget.value = this.history[this.historyIndex] ?? ""
    } else if (event.key === "Tab") {
      event.preventDefault()
      this.complete()
    } else if (event.key === "l" && event.ctrlKey) {
      event.preventDefault()
      this.clear()
    }
  }

  complete() {
    const value = this.inputTarget.value
    const [cmd, arg] = value.split(/\s+/)
    const options = arg === undefined
      ? Object.keys(this.commands).filter((c) => !c.startsWith("_"))
      : this.projectsValue.map((p) => p.slug)
    const prefix = arg === undefined ? cmd : arg
    const matches = options.filter((o) => o.startsWith(prefix))
    if (matches.length === 1) this.inputTarget.value = arg === undefined ? `${matches[0]} ` : `${cmd} ${matches[0]}`
    else if (matches.length > 1) this.print(matches.join("  "), "muted")
  }

  // ---------------------------------------------------------------- commands

  run(line) {
    const [name, ...args] = line.split(/\s+/)
    const command = this.commands[name.toLowerCase()]
    if (command) command.call(this, args)
    else this.print([["muted", "command not found: "], ["ink", name], ["muted", ". Try "], ["cyan", "help"]])
  }

  get commands() {
    return {
      help() {
        const rows = [
          ["whoami", "who I am"],
          ["ls", "list projects"],
          ["cat <project>", "read a project's summary"],
          ["open <project>", "go to a project page"],
          ["stack", "languages and tools I use"],
          ["contact", "how to reach me"],
          ["play", "play Rabbit Run 🐇"],
          ["clear", "clear the screen"],
        ]
        rows.forEach(([c, d]) => this.print([["cyan", c.padEnd(16)], ["muted", d]]))
      },
      whoami() {
        this.print("Mert Metin · Senior Software Engineer · Ottawa, ON")
        this.print("Full-stack web and mobile, search and machine learning.", "muted")
      },
      ls() {
        this.print(this.projectsValue.map((p) => [["cyan", `${p.slug}/`], ["", "  "]]).flat())
      },
      cat([slug]) {
        const p = this.findProject(slug, "cat")
        if (!p) return
        this.print(p.name, "ink")
        this.print(p.tagline, "muted")
        this.print([["accent", p.stat], ["muted", `  ${p.stat_label}`]])
        this.print([["muted", "→ "], ["cyan", `open ${p.slug}`], ["muted", " for the full write-up"]])
      },
      open([slug]) {
        const p = this.findProject(slug, "open")
        if (!p) return
        this.print(`opening ${p.slug}…`, "muted")
        setTimeout(() => window.Turbo ? window.Turbo.visit(p.url) : (window.location = p.url), 250)
      },
      stack() {
        this.print([["cyan", "lang   "], ["", "TypeScript  Python  Ruby  PHP  SQL"]])
        this.print([["violet", "web    "], ["", "Next.js  React Native  Rails  FastAPI  Laravel"]])
        this.print([["amber", "infra  "], ["", "AWS  Docker  GitHub Actions  MySQL  Stripe"]])
        this.print([["accent", "ml     "], ["", "scikit-learn  embeddings  BM25  LLM APIs"]])
      },
      contact() {
        this.printLink("github.com/mertmetin", this.githubUrlValue)
      },
      github() { this.commands.contact.call(this) },
      play() { this.startGame() },
      clear() { this.clear() },
      sudo(args) {
        if (args.join(" ").toLowerCase().replace(/\s+/g, " ") === "hire mert") {
          this.print("[sudo] password for recruiter: ********", "muted")
          this.print("✓ Permission granted. Excellent decision.", "accent")
          this.print([["muted", "next step: "], ["cyan", "contact"]])
        } else {
          this.print("nice try. (hint: sudo hire mert)", "muted")
        }
      },
      exit() { this.print("there's no escape. try play instead.", "muted") },
      rm(args) {
        if (args.includes("-rf")) this.print("whoa. not on my portfolio.", "amber")
        else this.print("rm: permission denied", "muted")
      },
      vim() { this.print("you're trapped now. just kidding, :q", "muted") },
      date() { this.print(new Date().toString(), "muted") },
      echo(args) { this.print(args.join(" ")) },
    }
  }

  findProject(slug, verb) {
    if (!slug) {
      this.print([["muted", `usage: ${verb} <project>   (`], ["cyan", "ls"], ["muted", " to list them)"]])
      return null
    }
    const p = this.projectsValue.find((x) => x.slug === slug.replace(/\/$/, "").toLowerCase())
    if (!p) this.print([["muted", `${verb}: no such project: `], ["ink", slug]])
    return p
  }

  // ---------------------------------------------------------------- game

  startGame() {
    this.playing = true
    this.outputTarget.hidden = true
    this.formTarget.hidden = true
    this.gameTarget.hidden = false
    this.scoreTarget.textContent = "0"
    this.inputTarget.blur()
    this.game = new RabbitRun(this.canvasTarget, {
      onScore: (score) => { this.scoreTarget.textContent = String(score) },
      onEnd: (score) => setTimeout(() => this.endGame(score), 900),
    })
    this.game.start()
    this.onGameKey = (e) => this.gameKey(e)
    window.addEventListener("keydown", this.onGameKey)
  }

  gameKey(event) {
    const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" }
    if (event.key === "Escape" || event.key === "q") return this.quitGame()
    const dir = map[event.key]
    if (!dir) return
    event.preventDefault()
    this.game.turn(dir)
  }

  touchstart(event) {
    const t = event.touches[0]
    this.touch = { x: t.clientX, y: t.clientY }
  }

  touchmove(event) {
    if (!this.touch) return
    event.preventDefault()
    const t = event.touches[0]
    const dx = t.clientX - this.touch.x
    const dy = t.clientY - this.touch.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return
    this.game.turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"))
    this.touch = { x: t.clientX, y: t.clientY }
  }

  quitGame() {
    this.game.stop()
    this.endGame(this.game.score, true)
  }

  endGame(score, quit = false) {
    if (!this.playing) return
    this.playing = false
    window.removeEventListener("keydown", this.onGameKey)
    this.gameTarget.hidden = true
    this.outputTarget.hidden = false
    this.formTarget.hidden = false

    const best = Math.max(score, this.readBest())
    this.writeBest(best)
    this.print(quit ? "game quit." : "game over: the rabbit crashed.", "muted")
    this.print([["accent", `delivered ${score} ${score === 1 ? "grocery" : "groceries"}`], ["muted", `  ·  best ${best}`]])
    if (score >= 15) this.print("that's a promotion to senior rabbit. 🐇", "amber")
    this.print([["muted", "type "], ["cyan", "play"], ["muted", " to go again"]])
    this.inputTarget.focus({ preventScroll: true })
    this.scrollToEnd()
  }

  // Best score is a per-visitor convenience; the game works without storage.
  readBest() {
    try { return Number(localStorage.getItem("rabbit-run-best")) || 0 } catch { return 0 }
  }

  writeBest(value) {
    try { localStorage.setItem("rabbit-run-best", String(value)) } catch { /* private mode */ }
  }

  // ---------------------------------------------------------------- output

  // `parts` is a string, or [[tone, text], ...]. Text is always inserted as
  // text, never HTML, so whatever a visitor types can't inject markup.
  print(parts, tone = "") {
    const line = document.createElement("div")
    const segments = typeof parts === "string" ? [[tone, parts]] : parts
    for (const [t, text] of segments) {
      const span = document.createElement("span")
      if (t) span.className = this.toneClass(t)
      span.textContent = text
      line.append(span)
    }
    if (!line.textContent) line.innerHTML = "&nbsp;"
    this.outputTarget.append(line)
  }

  printLink(text, href) {
    const line = document.createElement("div")
    const a = document.createElement("a")
    a.href = href
    a.textContent = `${text} ↗`
    a.className = "text-cyan underline underline-offset-4"
    line.append(a)
    this.outputTarget.append(line)
  }

  toneClass(tone) {
    return { accent: "text-accent-ink", ink: "text-ink", muted: "text-ink-3", cyan: "text-cyan", violet: "text-violet", amber: "text-amber" }[tone] ?? ""
  }

  clear() {
    this.outputTarget.replaceChildren()
  }

  scrollToEnd() {
    this.outputTarget.scrollTop = this.outputTarget.scrollHeight
  }
}
