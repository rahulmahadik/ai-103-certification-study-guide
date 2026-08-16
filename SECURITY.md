# Security

This repository publishes a static website. It has no server, no database, no
accounts and no runtime JavaScript, so the attack surface is small — but the
build tooling has dependencies, and those can have vulnerabilities.

## Reporting a vulnerability

Please report privately through
[GitHub's security advisory form](https://github.com/rahulmahadik/ai-103-certification-study-guide/security/advisories/new)
rather than opening a public issue.

Worth reporting:

- A vulnerability in the build scripts under `tools/`
- A supply-chain problem with one of the devDependencies
- Anything in the published site that could harm a visitor

Not worth reporting here: vulnerabilities in Azure or in Microsoft services.
Send those to the [Microsoft Security Response Center](https://msrc.microsoft.com/report).

## What to expect

An acknowledgement within a week. This is a spare-time project, so please be
patient beyond that.
