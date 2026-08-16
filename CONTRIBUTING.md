# Contributing

Thanks for wanting to help. This guide gets better mainly through corrections, and Microsoft
changes certification pages often enough that it needs them.

## The one hard rule

**Every factual claim must be traceable to official Microsoft documentation.**

If you cannot link it to `learn.microsoft.com` or another official Microsoft source, it does not
go in. That applies to exam weights, service behaviour, retirement dates, feature names — all of
it. A pull request that adds a fact without a source will be asked for one before it is merged.

## Images and screenshots

**Never copy an image from learn.microsoft.com.** Microsoft's
[Terms of Use](https://learn.microsoft.com/en-us/legal/termsofuse) state that "no logo,
graphic, sound or image from any Microsoft website may be copied or retransmitted unless
expressly permitted by Microsoft". That covers hot-linking for display too. Link to the
Learn unit instead — that is what the guide does everywhere.

**Your own screenshots are allowed**, and welcome. Microsoft's
[permissions policy](https://www.microsoft.com/en-us/legal/intellectualproperty/permissions)
permits screenshots of its software in educational material and on websites, provided you:

- do not alter the screenshot except to resize it, and do not crop out portions of it
- do not capture third-party content or any identifiable person
- do not capture boot-up, splash, or beta/unreleased screens
- use the full product name in the caption
- include the line **"Used with permission from Microsoft"**

Take them in your own subscription, put them in `docs/assets/screens/`, and caption them
with the product name and that permission line.

## What is out of scope

**Exam questions.** Real or recalled AI-103 questions, "dumps", and answer keys are not welcome
here and will be closed without discussion. Sharing them breaches the
[Microsoft Certification exam policies](https://learn.microsoft.com/en-us/credentials/certifications/certification-exam-policies)
that every candidate agrees to, and it puts the person who posts them at risk of losing their
certifications.

Practice *scenarios* you have written yourself, based on documented behaviour, are fine.

## What is very welcome

- **Corrections.** A weight that changed, a service that was renamed, a date that moved, a link
  that rotted.
- **Clarity.** A paragraph that is technically right but hard to follow. Rewriting it more simply
  is a real contribution — as long as the technical meaning does not shift.
- **Missing coverage.** A published sub-skill the guide does not address.
- **Lab notes.** Something in a lab that no longer works the way the guide describes.

## How to write here

The guide is written in plain English for someone who is competent but new to this material.
A few conventions that keep it consistent:

- **Explain, then name.** Say what the thing does before introducing the term for it.
- **Prefer the short word.** "Use" over "utilise", "so" over "consequently".
- **Keep technical precision.** Simplifying the language must never simplify the meaning. If the
  plain phrasing would be wrong, keep the precise phrasing and add a sentence explaining it.
- **No filler.** "It is important to note that" can always be deleted.
- **British or American spelling** — either is fine, just match the file you are editing.
- **Every module ends with one sentence.** The "in one line" summary is the thing a reader should
  still remember a week later. Keep it to one sentence.

## Making a change

The content lives in two places:

| You want to change | Edit |
| --- | --- |
| The study guide text | `design-source/AI-103 Notes.dc.html` |
| The cheat sheet | `cheatsheet/ai-103-cheatsheet.html` |
| Site layout or styling | `docs/assets/sheet.css` |
| Build behaviour | `tools/*.mjs` |

Do **not** edit files in `docs/guide/`, `docs/glossary.html` or `docs/cheatsheet-board.html`
directly — they are generated and your changes will be overwritten on the next build.

```bash
git switch -c fix-deployment-table
npm install
npm run all          # assets, guide, cheat sheet, render
npm run serve        # check it at http://localhost:8080
```

`npm run render` fails if the cheat sheet has outgrown its fixed board. That is deliberate — it
stops a cropped poster reaching the site. Either trim a panel or raise `BOARD_HEIGHT` in
`tools/render-cheatsheet.mjs` along with the matching `height` in the board's CSS.

Then open a pull request describing what changed and linking the Microsoft page that backs it.

## Reporting a problem without fixing it

[Open an issue](https://github.com/rahulmahadik/ai-103-certification-study-guide/issues). A link
to the official page and a note of what the guide currently says is plenty — that is genuinely
useful on its own.

## Licence

By contributing you agree that your work is published under the repository's licences: CC BY 4.0
for writing, MIT for code.
