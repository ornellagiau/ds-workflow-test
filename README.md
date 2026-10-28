DS workflow test: cost-free design system pipeline
Figma (values) → GitHub (docs + code) → Storybook on GitHub Pages (team view) → Claude (reads the repo).
Setup (about 15 min)
Create a public repo on your personal GitHub account (GitHub Pages is free only for public repos). Use mock data only, no internal SZ content.
Upload this folder's contents to the repo (drag and drop in the GitHub web UI works, or git push).
In the repo: Settings → Pages → Source: GitHub Actions.
The workflow runs on every push. Your Storybook appears at https://<user>.github.io/<repo>/.
In Claude: connect the GitHub connector and point it at the repo. CLAUDE.md tells it where to look.
Two Storybooks, one source
