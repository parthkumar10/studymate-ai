# StudyMate — Product Requirements Document

## Original Problem Statement
Build a simple AI-powered study web app for college students. Users paste raw lecture notes and convert them into study material via AI. Journey: Sign up → Login → Paste notes → Choose AI action → Generate → See result → result saved → revisit via History.

## User Choices
- AI model: **Claude Sonnet 4.6** (via Emergent Universal Key)
- Auth: **Email + password (JWT, httpOnly cookie)**
- Design: **Light & calm** warm neutral (paper-warm, sage green accents)
- Max note size: **8,000 characters**

## Architecture
- Frontend: React (CRA + craco), Tailwind, Shadcn UI, Framer Motion, lucide-react, sonner
- Backend: FastAPI, Motor (MongoDB), PyJWT, bcrypt, emergentintegrations (Claude Sonnet 4.6)
- DB collections: `users`, `generations`
- Ownership enforced at data layer: every generation query filters by `user_id`; cross-user access returns 404

## User Persona
College student turning lecture/class notes into summaries, flashcards, or quizzes.

## Core Requirements (static)
- 3 AI actions ONLY: Summarise Notes, Generate Flashcards, Generate Quiz Questions
- Persist per successful generation: user_id, input_text, type, result, created_at
- History: view, filter by type, search, open detail, delete
- Privacy: generations private per account; enforced server-side
- Validation: reject empty, trim whitespace, 8000-char cap with clear message
- Loading feedback, duplicate-submit prevention, plain-language errors with retry
- No payments/social/teacher/collab/video/marketplace

## Implemented (2026-09-27)
- Email/password auth (register, login, logout, me) with JWT httpOnly cookies
- Dashboard: large note textarea, char/word counter, sample loader, 3-action selector, generate button, recent history sidebar
- Inline result view: summary (overview/concepts/key points + copy), flashcards (3D flip, prev/next/master), quiz (MCQ, score, explanations, retry)
- History page: search + type filter + open + delete (confirm dialog)
- Detail view: saved result + original-notes accordion + back nav
- Backend validation, error handling (AI/provider failure → 502 friendly message), ownership isolation (404)
- Verified: full backend curl + testing agent E2E (12/12 frontend flows pass)

## Backlog (not yet built)
- P1: Export/download study material (PDF/Markdown)
- P1: Regenerate a saved generation with a different action
- P2: Edit/rename saved generations
- P2: Dark mode
- P2: Keyboard shortcuts for flashcard review

## Next Tasks
- Await user feedback on V1
