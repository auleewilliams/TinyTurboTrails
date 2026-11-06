[Actual diagnosis](/home/leew/.hermes/cache/scratch/f243-ledge8/actual-source-diagnosis.md) · [Measurements and command exits](/home/leew/.hermes/cache/scratch/f243-ledge8/actual-source-diagnosis.json)

- Verified all RGB bytes unchanged and exactly **1,289,061** authorized exterior-alpha changes.
- Found six connected ledges plus one isolated border pixel: **(0,940), RGB(240,36,240)**.
- All six fail requested depth/envelope and full-width opaque-top requirements. No tested approved target fits exactly.
- Limited static checks also found actor and gem alpha intersections; native readability remains untested.

Recommendation: retain source **FAIL** and spending **STOP**. A key revision alone cannot resolve these failures; no background-only third call is supported.

Frozen artifacts remain unchanged. Diagnosis/static checks exited `0`; original inspector remains `2`. Spent **2/10**. Stopped at handoff.