# Devpost submission copy

## Tagline

**A conversation-first AI mission control that turns a request into a verified, downloadable result.**

## Inspiration

Most AI workspaces make coordination look busy instead of making work more dependable. We wanted an interface that feels as clear as a great chat app, while still showing the right amount of operational context when a task genuinely benefits from specialists. ComradeIQ treats the conversation as the product and the team map as an optional control surface—not a permanent dashboard competing with the answer.

## What it does

ComradeIQ accepts an objective, supported files, and an explicit web-research choice. It routes simple conversation to a fast direct model response; routes document and code work through an artifact-oriented mission; and routes deck requests through a presentation workflow that produces a downloadable PPTX.

For missions that need orchestration, the Commander builds a dependency graph, activates only the needed Comrades, waits for real upstream outputs, and finishes with review and final QA. The app streams short, display-safe plan and activity updates through Server-Sent Events, so progress continues to work when Ably is not configured. The optional team map exposes Commander-to-Comrade connections and accessibility-friendly controls without taking over the chat workspace.

The app never fabricates a model response. If an AI provider, durable artifact storage, or optional realtime provider is not configured, it says exactly what is missing and gives a useful setup path.

## How we built it

- **Next.js + React + TypeScript** for the responsive chat workspace and server-side API routes.
- **OpenAI Responses API** for server-only model calls, structured routing, tool-gated web research, vision-capable image input, and structured presentation planning.
- **A dependency-aware mission orchestrator** for Commander planning, parallel research/writing, formatter/critic review, assembler output, and Commander QA.
- **SSE-first mission events** for resilient progress, with Ably as an optional enhancement rather than a requirement.
- **Durable adapters** for mission events and object-backed artifacts, so deployment configuration is honest rather than filesystem-dependent.
- **PptxGenJS** for downloadable deck generation, plus safe Markdown rendering and downloadable Markdown artifacts.
- **Vitest and Playwright** for routing, DAG, state, accessibility, mobile, error-state, reconnect, and download coverage.

## Challenges we ran into

The hard part was avoiding the tempting demo shortcut: an attractive multi-agent interface is not enough if its progress and artifacts are invented. We made every visible update trace back to a real mission event, made dependencies explicit rather than running theatrical parallel calls, and designed graceful configuration states for an app that may be deployed without every provider enabled.

We also had to make the team visualization useful without turning it into a dense tactical HUD. The final design moves it behind Team Controls, preserves the Commander-only connection topology, and gives keyboard users equivalent connection controls.

## Accomplishments that we are proud of

- A polished chat-first experience with a compact mission status layer rather than a permanent dashboard.
- A real mission dependency DAG, not a collection of cosmetic agent cards.
- SSE progress that remains useful with optional infrastructure disabled.
- Honest provider, storage, attachment, and research configuration states.
- Downloadable Markdown and PPTX artifacts with scoped, durable URL support when storage is configured.
- A map that remains optional, responsive, non-overlapping, and accessible on desktop and mobile.

## What we learned

Reliable AI UX is largely systems design: capability routing, ownership boundaries, observability, cancellation, and truthful errors matter as much as the model call. We also learned that a quiet interface can show more useful information when it only surfaces operational detail at the moment the user asks for it.

## What's next for ComradeIQ

Next we want to add authenticated team workspaces, richer source review, policy-configurable retention, connector-backed business data, and evaluation dashboards that compare artifact quality and cost across routing strategies. The release deliberately keeps these future capabilities separate from the honest, working core.
