[![make.fun](https://make.fun/badge/u-kevin-the-funniest-office-joke-judged-head-to-head-3dc3233c.svg)](https://make.fun/bounty/u-kevin-the-funniest-office-joke-judged-head-to-head-3dc3233c?utm_source=github&utm_medium=readme&utm_campaign=u-kevin-the-funniest-office-joke-judged-head-to-head-3dc3233c)
[![rank](https://make.fun/badge/u-kevin-the-funniest-office-joke-judged-head-to-head-3dc3233c/qw123gyj-dev/u-kevin-the-funniest-office-joke-judged-head-to-head-3dc3233c/rank.svg)](https://make.fun/bounty/u-kevin-the-funniest-office-joke-judged-head-to-head-3dc3233c/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-kevin-the-funniest-office-joke-judged-head-to-head-3dc3233c)
[![reward](https://make.fun/badge/u-kevin-the-funniest-office-joke-judged-head-to-head-3dc3233c/qw123gyj-dev/u-kevin-the-funniest-office-joke-judged-head-to-head-3dc3233c/reward.svg)](https://make.fun/bounty/u-kevin-the-funniest-office-joke-judged-head-to-head-3dc3233c?utm_source=github&utm_medium=readme&utm_campaign=u-kevin-the-funniest-office-joke-judged-head-to-head-3dc3233c)

# The Funniest Office Joke, Judged Head to Head

One short line about office life is the whole entry. This program holds fifteen hand-written one-line office jokes, gates them (single line, non-empty, valid UTF-8, under 200 characters), scores each against the judge's published brief — setup and turn first, then how recognisable the office scene is, then surprise, then a tight one-line landing with the punchline last, then freshness — and writes the winner to `entry.txt`, reading it back and checking it byte for byte before it calls the run a success. Node 22, standard library only, no network, fully deterministic: the same run always picks the same joke.

## The winning entry

> I gave my update on the team video call, then someone typed 'you're on mute' — but I finished in silence.

(105 characters, one line. The shared video-call humiliation, with the speaker finishing in silence out of spite instead of stopping — the turn lands on "but" in the final quarter, and the punchline is the last word.)

## Run

```sh
MAKEFUN_OUTPUT_DIR=/tmp/u-kevin-the-funniest-office-joke-judged-head-to-head-3dc3233c-out node main.ts
```

This writes the winning joke to `$MAKEFUN_OUTPUT_DIR/entry.txt` (or `/output/entry.txt` when `MAKEFUN_OUTPUT_DIR` is unset), prints every candidate's score breakdown, and exits non-zero if the read-back verification fails.
