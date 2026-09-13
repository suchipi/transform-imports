# Comments: Write Almost None

**This rule overrides your default instinct to comment. That instinct is wrong here — follow this rule even when it feels like you are under-documenting.**

The default is **zero comments**. Code carries its own meaning through names and structure; prose beside it is a cost, not a courtesy. Every comment draws the reader's eye and makes that line look more important than the code around it — a comment in front of a one-liner inverts the visual weight of the file.

Add a comment ONLY when the **why** is genuinely non-obvious and cannot be fixed by better naming — a hidden constraint, a subtle invariant, a workaround for a specific bug. When you do, keep it to one tight line.

NEVER write a comment that:

- restates what the code does (`// loop over users`, `// increment the counter`)
- narrates the change or the task (`// now also handle X`, `// added to fix ...`, `// updated per request`)
- summarizes a function in front of its declaration
- explains anything a competent reader sees at a glance

If you reach for a multi-line comment to explain a block, the code needs renaming or restructuring instead — fix that, don't annotate it.

Before you finish an edit, reread every comment you added and delete the ones that don't pass the non-obvious-**why** test. Assume you added too many.

**Exception — user-facing documentation.** Doc comments on public APIs are user-facing documentation, not internal commentary. Those SHOULD be thorough: describe params, return values, edge cases, and link to related symbols. This rule does not apply to them.
