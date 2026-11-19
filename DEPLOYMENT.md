# Deployment

- `webtronics.run.place`: GitHub Pages, `main` branch, `/docs` folder.
- Multiplayer and attachment downloads: existing Sites Worker + D1 at `royal-room-nov12-e295.mutedwand2.chatgpt.site`.
- Source assets: `dist`. Run `node scripts/export-pages.mjs` after edits and commit both source and exported files. GitHub Pages publishes the commit automatically through its existing branch deployment.
- Server changes: run `node worker/build.mjs`, run game tests, then publish the same source commit to the existing Sites project in `.openai/hosting.json`. GitHub Pages cannot execute this Worker. Never replace the `DB` binding or reset the database during frontend deployment.
- Language files: `dist/locales/*.json`. The language switcher applies these to static and dynamic messages. Standalone offline HTML embeds the same catalogs in compressed form.
- Increment the service worker cache version and asset query version when changing cached files. Keep API requests network-only.
