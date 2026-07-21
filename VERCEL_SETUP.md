# Vercel Deployment Setup (READ THIS FIRST)

The app works perfectly **locally** because dev runs as one persistent process with
filesystem-backed mission storage. On Vercel it runs as **stateless serverless
functions**, so two things MUST be configured or the AI appears to "never reply".

## Why the deployed AI stops replying

1. `POST /api/mission` creates the mission and runs the AI **in one serverless instance's memory**.
2. The browser then opens the progress stream `GET /api/mission/<id>/events`, which Vercel
   may route to a **different instance** with empty memory → it sees no result → no reply.

This is intermittent (it "worked yesterday") because Vercel sometimes reuses the same warm
instance. The code already fully supports durable, cross-instance storage — it just needs
the env vars below.

## Required Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, add (Production + Preview):

| Key | Value |
|-----|-------|
| `OPENAI_API_KEY` | your Groq key, e.g. `gsk_...` |

That single key is enough for the model: the app auto-detects a `gsk_` key and automatically
uses `https://api.groq.com/openai/v1` with the `chat-completions` protocol and
`llama-3.3-70b-versatile`. (Optionally set `OPENAI_MODEL` to override the model.)

> Do NOT rely on `.env.local` — it is git-ignored and never uploaded to Vercel.

## Required for reliable replies: a Vercel Blob store

1. Vercel → your project → **Storage** tab → **Create Database → Blob** → create the store.
2. Vercel automatically injects **`BLOB_READ_WRITE_TOKEN`** into the project.
3. **Redeploy.**

With the Blob store connected, mission records/events/artifacts persist to durable storage
that every serverless instance can read → the progress stream and downloads work reliably.
`GET /api/health/ai` will then report `"deploymentReady": true`.

## Verify after deploying

- Visit `https://<your-app>.vercel.app/api/health/ai` — expect
  `"provider":"openai"` and `"missionPersistence":"vercel-blob-private"`.
- Open the app, launch a mission, confirm a reply streams back to completion.

## Routes

- `/` — marketing landing page (shown first)
- `/app` — the ComradeIQ mission-control tool
