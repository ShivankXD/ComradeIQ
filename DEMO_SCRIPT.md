# ComradeIQ — 2–3 minute demo script

## 0:00–0:15 — The promise

"ComradeIQ is a conversation-first AI mission control. It keeps the answer in the chat, and only brings the team controls forward when they help. Most importantly, it never makes up an AI result or artifact."

Show the calm home chat workspace and compact Commander status.

## 0:15–0:35 — Honest setup state

Open the provider status indicator with no `OPENAI_API_KEY` configured.

"Before a key is configured, ComradeIQ does not imitate a response. It explains what is missing, keeps the key server-side, and shows which optional capabilities—storage and realtime—are available."

## 0:35–0:55 — Direct conversation

With `OPENAI_API_KEY` configured, submit `hi`.

"Simple conversation takes the direct, low-overhead route. This is a live provider response—not a canned greeting—and the request is tracked with an ID, timeout, and retry state."

Show the concise answer and final mission status.

## 0:55–1:30 — Artifact mission

Attach a small Markdown file and ask: `Create a clean README for this project.`

"For document work, ComradeIQ validates the attachment, extracts supported content on the server, and builds a real dependency graph. Research and writing can run together when appropriate; formatting and critique receive their actual outputs; the assembler only sees reviewed material; then the Commander performs final QA."

Open Activity to show concise plan and agent updates, then show the safely rendered Markdown response. Click **Download .md**.

## 1:30–2:00 — Research and presentation

Enable **Internet research** and ask for a short sourced briefing, then show the citation/source cards.

Submit: `Make a five-slide presentation about our launch plan.`

"Internet access is opt-in. When it is enabled, the result carries source provenance. Presentation requests follow the deck workflow and produce a real PPTX download, stored through the configured durable storage provider rather than a temporary server file."

Click **Download .pptx** and open the file in a presentation app.

## 2:00–2:20 — Team Controls and resilience

Open **Team Controls**. Toggle a Comrade connection using the keyboard and close with Escape. Resize to the mobile breakpoint.

"The map is optional and Commander-only: Comrades never connect to each other. It is responsive, non-overlapping, keyboard-operable, and remembers safe placement. SSE drives progress even when Ably is absent; Ably simply enhances a running deployment when configured."

## 2:20–2:35 — Close

"That is ComradeIQ: a focused conversation surface backed by real routing, real orchestration, durable artifacts, and honest operational states."
