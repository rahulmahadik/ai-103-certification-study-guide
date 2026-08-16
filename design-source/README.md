# design-source

`AI-103 Notes.dc.html` is the single authored source for the whole study guide.
Everything under `docs/guide/`, plus `docs/glossary.html`, is generated from it —
**edit this file, not the generated pages.**

## The format

One continuous HTML document in three parts:

```html
<x-dc>
  <helmet>  … everything destined for <head> …  </helmet>
  <doc-page> … the document itself … </doc-page>
</x-dc>
```

`<x-dc>` and `<helmet>` are wrappers from the editor the document was authored
in. They are kept because the build uses them as boundaries, not because
anything renders them: `tools/build-guide.mjs` reads what is between
`</helmet>` and `</x-dc>` and throws the wrappers away.

The `<helmet>` block itself is discarded at build time too — `docs/assets/sheet.css`
covers every rule that used to live in it, and keeping it would win the cascade
because it lands after the stylesheet link in the head.

## How it becomes a website

`npm run guide` does the following:

1. **Splits** the document at each header block carrying `break-before:page` —
   one part per module.
2. **Anchors** every unit heading. Most already carry an id like `m2u3`; the
   three specialist pages label their sections "Skill area 1" with no id, so a
   descriptive one is generated from the following `<h3>`.
3. **Rewrites cross-page links.** The source is one document, so its internal
   links are bare fragments like `href="#p2"`. After the split those targets
   live on other pages, and a bare fragment with no matching id on the current
   page does nothing at all when clicked. Each one is rewritten to a real page
   link.
4. **Remaps fonts** from the Google Fonts families named in the source to the
   self-hosted equivalents, so nothing loads from a CDN.
5. **Sends external links to a new tab**, with `rel="noopener"`.
6. **Wraps** each part in the site chrome: the top bar, the contents rail, the
   "on this page" rail, and prev/next links.

## Editing safely

- Keep the `break-before:page` marker on each module's opening header block —
  it is what the split keys on.
- Keep heading ids stable. They are the URL fragments, so changing one breaks
  any link anyone has saved.
- After editing, run `npm run guide && npm run check`. The link checker fails
  the build on a fragment that resolves nowhere, a link that points at a
  directory, or an external link that does not open in a new tab.

## Images

There are none, deliberately. Microsoft Learn's Terms of Use say that "no logo,
graphic, sound or image from any Microsoft website may be copied or
retransmitted unless expressly permitted by Microsoft", and the permission
granted for documents is conditioned on the content not being "copied or posted
on any network computer".

So the guide reproduces no Microsoft image. Each screenshot is a link to the
Learn unit it came from — legally unambiguous, and it never goes stale when the
portal changes. `internal/remove-ms-images.mjs` did the conversion; keep new
contributions to the same rule.
