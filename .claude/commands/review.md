---
description: Revisa el diff actual con el subagent review (read-only).
---

Delegá en el subagent `review` la revisión de: $ARGUMENTS

Si no se indicó nada, el alcance es `git diff develop...HEAD` más los cambios sin commitear.

Devolvé los hallazgos agrupados por severidad (High → Low). No apliques fixes salvo que te lo pida.
