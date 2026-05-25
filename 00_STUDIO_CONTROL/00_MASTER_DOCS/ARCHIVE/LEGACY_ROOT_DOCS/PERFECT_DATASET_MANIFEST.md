# PERFECT DATASET MANIFEST — PURELAB

## 0. Purpose

This manifest defines the doctrine for the **perfect dataset target** of TacticalChessPureLab.

It is not a generic chess ML manifesto.

It is not a web-scale dataset strategy.

It is a **PureLab-specific dataset constitution** whose goal is to build a model that learns to:

* construct
* punish
* convert
* defend
* conclude

and **not** to:

* stall
* drift
* survive aimlessly
* repeat without purpose
* wait for turn cap

This manifest is built by recoupling:

* active repo audit truth
* active V2 source-of-truth doctrine
* project history
* dataset audit findings around draw-heavy and strategically weak seed data
* trainer admission-gate lessons
* dataset discussions and refinements developed here
* external dataset lessons only where they strengthen, not replace, PureLab reality

---

## 1. Core doctrine

The main dataset of PureLab must not be merely:

* legal
* traceable
* large
* teacher-annotated somewhere

It must be:

* **small to medium**
* **highly curated**
* **pedagogically narrative**
* **technically instructive**
* **anti-stall**
* **conversion-oriented**
* **architecturally clean**

### One-sentence doctrine

```text
The PureLab core dataset must teach useful chess behavior, not merely record legal chess positions.
```

### Final practical interpretation

A dataset entry is only valuable if it contributes to at least one of:

* building a position correctly
* handling tension correctly
* punishing a mistake
* converting an advantage
* defending a difficult position correctly
* concluding a game cleanly

If it teaches none of those, it does not belong in the main core dataset.

---

## 2. Dataset taxonomy

The perfect dataset is **not one homogeneous block**.

It is a **composite dataset library** with distinct families.

### 2.1 Seed dataset

Role:

* stable starting point
* source hygiene anchor
* minimum diversity base
* historical baseline

Status:

* may include the current V2 core seed dataset
* not considered the ideal pedagogical core dataset

### 2.2 Core training dataset

Role:

* main general training corpus
* highest-trust primary dataset
* strongly filtered
* must reject stall / drift / weak trajectories

This is the central object of this manifest.

### 2.3 Specialized dataset families

Role:

* targeted reinforcement of critical behavior

Families may include:

* tactical motifs
* conversion positions
* technical endgames
* defensive draws
* mating patterns
* critical middle-game fragments

### 2.4 Benchmark-only datasets

Role:

* evaluation only
* never used for training
* judge whether the model actually learned something

---

## 3. Active truth and current gap

The active repo truth currently supports the following source-level conclusions:

* the canonical seed dataset remains useful as a **clean seed anchor**
* the canonical seed dataset is **not strong enough as the main pedagogical dataset for conversion recovery**
* trainer-side dataset admission now exists and can already reject clearly unfit A/B datasets
* source provenance on teacher-generated rows is now explicit (`source: teacher_uci`)
* the active project phase is **conversion recovery**, not broad truth recovery

This means the dataset problem is no longer just legality or traceability.
It is now primarily a problem of **pedagogical usefulness and anti-stall selectivity**.

---

## 4. Absolute red lines

The following must not enter the **core training dataset**.

| Case | Decision | Reason |
| --- | --- | --- |
| hard cap termination | reject | lab stop, not pedagogical ending |
| max-turn draw without meaningful story | reject | non-conclusion |
| sterile repetition | reject | teaches empty looping |
| long stagnation without swing/progress | reject | teaches drift |
| random in main trajectory | reject | noise corruption |
| runtime-invalid or suspicious source | reject | trust failure |
| no identifiable narrative class | reject | no pedagogical value |
| white draw without real instructional value | reject | white should not normalize passivity |
| black draw without real defensive content | reject | draw alone is not enough |
| absurd trajectory despite legality | reject | legal != useful |

### Operational summary

```text
Anything that teaches floating, waiting, or meaningless survival must be excluded from the core dataset.
```

---

## 5. Three doctrine levels

### 5.1 Red-line doctrine

These are hard exclusions.

### 5.2 Minimum viable dataset doctrine

This defines what can realistically be built first.

### 5.3 Target dataset doctrine

This defines the long-term perfect dataset.

---

## 6. Minimum viable dataset doctrine

This is the first realistic target for building a new core dataset.

| Axis | Minimum viable rule |
| --- | --- |
| legality | 100% valid |
| provenance | 100% traceable |
| hard cap | 0% |
| random trajectory | 0% |
| sterile draw | very low, transition tolerated |
| decisive games | strongly represented |
| useful draws | present, filtered |
| color parity | near balanced |
| narrative readability | required |
| technical motifs | simple reliable motifs mandatory |

### Interpretation

The first useful core dataset does **not** need to be perfect.

But it must already be:

* anti-cap
* anti-random
* anti-sterility
* more decisive than the current seed
* technically richer

---

## 7. Target dataset doctrine

The perfect dataset should tell, again and again, stories of this form:

```text
healthy setup → tension → mistake or structural shift → punishment or defense → conversion or valid drawn conclusion
```

It should not tell stories of this form:

```text
setup → passivity → drift → repetition → cap or empty draw
```

---

## 8. Global composition

### 8.1 Long-term target distribution

| Result class | Long-term target |
| --- | ---: |
| wins | ~33% |
| losses | ~33% |
| useful draws | ~33% |
| sterile draws | 0% |
| hard cap endings | 0% |

### 8.2 Short-term corrective distribution

Because PureLab’s current bottleneck is non-conversion, the first core rebuild should be **more decisive than philosophically balanced**.

| Result class | Minimum viable | Short-term target | Long-term target |
| --- | ---: | ---: | ---: |
| wins | 35–50% | 35–40% | ~33% |
| losses | 35–50% | 35–40% | ~33% |
| useful draws | 10–25% | 20–30% | ~33% |
| sterile draws | <10% | <5% | 0% |
| hard cap | 0% | 0% | 0% |
| random trajectories | 0% | 0% | 0% |

### Practical doctrine

The main dataset should initially overrepresent decisive and meaningful games until the model stops learning passive non-conversion as a default style.

---

## 9. Result × color balancing

Color matters pedagogically.

### 9.1 White

White should more often teach:

* initiative
* pressure
* active development
* conversion

### 9.2 Black

Black may more often teach:

* defense
* equalization
* resilient holding
* counterplay

### 9.3 Draw handling by color

* **White draws** must be filtered more severely.
* **Black draws** may be accepted slightly more often, but only when they teach real defense or real equality.

### 9.4 Result × color doctrine table

| Cell | Interpretation |
| --- | --- |
| White wins | strongly valuable |
| Black wins | strongly valuable |
| White losses | useful to learn white-side errors |
| Black losses | useful to learn black-side errors |
| White useful draws | rare, highly filtered |
| Black useful draws | tolerated slightly more if defensive and real |

### 9.5 Color parity guardrails

| Control | Rule |
| --- | --- |
| side-to-move parity | approximately 50/50 |
| result-color parity | no cell may collapse |
| white passive draws | reject |
| black passive draws | reject |
| black defensive draws | conditional keep |
| technical motifs on both sides | required |

---

## 10. End-mode doctrine

### 10.1 Always keep candidates

| End mode | Rule |
| --- | --- |
| checkmate | keep |
| decisive material conversion to win | keep |
| insufficient material after coherent play | keep |
| technically valid equal endgame draw | keep |

### 10.2 Conditional keep

| End mode | Rule |
| --- | --- |
| stalemate | keep only if trajectory is pedagogically meaningful |
| threefold repetition | rare keep only if defensive/forced and meaningful |
| fifty-move draw | rare keep only if true technical endgame and real story |

### 10.3 Reject

| End mode | Rule |
| --- | --- |
| hard cap | reject |
| max-turn forced draw | reject |
| disguised non-termination labeled draw | reject |

---

## 11. Narrative classes

Each game or fragment should be classifiable into at least one useful narrative class.

### 11.1 Useful classes

| Class | Meaning |
| --- | --- |
| Build | healthy development, piece activation, castling, setup |
| Tension | meaningful threats, pressure, critical decisions |
| Punish | tactical punishment, gain after opponent error |
| Convert | transforming advantage into victory |
| Defend | holding or equalizing correctly under pressure |
| Conclude | clean final phase, technical finish, proper end |

### 11.2 Rejected class

| Class | Meaning |
| --- | --- |
| Drift | inertia, empty repetition, sterile wandering, no pedagogical story |

### 11.3 Rule

```text
If a game cannot be mapped to at least one useful class, it does not enter the core dataset.
```

---

## 12. Technical repertoire minimum

The perfect dataset must not be only statistically balanced. It must contain a **minimum technical repertoire**.

### 12.1 Mandatory now

| Theme | Minimum target |
| --- | ---: |
| castling | 10% |
| net tactical gain | 10% |
| fork | 5% |
| pin | 5% |
| double attack | 5% |
| promotion | 3% |
| material conversion | 10% |
| correct drawing defense | 5% |
| clean equal endgame draw | 5% |

### 12.2 Desired next

| Theme | Minimum target |
| --- | ---: |
| skewer | 3% |
| corridor mate | 2% |
| clear technical endgame | 3% |
| fortress | 2–3% |

### 12.3 Future / bonus

| Theme | Status |
| --- | --- |
| underpromotion | bonus |
| KQ vs K | required when generation is reliable |
| KR vs K | required when generation is reliable |
| ladder mate | useful when reliable |

### Key doctrine

The dataset must teach not only “what result happened,” but “what technical behavior exists in chess.”

---

## 13. Source confidence doctrine

The quality of the played trajectory matters.

### 13.1 Source hierarchy

| Source | Role |
| --- | --- |
| teacher vs teacher | ideal |
| teacher-dominated | acceptable |
| teacher + light hybrid | only under strong filtering |
| heuristic-dominant | avoid |
| random present | exclude from core dataset |

### 13.2 Core doctrine

The core dataset should tend toward:

* 80–100% teacher-pure or teacher-dominated
* 0% random
* near 0% heuristic-dominant

If the trajectory source is weak, the sample may remain in a seed or legacy bucket, but not in the core dataset.

---

## 14. Length × utility doctrine

Length is not the criterion. **Meaningful progress** is.

### Keep

* short game with clear tactical content
* medium game with readable progression
* long game with real conversion
* long game with real defense
* long technical endgame with meaningful conclusion

### Reject

* long game without progress
* very long game ending in cap
* game stretched by inertia only

### Suggested derived parameters

* `long_game_threshold`
* `min_progress_events`
* `max_stagnation_span`
* `material_swing_min`
* `must_have_terminal_story`

---

## 15. Composite dataset architecture

The perfect dataset is not only made of full games.

It should be a **small composite training library**.

### 15.1 Recommended family structure

| Data family | Role |
| --- | --- |
| full clean games | teach global narrative |
| useful game fragments | teach critical decision zones |
| tactical exercises | teach motifs cleanly |
| conversion exercises | teach finishing behavior |
| defensive exercises | teach real holding and saving draws |
| technical endgames | teach clean conclusion |

### 15.2 Why this architecture

Full games teach continuity.
Fragments teach critical moments.
Exercises teach pure motifs.
Endgames teach conclusion.
Defensive positions teach non-passive draw behavior.

This is superior to a single homogeneous dataset of full games.

---

## 16. Recommended composite proportions

### Long-term target proportions

| Block | Short-term target | Long-term target |
| --- | ---: | ---: |
| healthy openings / development | 15% | 15% |
| tactical essentials | 20% | 20% |
| punishment of mistakes | 15% | 15% |
| advantage conversion | 20% | 20% |
| defense / intelligent draws | 10% | 15% |
| elementary / technical endings | 10% | 10% |
| clean general positions | 10% | 5% |

### Alternative data-family proportions

| Family | Suggested share |
| --- | ---: |
| full clean games | 25% |
| useful fragments | 25% |
| tactical exercises | 20% |
| conversion / winning endgame exercises | 15% |
| defensive / useful draw exercises | 10% |
| technical elementary endings | 5% |

These are target proportions, not mandatory first-step exact ratios.

---

## 17. Small-dataset doctrine

The perfect dataset for PureLab is not supposed to be web-scale.

It should be:

* small enough to curate
* large enough to cover core behaviors
* strict enough to avoid poison
* rich enough to contain technical minimums

### Practical scale intuition

The best first real PureLab core dataset is probably closer to:

* a few thousand highly filtered full games
* tens of thousands of useful fragments
* a technical exercise bank
* a small number of useful draw cases
* nearly zero drift

not to:

* millions of mediocre self-play games

### Final interpretation

```text
Small, curated, anti-stall, pedagogical, composite beats large, noisy, passive, self-play-heavy.
```

---

## 18. Quality scoring system

The perfect dataset requires a per-game or per-fragment triage system.

### 18.1 Scores

#### Legal score

Measures:

* legal runtime origin
* valid setup
* coherent terminal logic
* trusted provenance

#### Story score

Measures:

* readable development
* tension
* swing or turning point
* technical motif
* conclusion clarity

#### Pedagogical score

Measures usefulness for:

* build
* punish
* convert
* defend
* conclude

### 18.2 Reject flags

Hard flags:

* hard cap
* sterile repetition
* long no-progress drift
* random trajectory
* suspicious source
* no identifiable narrative
* absurd but legal line

### 18.3 Final classification

| Outcome | Meaning |
| --- | --- |
| KEEP | strong core dataset candidate |
| WEAK_KEEP | structurally acceptable but secondary value |
| REJECT | excluded from core dataset |

---

## 19. Operational doctrine for useful draws

Useful draws exist, but must be rare and meaningful.

### Useful draw examples

* true equal endgame held correctly
* defensive save under pressure
* fortress
* real equality reached through correct defense
* technically understandable drawn conclusion

### Rejected draw examples

* drift to repetition
* drift to non-termination
* cap-induced “draw”
* passive no-plan equalization
* meaningless shuffle

### Rule

```text
A draw is not good because it is a draw. It is good only if it teaches defense, equality, or technical clarity.
```

---

## 20. Operational doctrine for exercises and fragments

### 20.1 Exercises

Exercises are allowed and desirable if they:

* teach a clean motif
* reinforce an identified weakness
* remain clearly tagged as exercise-family data
* do not dominate the entire dataset

### 20.2 Fragments

Fragments without the opening phase are allowed if they:

* preserve a clear local story
* start inside a meaningful decision zone
* teach tension / punishment / conversion / defense / conclusion

### 20.3 Rule

```text
A sample does not need a beginning. It needs meaning.
```

---

## 21. Operational scoring gaps to close

This manifest intentionally leaves some thresholds open because the current repo does not yet expose all required signals in a normalized way.

The next implementation pass should make the following directly measurable:

* termination-mode counts per dataset/game family
* hard-cap count
* repetition-derived draw count
* fifty-move draw count
* insufficient-material draw count
* source-confidence tags beyond `teacher_uci`
* long-stagnation span
* progress-event counters
* narrative tags per game/fragment
* motif tags per game/fragment

Until those exist, this manifesto should guide triage, not pretend those metrics are already available.

---

## 22. Final dataset constitution

The perfect PureLab dataset must satisfy all of the following:

1. **legal trust**
2. **traceable source**
3. **no random in the core trajectory**
4. **no hard-cap or fake-draw poison**
5. **no sterile drift**
6. **narrative readability**
7. **technical motif coverage**
8. **color-aware balancing**
9. **draws only when useful**
10. **composite architecture**
11. **teacher-dominant trajectory trust**
12. **small curated scale over noisy mass**

---

## 23. Final doctrine sentence

```text
The PureLab perfect dataset is a small, highly curated, composite training library that teaches construction, tension, punishment, conversion, defense, and conclusion while excluding drift, stall, cap-induced non-games, and low-story trajectories.
```

---

## 24. Practical next step

The next implementation-level deliverable should be:

```text
PureLab Small Utopian Dataset v1 — operational scoring and triage grid
```

with:

* tags
* motifs
* narrative classes
* color/result balancing checks
* source-confidence tags
* KEEP / WEAK_KEEP / REJECT thresholds

A second deliverable should follow:

```text
dataset admission v1.1 — pedagogical and termination-aware admission signals
```

so trainer-side admission evolves from structural sanity checks toward true dataset quality checks.
