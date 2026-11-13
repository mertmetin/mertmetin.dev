# mertmetin.dev

My personal site: a Ruby on Rails app with a working terminal, two games, and an AI lab where a neural network I wrote from scratch teaches itself to play one of them in your browser.

## What's on it

- **Work:** repo-style cards for my projects ([Rabbit](https://github.com/mertmetin/rabbit-server), [searchbench](https://github.com/mertmetin/searchbench), [Geolocation-Prediction](https://github.com/mertmetin/Geolocation-Prediction) and my real-estate platform), each with a project page.
- **An interactive terminal:** `help`, `ls`, `cat rabbit`, `cd searchbench`, `stack`, `play` and a few easter eggs (`sudo hire mert`). Tab completion, history, and "did you mean…?" suggestions for typos.
- **Rabbit Run:** steer a delivery rabbit around a city grid to collect groceries. Arrows/WASD or swipe.
- **Bug Hunt:** squash bugs crawling down real buggy code from my 2019 thesis before they reach production. Every squash reveals a real bug I found and fixed.
- **AI lab:** watch an agent learn Rabbit Run from nothing, with two brains to compare:

| Brain | How it works | 30 test runs after 50k training steps |
|---|---|---|
| Table | Q-learning over 11 yes/no senses (danger, heading, where the grocery is) | average **18.8**, best 40 |
| Neural net | Deep Q-Network: 41 → 64 → 3 MLP with backprop and Adam, experience replay, target network; also sees a 5×5 area and the open space each move leads to (flood fill) | average **73.0**, best 108 |

Reproduce with `script/rabbit_benchmark.sh` (Node 20+). Everything runs in the visitor's browser: no ML libraries and no server-side compute.

## Stack

- **Ruby on Rails 8.1** with Hotwire (Turbo + Stimulus) and import maps, so there's no JavaScript build step
- **Tailwind CSS 4**, light and dark mode from one set of colour tokens
- Project content lives in [`config/projects.yml`](config/projects.yml) behind a small `Project` model with an Active Record-like interface, so it can move to the database later
- **Kamal** for Docker deploys to my own server

## Code tour

```
app/javascript/games/
  rabbit_env.js       Rabbit Run rules, the agent's senses (incl. flood fill)
  rabbit_board.js     canvas renderer shared by the game and the lab
  rabbit_run.js       the human-playable game
  q_agent.js          tabular Q-learning
  nn.js               a from-scratch MLP: forward, backprop, Adam
  dqn_agent.js        Deep Q-Network: replay buffer, target network
app/javascript/controllers/
  terminal_controller.js    the terminal (commands, completion, history)
  bug_hunt_controller.js    Bug Hunt
  rabbit_lab_controller.js  the AI lab UI and training loop
config/projects.yml   project content
```

## Run it

```bash
bundle install
bin/dev                    # http://localhost:3000
bin/rails test             # page tests
script/rabbit_benchmark.sh # table vs neural net, headless
```

## Deploy

Kamal deploys to my own server (`config/deploy.yml`). The Rails master key stays on the machine running Kamal and is never committed.

## License

MIT for the code. The words about me are mine.
