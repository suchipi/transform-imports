---
paths:
  - ".claude/rules/**/*.md"
---

# Claude Rules File Conventions

Files in `.claude/rules/` must be Markdown files (`.md`) with YAML front matter containing a `paths` array of glob patterns specifying which files the rule applies to.

```yaml
---
paths:
  - "src/some-dir/**/*.c"
---
```

The body of the file should explain the rules or conventions to follow when working on files matching the specified paths.

## No Frontmatter = All Paths

If the rule content applies to ALL paths (ie. `"**/*"`), the frontmatter may be omitted. If you encounter a rule file without any frontmatter, treat it like it had this frontmatter:

```yaml
---
paths:
  - "**/*"
---
```
