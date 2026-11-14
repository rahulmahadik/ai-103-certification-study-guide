# Practice items (authored source)

Original section quizzes for GitHub Pages. **Not** Microsoft Learn labs, **not** the official practice assessment, **not** exam dumps.

Full methodology (store, not published): see the cloud-agent `docs/mcq-methodology-research.md` brief. Repo rule: `CONTRIBUTING.md` — no real or recalled exam questions.

## Rules before any item ships

1. One scenario stem, four options, **one** best answer.
2. Map to **one** official skills bullet (as of 16 April 2026 until Microsoft publishes another).
3. `learnUrl` must be a `learn.microsoft.com` page that states the keyed fact.
4. Explanation for the **correct** option and **each** distractor.
5. Correct answer: short `why` (why this option wins) plus a separate `concept` field (teach the outline bullet).
6. `origin` is always `"original"`. Never paraphrase a third-party bank.
7. Leave a section as **Coming** until a second reader can answer from the Learn page with explanations hidden.

## Layout

| Path | Role |
| --- | --- |
| `outline.json` | Verbatim skill areas / subsections / bullets for mapping |
| `sections/<slug>.json` | Items for that skill area (empty until reviewed) |
| `../tools/check-practice.mjs` | Structural + syllabus gates |
| `../tools/build-guide.mjs` | Builds `docs/practice/` (gitignored; CI publishes) |

## Modes (player)

- **One at a time:** Previous / Next / Submit — never dump the whole section on one page. Submit is always visible.
- **Coverage:** at least two original items per official outline bullet; high-weight concepts (RAG, agents, safety, retrieval, deployment, speech, Content Understanding) get a third.
- **Study (default):** untimed.
- **Pace:** optional timer ≈ 2 minutes × item count (pacing guide only — not an official per-question allotment).
- **Review:** one item at a time; correct answer shows short why first, then **About this concept**, plus each distractor why and the Learn link.

Do not show a scaled “700” score. A percentage here is recall on *our* stems only.
