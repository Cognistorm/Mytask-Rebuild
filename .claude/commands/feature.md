---
description: Build one feature as a full vertical slice. Usage: /feature <spec file name>
---
Build the feature defined in docs/02-specs/$ARGUMENTS as one vertical slice, in this order, each step by its own agent:
1. backend-engineer — endpoints + tests per openapi.yaml
2. web-engineer — web screens
3. mobile-engineer — mobile screens
4. qa-engineer — test plan, parity and cross-client check, report
5. security-reviewer — only if the feature touches auth, money, personal data, uploads or permissions
Stop after any step that fails or raises an open question and tell me what is needed. Finish by updating docs/STATUS.md.
