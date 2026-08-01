# michaelrobertsutton.com

Static HTML portfolio site. No build step required.

## Deploying to Production

When the user says "deploy", "push to production", "ship it", or similar — commit and
push to `main`. Vercel is git-connected and deploys automatically. There is no build step.

To roll back a bad deploy, promote the previous deployment in the Vercel dashboard.
Do not `git revert` for this — promoting is instant and does not touch history.

Hosting moved off S3 + CloudFront to Vercel on 2026-08-01. `deploy.sh` was deleted in
the same change: the CloudFront distribution and the Route 53 hosted zone no longer
exist, so the script could only have synced to an orphaned bucket and then failed.

Two files carry the deploy contract. Keep them in sync if paths move:

- **`.vercelignore`** — Vercel publishes the repo as-is, so anything not listed here
  becomes a public URL. It replaces the `--exclude` flags `deploy.sh` used to carry.
  `docs/` matters most: `docs/positioning-recommendations-*.md` is marked
  "Not for publication." Note `documents/artifacts/*.md` are deliberately NOT ignored.
- **`vercel.json`** — security headers and cache policy. Cache lifetimes on
  `assets/css` and `assets/js` are deliberately short (1h + stale-while-revalidate)
  rather than the year-long `max-age` the old S3 deploy set. Those filenames are not
  content-hashed and Vercel has no invalidation step, so a long browser cache would
  strand visitors on stale CSS.

The S3 bucket `michaelrobertsutton.com` is retained until ~2026-08-08 as a rollback
copy, then deleted. It serves no traffic.

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Local Development

```
python3 -m http.server 8000
```

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
