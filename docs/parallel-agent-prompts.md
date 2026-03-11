# Parallel Agent Workspaces

This repository is now split so multiple agents can work with minimal file
overlap:

- `backend/app/research`
- `backend/app/debate`
- `frontend`

Shared contract files remain a controlled boundary:

- `backend/app/schemas`
- `frontend/lib/api.ts`
- `frontend/lib/debate-stream.ts`

Use one owner for shared contract files. Do not let multiple agents edit them at
the same time.

## Recommended Execution Order

1. Contract owner updates schemas and stream payloads first.
2. Backend research agent and backend debate agent work in parallel once the
   contract is stable.
3. Frontend design agent works in parallel against the agreed contract.
4. Integration owner resolves final wiring, runs tests, and merges.

## Agent 1 Prompt: Research Stack

You are responsible for the research and retrieval layer only.

Scope:
- `backend/app/research/**`
- tests related to research or retrieval

Do not edit:
- `backend/app/debate/**`
- `frontend/**`
- shared contract files unless explicitly assigned

Goal:
- Build a research layer that can fetch real-time evidence via Search MCP and
  prepare structured retrieval results for the debate engine.

Tasks:
1. Add a `ResearchService` in `backend/app/research/search_service.py`.
2. Define normalized source/evidence structures in
   `backend/app/research/evidence_models.py` unless those types have already
   been assigned to the contract owner.
3. Add a `RagService` in `backend/app/research/rag_service.py` that supports:
   topic indexing, stance-aware retrieval, and per-round top-k evidence fetches.
4. Add a `ClaimExtractor` in `backend/app/research/claim_extractor.py` to pull
   opponent claims that should be refuted.
5. Keep interfaces narrow and orchestration-free. This package should not own
   debate flow.
6. Add tests for normalization, retrieval selection, and failure handling.

Constraints:
- Return structured evidence objects, not raw provider payloads.
- Cache by `debate_id` where appropriate.
- Handle no-result and timeout cases explicitly.
- Do not hard-wire UI behavior.

Validation:
- `cd backend && pytest`

Deliverable:
- A clean research package with stable service interfaces that the debate layer
  can call.

## Agent 2 Prompt: Debate Intelligence

You are responsible for the debate engine and agent behavior only.

Scope:
- `backend/app/debate/**`
- `backend/app/agents/**`
- backend debate tests

Do not edit:
- `backend/app/research/**`
- `frontend/**`
- shared contract files unless explicitly assigned

Goal:
- Upgrade the debate engine so each side uses retrieved evidence, targets
  opponent claims, and produces more grounded refutations.

Tasks:
1. Refactor orchestration in `backend/app/debate/service.py` into smaller units
   if needed, such as `orchestrator.py` or `judgment_pipeline.py`.
2. Integrate the research-layer interfaces without reimplementing research
   logic locally.
3. Update `PositiveAgent`, `NegativeAgent`, and `JudgmentAgent` so prompts
   consume structured evidence and require source-aware reasoning.
4. Make the judge score factual grounding and citation quality in addition to
   rhetoric.
5. Preserve WebSocket-friendly round progression and resumability.
6. Add tests for per-round retrieval usage, grounded judgment behavior, and
   safe fallbacks when research is unavailable.

Constraints:
- Keep orchestration in the debate package.
- Do not let role agents call arbitrary tools directly; use curated inputs from
  the debate layer.
- Keep failure modes explicit and recoverable.

Validation:
- `cd backend && pytest`

Deliverable:
- A debate engine that is more intelligent, more grounded, and still streams
  reliably.

## Agent 3 Prompt: Premium Minimal Frontend

You are responsible for the product UI only.

Scope:
- `frontend/app/**`
- `frontend/components/**`
- `frontend/app/globals.css`

Do not edit:
- `backend/**`
- shared contract files unless explicitly assigned

Design direction:
- Premium minimalist
- Editorial spacing
- High-contrast typography
- Restrained motion
- Fewer decorative elements, higher material quality

Goal:
- Redesign the app so it feels more premium and intentional while preserving the
  current debate flow.

Tasks:
1. Refresh the visual system in `frontend/app/globals.css`.
2. Redesign:
   - `frontend/app/page.tsx`
   - `frontend/app/debate/page.tsx`
   - `frontend/app/report/page.tsx`
3. Split reusable UI into focused components such as:
   - `DebateHero`
   - `RoundTimeline`
   - `EvidenceCard`
   - `JudgmentSummary`
   - `ResearchPanel`
4. Remove or replace unused legacy components if they are no longer needed.
5. Preserve responsive behavior and readability on mobile.
6. Keep the stream experience legible and calm while arguments are arriving.

Constraints:
- Avoid generic AI-product styling.
- Use a tight color system and strong type hierarchy.
- No unnecessary motion.
- Do not invent backend fields that are not in the agreed contract.

Validation:
- `cd frontend && npm test && npm run build`

Deliverable:
- A premium minimalist interface that works with the live debate stream and
  final report.

## Contract Owner Prompt

You are the only agent allowed to modify shared contracts.

Scope:
- `backend/app/schemas/**`
- `frontend/lib/api.ts`
- `frontend/lib/debate-stream.ts`

Goal:
- Define the exact payloads needed for research evidence, citations, round
  events, and final judgment summaries.

Tasks:
1. Extend backend schemas for evidence and citations.
2. Keep stream events backward-compatible where feasible.
3. Update frontend types and stream reducers to match backend changes.
4. Publish the final contract before other agents start broad edits.

Constraints:
- Minimize churn.
- Do not implement backend orchestration or frontend styling here.

Validation:
- `cd backend && pytest`
- `cd frontend && npm test`
