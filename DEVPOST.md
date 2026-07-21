# Devpost submission copy

## Tagline

**A conversation-first AI mission control that turns any request into a verified, downloadable result — powered by a real multi-agent dependency pipeline.**

## Inspiration

Most AI tools either dump raw model output or hide coordination behind a wall of spinning agent cards that invent their progress. We wanted something honest: an interface as calm as a great chat app that only shows real operational detail when it actually helps, backed by a pipeline that traces every result to a real model call.

ComradeIQ started from one question — *what would AI coordination look like if every step had to be provably true?* No simulated research. No invented artifacts. No phantom parallel calls. Just a Commander with a dependency graph and a team that only activates when genuinely needed.

## What it does

ComradeIQ routes your objective through the right workflow automatically:

- **Direct chat** — simple questions get a fast, single-model answer with no unnecessary overhead.
- **Document missions** — write a README, technical spec, or report and receive a downloadable Markdown file.
- **Presentation missions** — request a slide deck and receive a styled, downloadable PPTX with your choice of 4 visual themes (Camo, Cyberpunk, Minimal, Ocean).
- **Web research** — opt-in internet access returns sourced, cited answers — never invented URLs.

For missions needing coordination, the **Commander** builds an explicit dependency DAG:  
`Researcher → Writer → Formatter + Critic → Assembler → Commander QA`  

Each specialist waits for real upstream output. Progress streams live over SSE — no Ably required. Every visible update traces back to a real mission event.

New in this build: **animated welcome prompt chips** let judges instantly launch representative missions across all four modes. Each completed reply shows a **mission-type badge** (💬 Chat · 📄 Document · 📊 Slides · 🔬 Research), a **copy-to-clipboard** button, and the **live elapsed timer** ticks in the header during every mission.

### See the team work — live agent graph + ops console

Document and slide missions activate the **full five-agent pipeline** — Researcher → Writer → Formatter → Critic → Assembler — and you watch it happen two ways at once:

- **Live agent graph** — a dependency-DAG visualization where each specialist node lights up in real time (thinking → working → done) and edges pulse as work flows downstream.
- **Live Agent Console** — a terminal-styled ops log that streams the *actual* orchestration events (`dispatch --agent writer`, `[critic] working`, `✓ mission complete`). It is a faithful console of real mission events, not a simulated shell — and each agent's line expands to reveal that specialist's real contribution.

### Interactive commands in chat

ComradeIQ also answers two interactive commands right in the conversation:

- **♟️ Chess** — say *"play chess with me"* and a real, rules-validated board opens inline (powered by chess.js). You play White; **Commander Atlas plays Black**, choosing every move through the same LLM that runs missions — literally the Commander playing you. Illegal moves are impossible; the game never stalls.
- **▶️ Video** — ask for *"a video of how jet engines work"* and ComradeIQ searches YouTube server-side and embeds a **playable** player directly in the chat — no leaving the app.

### Share and manage conversations

Completed missions get a **read-only shareable permalink** (`/m/<id>`) judges can open without an account, and every chat in the sidebar has a hover **⋯ menu** to share, archive, or delete it.

The app never fabricates. If a provider, storage layer, or realtime channel isn't configured, it says exactly what's missing and shows the setup path.

## How we built it

- **Next.js 15 + React 19 + TypeScript** — responsive chat workspace, SSR API routes, full type safety end-to-end.
- **OpenAI Responses API** — server-only model calls with structured routing, tool-gated web search, vision-capable image input, JSON Schema structured output for presentations, and input moderation.
- **Dependency-aware orchestrator** — real DAG execution, not cosmetic parallelism. Upstream results are the actual inputs to downstream agents.
- **SSE-first event streaming** — mission plan, dispatch, comrade activity, result, and error events stream to the browser without needing Ably. Ably is a progressive enhancement.
- **Durable adapters** — Vercel Blob private object storage for mission records and artifact bytes. In-memory fallback for local dev with an honest warning.
- **PptxGenJS** — server-side PPTX generation with 4 themes, scoped download URLs.
- **chess.js + an LLM opponent** — a fully rules-validated chess board where Commander Atlas picks its moves through the model (`/api/chess-move`), server-verified for legality with a legal-move fallback.
- **In-chat video** — server-side YouTube search with reliable oEmbed titles (`/api/video-search`, no extra API key), embedded via privacy-friendly `youtube-nocookie`.
- **Zustand** — client state for Commander/Comrade status, chat history, seed prompts, mission replay, and interactive chat widgets.
- **Vitest + Playwright** — routing, DAG, state, accessibility, mobile, error-state, reconnect, and download test coverage.

## Challenges we ran into

The hard part was resisting theatrical shortcuts. Making a multi-agent interface *look* impressive is easy. Making every visible update trace to a real event, every artifact trace to real storage, and every error be an honest error — that required disciplined system design at every layer.

Designing the team map as genuinely *optional* was also harder than expected. The final version moves it behind Team Controls, preserves Commander-only topology, and keeps keyboard users equally capable as mouse users.

Making the welcome experience guide new users without being prescriptive led us to the seed prompt chip system — 8 clickable example missions across 4 categories that populate the input bar and focus it instantly, lowering time-to-first-result from "figure out the UI" to a single click.

## Accomplishments that we are proud of

- **Animated welcome state** with 8 seed prompt chips (Chat, Document, Slides, Research) that instantly populate the input bar on click.
- **Mission-type badges** on every commander reply — auto-detected from response content (JSON = Slides, markdown headings = Document, citation links = Research, else Chat).
- **Live elapsed mission timer** in the header — ticks `00:00 → 00:43` in real time during every mission, resetting on completion.
- **Copy-to-clipboard** on every commander response, with a transient "✓ Copied" confirmation.
- **Relative timestamps + status dots** in mission history — "just now / 3m ago / 1h ago" with 🟢/🔴 status indicators.
- **A real mission dependency DAG**, not cosmetic agent cards.
- **Live agent graph + ops console** — the full five-agent pipeline visualized as a lighting-up DAG *and* streamed as a terminal-style event log, with click-to-expand per-agent output.
- **Play chess against the Commander** — a real, legal-move-validated board with the LLM as your live opponent.
- **In-chat video search & embed** — request a video and watch it play inline, no context switch.
- **Shareable read-only mission permalinks** and a per-chat share/archive/delete menu.
- **SSE progress that remains useful** with optional infrastructure disabled.
- **Honest provider, storage, and attachment configuration states** — no fake capability claims.
- **Downloadable Markdown and PPTX artifacts** with scoped, durable URLs when storage is configured.
- **4 PPTX themes** — Camo Combat, Cyberpunk Neon, Midnight Minimal, Ocean Breeze — chosen at launch time.
- **Accessible team map** — keyboard-navigable, Escape to close, Commander-only connection topology.

## What we learned

Reliable AI UX is mostly systems design. Capability routing, ownership boundaries, observability, cancellation, and truthful errors matter as much as the model call. We also learned that the first 10 seconds of a demo matter enormously — the seed prompt chips exist because a blank text box is a poor judge of what a system can do.

## What's next for ComradeIQ

Authenticated team workspaces, richer source provenance UI, evaluation dashboards comparing artifact quality across routing strategies, connector-backed business data sources, and policy-configurable retention. The current release deliberately keeps these as future capabilities rather than pretending they already exist.
