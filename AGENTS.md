# AGENTS.md

## Core Mindset

Simplicity is the goal. Do less, not more. Solve exactly what is asked — nothing else.

---

## Rules

### Thinking First
- Solve from first principles. Understand the problem before writing a single line.
- Before building anything from scratch, search for a standard library that already does the job. Use it if it exists.
- If a task is unclear, **ask for clarification** before proceeding.

### Writing Code
- Keep every solution as minimal as possible.
- Never change unrelated things. Surgical edits only.
- Write clean, readable code — it should explain itself.
- Modularise. Never put everything in a single file. Create sub-modules when a feature grows.
- Never use `any` in TypeScript. Look for types in the library first. If not found, define your own.

### Debugging
- Validate assumptions — never assume.
- Search online to debug. Use the internet to find root causes, error meanings, and real solutions.
- No patches. Fix it properly at the root.
- After every implementation or debugging iteration, update `codemap.md` manually as implicit behavior.
- The codemap entry must clearly state what changed, why it was needed, every file modified in that iteration, and any useful verification result or blocker.

### When Stuck
- If you find yourself repeating the same mistake — **stop**. Do not try the same thing again.
- Articulate the problem clearly before attempting a fix. Write out what is wrong and why.
- If you cannot make progress, report the error and blockers rather than going in circles.

---

## What to Avoid

- Over-engineering. Do not add abstractions nobody asked for.
- Scope creep. Focus only on what the user asked.
- Rabbit holes. If a path keeps failing, surface it — don't keep digging.
- Mediocre shortcuts that create future debt.
