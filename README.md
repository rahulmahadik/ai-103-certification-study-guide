# AI-103 Certification Study Guide

A study guide for **Microsoft exam AI-103: Developing AI Apps and Agents on Azure**,
the exam behind the *Microsoft Certified: Azure AI Apps and Agents Developer Associate*
certification.

Two things live here, for two different moments:

| | For | What it is |
| --- | --- | --- |
| **[Study guide](https://rahulmahadik.github.io/ai-103-certification-study-guide/guide/)** | Preparing properly, from scratch | Eleven pages, one per module. Every unit of the Microsoft Learn path plus the three specialist skill areas, written in plain language. |
| **[Cheat sheet](https://rahulmahadik.github.io/ai-103-certification-study-guide/cheatsheet.html)** | Revising, or looking one thing up | One page. Skill areas at their real weights, three diagrams, every decision table, the scenario cues, and a glossary. Full HD and print resolution. |

Everything is written in ordinary English. Nothing is dumbed down — no technical meaning is
changed to make a sentence read more easily.

---

## The exam

| | |
| --- | --- |
| **Exam** | AI-103: Developing AI Apps and Agents on Azure |
| **Certification** | Microsoft Certified: Azure AI Apps and Agents Developer Associate |
| **Duration** | 120 minutes |
| **Passing score** | 700 of 1000 |
| **Skills measured as of** | 16 April 2026 |
| **Level** | Intermediate · AI engineer, developer |
| **Assumed language** | Python — Microsoft states you "should have experience developing apps by using Python" |
| **Delivery** | Proctored, scheduled through Pearson VUE |
| **Renewal** | Free online assessment on Microsoft Learn, yearly |

Microsoft does not publish a question count or a single global price, so this guide does not
quote either. Be sceptical of any source that does.

### Who this exam is for

Microsoft's own description of the candidate:

> As a candidate for this Microsoft Certification, you're an Azure AI engineer who builds,
> manages, and deploys agents and AI solutions that take advantage of Microsoft Foundry.
>
> For this exam, you should have experience developing apps by using Python, and you need to be
> familiar with the capabilities of general AI, generative AI, and Azure services.
>
> — [Exam AI-103 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ai-103)

Read that literally. **Python is not optional** — the code questions use it and so does every
exercise in the Microsoft Learn path. C# appears in some SDK documentation, but preparing in
Python is the safer choice.

The listed responsibilities are the five skill areas word for word: planning and managing Azure AI
solutions, implementing generative AI and agentic solutions, and implementing computer vision,
text analysis and information extraction solutions. In the role you work with business
stakeholders, solution architects, data scientists, DevOps engineers and cloud security engineers.

### Skills measured

| # | Skill area | Weight |
| --- | --- | --- |
| 1 | Plan and manage an Azure AI solution | 25–30% |
| 2 | Implement generative AI and agentic solutions | 30–35% |
| 3 | Implement computer vision solutions | 10–15% |
| 4 | Implement text analysis solutions | 10–15% |
| 5 | Implement information extraction solutions | 10–15% |

Areas 1 and 2 are 55–65% of the exam between them. If your study time is short, spend it there.

---

## Which exam is this, exactly

The Azure AI engineering track has had three generations, and a great deal of material online is
still written for the previous two. If a course teaches Custom Vision training, LUIS intents and
utterances, or prompt flow, it is preparing you for an exam that no longer exists.

| Exam | Title and certification | Status |
| --- | --- | --- |
| **AI-100** | Designing and Implementing an Azure AI Solution | Retired 2021 |
| **AI-102** | Designing and Implementing a Microsoft Azure AI Solution — *Azure AI Engineer Associate* | Retired 30 June 2026 |
| **AI-103** | Developing AI Apps and Agents on Azure — *Azure AI Apps and Agents Developer Associate* | **Current** |

What changed between AI-102 and AI-103:

- Six skill areas become five.
- Generative AI and agents, previously two areas worth 20–30% together, become one area at 30–35%.
- *Natural language processing* becomes *text analysis*, and drops the LUIS-era custom language
  model content.
- *Knowledge mining* folds into *information extraction*.
- Computer vision now leads with image and video **generation**, not image analysis.
- The exam runs 120 minutes rather than 100.

If you already hold AI-102: the certification is retired, so it no longer renews. The badge stays
on your transcript as a record of what you passed, but there is no renewal assessment to keep it
current.

---

## Prerequisites

**There are none.** Microsoft requires no other exam, and nothing stops you booking AI-103
tomorrow. What follows is what the exam assumes and never teaches.

| Area | What you need |
| --- | --- |
| **Python** | Functions, dictionaries and lists, `pip install`, reading environment variables, `async`/`await`, JSON handling. The code questions use it and so does every lab. |
| **REST and JSON** | Endpoints, headers, authentication keys, request and response bodies. |
| **Azure fundamentals** | Subscriptions, resource groups, regions, quotas, role assignments, `az login`. |
| **Microsoft Entra ID** | Managed identities and token-based authentication. |
| **Azure Key Vault** | Where keys and secrets belong instead of in code. |
| **General AI literacy** | What a model, prompt, token, embedding and context window are. |

Explicitly **not** on this exam: training models from scratch, data science workflows in Azure
Machine Learning, and infrastructure administration beyond provisioning AI resources.

You will also want an [Azure free account](https://azure.microsoft.com/free/) — every lab in this
guide assumes you can create resources.

### New to AI on Azure? Sit AI-901 first

**AI-901: Microsoft Azure AI Fundamentals** is the beginner-level credential in the same track.
Pass mark 700, no retirement date, and an instructor-led course (AI-901T00) if you want one.
It replaced **AI-900**, which retired on 30 June 2026 — so ignore anything built for AI-900.

AI-901 is **not a prerequisite** for AI-103. It is just the cheapest way to find out whether the
vocabulary is already there.

- **Take AI-901 first** if you cannot comfortably explain what an embedding is, or you have never
  deployed anything in Azure.
- **Go straight to AI-103** if you have shipped something that calls an LLM API and Python is a
  language you write rather than read.

---

## How to use this repository

**Preparing properly.** Work through the [study guide](https://rahulmahadik.github.io/ai-103-certification-study-guide/guide/) in order, doing the matching
lab as you finish each part. The [lab ladder](https://rahulmahadik.github.io/ai-103-certification-study-guide/guide/labs.html) is eight builds, each ending
with something that actually runs — treat one as finished only when you can rebuild it from an
empty resource group without looking anything up.

**Exam in two days.** Read the [cheat sheet](https://rahulmahadik.github.io/ai-103-certification-study-guide/cheatsheet.html), then the "in one line" summary
at the end of each guide page. That is the whole syllabus in about an hour.

**Just need a term.** The [glossary](https://rahulmahadik.github.io/ai-103-certification-study-guide/glossary.html) has one line for every term the AI-103
outline names.

### A study plan that matches the weights

| Phase | Time | What you do |
| --- | --- | --- |
| 1. Ground yourself | 1 evening | Read the overview and part 1. Create a Foundry project and find its endpoint. |
| 2. Work the heavy middle | 2 weeks | Parts 2–5, one part every two or three evenings, with the matching lab each time. |
| 3. Responsible AI | 2 evenings | Part 6. Short, heavily tested, and almost entirely lists you can memorise. |
| 4. The specialist areas | 1 week | Parts 7–9. 30–45% between them, and mostly "which service" decisions. |
| 5. Build one real thing | 1 week | Lab 8. This is what makes the rest stick. |
| 6. Revise | 2 evenings | The cheat sheet. Nothing new. |

---

## Building it yourself

Everything is static HTML. There is no framework, no bundler and no runtime JavaScript, and
**nothing loads from a CDN** — fonts and icons are installed as devDependencies and vendored into
`docs/assets/` at build time.

```bash
npm install          # puppeteer, the icon set and the fonts
npm run assets       # vendor fonts + build the Fluent icon sprite
npm run guide        # split the source into docs/guide/*.html
npm run cheatsheet   # assemble the cheat sheet board
npm run render       # export the cheat sheet to PNG (1x and 2x) and PDF
npm run seo          # sitemap.xml, robots.txt, favicon, 1200x630 social card
npm run check        # fail on dead links, bad nav, weak SEO metadata
npm run serve        # preview docs/ at http://localhost:8080

npm run build        # all of the above, in order (npm run all is the same)
```

`npm run check` is the guard rail. It fails the build on a link that points at
a directory (works on a server, shows a directory listing off disk), a
fragment whose target moved to another page, a nav link pointing at the wrong
page, an external link that does not open in a new tab, a title longer than
search results display, or missing canonical/Open Graph/structured data.

### Layout

```
design-source/    the study guide as one long authored document
cheatsheet/       the cheat sheet board, one self-contained HTML file
tools/            build scripts — assets, guide split, cheat sheet, dev server
docs/             the published site (GitHub Pages serves this directory)
```

Generated output is not committed — `docs/guide/`, `docs/glossary.html`, `docs/cheatsheet-board.html`,
the vendored fonts and icons, and the rendered PNG and PDF are all rebuilt by `npm run build`. The
GitHub Pages workflow runs that build on every push to `main` and publishes the result, so run
`npm run build` after cloning to see the site locally.

### Editing the cheat sheet

[`cheatsheet/ai-103-cheatsheet.html`](cheatsheet/ai-103-cheatsheet.html) is one file: markup,
styles and inline SVG diagrams. The board is a fixed 1920 × 6800 box, so `npm run render` **fails
the build** if your edit pushes content past the bottom edge rather than shipping a cropped
poster. If it does, either trim a panel or raise `BOARD_HEIGHT` in
[`tools/render-cheatsheet.mjs`](tools/render-cheatsheet.mjs) and the matching `height` in the
board's CSS.

---

## Contributing

Corrections are very welcome, especially when Microsoft changes something. See
[CONTRIBUTING.md](CONTRIBUTING.md).

The one hard rule: **every factual claim must be traceable to official Microsoft documentation.**
If you cannot link it to `learn.microsoft.com`, it does not go in. Exam dumps, recalled questions
and "someone on Reddit said" are out of scope and will be closed — they violate the
[Microsoft Certification exam policies](https://learn.microsoft.com/en-us/credentials/certifications/certification-exam-policies)
that every candidate agrees to.

---

## Accuracy and staleness

Everything here was verified against official Microsoft pages in **August 2026**. Microsoft
changes certification pages without notice, sometimes substantially. Before you book anything,
re-check:

- [Exam AI-103 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ai-103)
- [Microsoft Certified: Azure AI Apps and Agents Developer Associate](https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-apps-and-agents-developer-associate/)
- [Exam AI-901](https://learn.microsoft.com/en-us/credentials/certifications/exams/ai-901/)

If you spot something out of date, [open an issue](https://github.com/rahulmahadik/ai-103-certification-study-guide/issues).

### Sources

The content is compiled from the Microsoft Learn learning path *Develop generative AI apps on
Microsoft Foundry*, the official AI-103 study guide, and Azure product documentation. Every
module page links back to its source on Microsoft Learn. The guide embeds **no Microsoft images**. Microsoft Learn's Terms of Use state that "no logo,
graphic, sound or image from any Microsoft website may be copied or retransmitted unless
expressly permitted by Microsoft", so screenshots are linked to their source unit on
Microsoft Learn rather than copied or hot-linked. That is also the only version that stays
current when Microsoft changes the portal.

---

## Licence

- **Writing** (the study guide, cheat sheet and glossary): [CC BY 4.0](LICENSE-CONTENT) — use it,
  remix it, teach from it, just credit the source.
- **Code** (the build scripts and stylesheets): [MIT](LICENSE).
- **Third-party assets**: Microsoft's Fluent UI System Icons (MIT), and Inter, Barlow Condensed and
  JetBrains Mono (SIL Open Font License 1.1). Full texts in
  [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

Microsoft, Azure, Microsoft Foundry and the certification names are trademarks of Microsoft
Corporation. This project is **not affiliated with, endorsed by, or sponsored by Microsoft**.
