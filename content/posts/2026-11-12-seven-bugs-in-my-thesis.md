---
title: I found seven bugs in my own thesis
date: 2026-11-12
summary: Rebuilding my 2019 University of Ottawa research code turned up a one-line bug that had silently erased my best result.
tags: [machine-learning, debugging, evaluation]
---

My thesis at the University of Ottawa asked a simple question: **can you tell where a Twitter user lives from what they tweet and who they follow?** I collected 420 Canadian users with their home cities, about a million of their tweets, and the declared locations of their friends and followers, then trained models to guess each user's home among 41 metro areas.

Seven years later I rebuilt it as a proper Python package. I expected to modernise some imports. Instead I found seven bugs, and one of them had been hiding the most interesting result in the whole project.

## The one-line bug

The social-graph scripts counted where each user's friends lived. Roughly:

```python
D = {metro: 0 for metro in metros}

for user in users:
    cpy = D            # meant to be a fresh copy for this user
    for friend in friends_of(user):
        cpy[friend_metro] += 1
    rows.append(cpy)
```

`cpy = D` doesn't copy the dictionary. It copies a *reference* to it. Every user's "own" counts were the same shared dictionary, accumulating across all 420 users, and every row of the feature matrix was the identical object. The classifier could only learn the class prior, so the 2019 social-graph numbers were noise with extra steps.

With a fresh `Counter` per user, a plain majority vote over friends' and followers' locations puts **88% of users within 161 km of home**. That's the best result in the project, and it was invisible for seven years because of one assignment.

## The other six

| Bug | What it did |
|---|---|
| `sql + where` | Built the SQL filter, then discarded the result. The filter never ran. |
| Québec spelled three ways | `Quebec City`, `Québec City` and `Québec metro` across scripts silently dropped 13 users. |
| `''.join(tokens)` | Rejoined words with no space, so the CNN saw each user's tweets as one giant word. |
| Random tweet split | The same person's tweets landed in train and test, so models memorised people, not places. |
| A GloVe matrix never used | Built carefully, then never passed to the model. |
| Positive longitudes | Distances were still right (mirroring preserves them), but nothing could go on a map. |

## The part that stung more

Bugs are one thing. The evaluation was worse.

The thesis used a single 80/20 split: **84 test users**, with several cities having just two people. Rebuilding with 5-fold cross-validation and a "always guess Toronto" baseline next to every model showed that **two of my 2019 models had learned nothing at all**. Naive Bayes and the MLP predicted Toronto for everyone, so their accuracy equalled the baseline. On 84 users with no baseline in the table, that's easy to miss.

The random split mattered too. On single tweets, the 2019 SVM scores 44% within 161 km when other tweets by the same person are allowed into training, and 36% when whole users are held out. Part of the old number was the model recognising people.

## What actually improved

With the bugs fixed and an honest evaluation, the rebuilt text model (word and hashtag TF-IDF with a class-balanced logistic regression) places **61% of users within 161 km** with a 42 km median error, up from 46% and 307 km for the best 2019 model. The biggest single gain came from requiring every term to appear for at least five different users, which filters the noise from 420 very chatty people.

## What I do differently now

- **Put a dumb baseline next to every model.** If a model ties "always Toronto", it learned nothing, and the table should make that obvious.
- **Hold out whole people, not rows,** whenever the same person can appear twice.
- **Write a test for each bug you fix.** The shared-dictionary bug now has a short test that would have caught it in 2019.
- **Suspect your best idea when its numbers are flat.** The social graph "not working" was the clue.

The code, results and a small web demo are on [GitHub](https://github.com/mertmetin/Geolocation-Prediction). The original 2019 scripts are still in `legacy/`, bugs and all.
