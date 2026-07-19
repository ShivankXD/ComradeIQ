# Verification

The required release gate is deliberately provider-independent:

```bash
npm run lint
npm run test
npm run build
```

Browser acceptance tests are manual because real provider requests can incur cost and require a server-side `OPENAI_API_KEY`:

```bash
npm run test:e2e
```

The local configuration uses an installed Microsoft Edge browser on Windows when available. On other machines, or when no supported browser is installed, run `npx playwright install chromium`; the GitHub Actions workflow does this automatically.

With no API key, the default browser suite verifies the honest configuration state, team controls, mobile layout, and keyboard dialog behavior. It never supplies a client-side mock response.

To exercise real greeting, README artifact, web-research, presentation, and download paths locally, use a short-lived server-side environment variable:

```bash
$env:COMRADEIQ_E2E_LIVE = "1"
$env:OPENAI_API_KEY = "your-server-side-key"
npm run test:e2e
```

Do not put that key in a tracked file. The manual GitHub Actions workflow has an equivalent `run_live_provider` switch and reads only the repository `OPENAI_API_KEY` secret.
