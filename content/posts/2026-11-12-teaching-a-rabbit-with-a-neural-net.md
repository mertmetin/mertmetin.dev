---
title: Teaching a rabbit to play, with a neural network written from scratch
date: 2026-11-12
summary: A Q-table learned my browser game in seconds, then hit a wall at 18 points. A from-scratch Deep Q-Network got to 73.
tags: [reinforcement-learning, neural-networks, javascript]
---

My site has a small game, Rabbit Run: steer a delivery rabbit around a city grid, pick up groceries, and don't run into the walls or the growing trail of bags behind you. Then I wanted to see a machine learn it, live in the browser, with no ML libraries. The [AI lab](/#lab) on the home page is the result.

## Step 0: separate the rules from the drawing

The first change wasn't AI at all. I split the game into a rules engine (`RabbitEnv`), a renderer and the human controls. Now the game you play and the game the agent plays are literally the same code, and the agent can train at about a million moves a second without drawing anything.

## Brain 1: a Q-table

Q-learning keeps a score for every *(situation, move)* pair and nudges it after each step:

```text
Q(s, a) ← Q(s, a) + α · (reward + γ · max Q(s', ·) − Q(s, a))
```

The rewards are simple: **+10** for a grocery and **−10** for a crash. The situation is 11 yes/no senses: danger straight ahead, to the right or to the left; which way it's facing; and whether the grocery is up, down, left or right. Moves are relative: straight, turn right, turn left.

That's at most 2,048 situations, and in practice it only ever sees about 250. It learns astonishingly fast. Over 500 training runs, the average score goes from 0.1 to about 17, against 0.2 for random moves.

Then it stops improving. **The table brain plateaus around 18 groceries**, and watching it shows why: it only sees one cell ahead. As the trail gets long, it happily turns into a pocket of its own bags with no way out.

## Brain 2: a neural network, from scratch

To see traps coming, the agent needs richer senses, and a table can't handle richer senses (41 inputs, several of them continuous, would mean an astronomically large table). So the second brain is a small neural network that *estimates* the scores instead of looking them up.

I wrote it in plain JavaScript:

- **The network:** 41 inputs → 64 hidden neurons (ReLU) → 3 move scores. That's 2,883 weights, He-initialised, trained with backpropagation and the **Adam** optimiser.
- **Experience replay:** every move goes into a buffer of 20,000; training samples random batches of 32, so it doesn't just learn from its last few seconds.
- **A target network:** a copy of the weights, refreshed every 500 steps, provides stable targets. Without it, the network chases its own tail.
- **Clipped errors:** a Huber-style clip so one surprising crash can't wreck the weights.

The richer senses do the real work. On top of the original 11, the network sees a **5×5 window** around its head and, for each possible move, **how much of the free board it could still reach** from there (a flood fill). A move into a dead end scores near zero on that last sense, which is exactly the information the table never had.

## Results

Same game, same rewards, 50,000 training steps each, then 30 test runs without exploration:

| Brain | Average groceries | Best |
|---|---:|---:|
| Q-table | 18.8 | 40 |
| **Neural network (DQN)** | **73.0** | **108** |

Nearly 4× better. The learning curve has the classic DQN shape: flat while the replay buffer fills and exploration is high, then a steady climb. It trains at roughly 3,700 steps a second (measured in Node), and in the browser it averages over 40 groceries after about 20 seconds on Turbo.

## One thing that tripped me up

During training, the network's live scores looked much worse than its test scores: about 22 against 66. The culprit was exploration. The agent still made 2% random moves, and with a trail of 60 bags, one random move is usually fatal. Lowering the floor to 0.2% closed much of the gap (32 during training against 73 in testing). A small detail, but it's the difference between a chart that undersells what the agent learned and one that shows it.

## Try it

Pick **Neural net** in the [AI lab](/#lab), press Train, and switch to Turbo for 20 seconds. You can watch its senses light up, see how much it likes each move, and tune the learning rate. The code is in the [site repo](https://github.com/mertmetin/mertmetin.dev), and `script/rabbit_benchmark.sh` reproduces the numbers above.
