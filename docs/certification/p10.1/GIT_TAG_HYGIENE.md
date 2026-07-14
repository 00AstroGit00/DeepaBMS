# Git Tag Hygiene — DeepaBMS v1.0.0 (P10.1 / R-7)

## Inspection

```
$ git tag -l
2.0
v1.0.0
```

| Tag | Points to | Assessment |
|-----|-----------|------------|
| `v1.0.0` | `34d6083` (HEAD of `main`, the release commit) | ✅ Correct, intended GA tag |
| `2.0` | `10faa24` ("Add README.md") — an **ancestor** of `v1.0.0` | ❌ Erroneous / orphan |

## Analysis

- `2.0` is a **mislabeled orphan tag**: it sits on a very early commit
  (`10faa24`, "Add README.md") that predates essentially all of the v1.0.0
  codebase. It is not a real release of record and conflicts with the
  `v1.0.0` semantic-version lineage.
- It is almost certainly an accidental tag (e.g., a mistyped `v2.0` or a
  leftover from an early experiment).

## Recommendation

**DELETE** the erroneous `2.0` tag — locally and (if present) on the remote:

```bash
git tag -d 2.0                # local
git push origin --delete 2.0  # remote (requires maintainer authorization)
```

Keep `v1.0.0` as the sole intended release tag for this GA candidate. Future
releases should follow `vMAJOR.MINOR.PATCH` only.

## Action taken by remediation team

**None (per R-7 rule: "Never delete automatically").** Deletion requires
maintainer authorization. This blocker is **resolved by recommendation**; the
physical tag removal is a maintainer action item. Until removed, the tag itself
is harmless (it does not affect the `v1.0.0` commit or artifacts) but should be
cleaned before public GA announcement.
