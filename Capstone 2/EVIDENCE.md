# Acceptance Probe Evidence

This document records the results of each acceptance probe for the AI Image Understanding & Content Matching Engine.

## Probe 1: Basic Match
**Requirement**: Valid post + correct image in corpus → Top-1 = expected_image_id, guard_verdict = "accepted"

- **Test Command**: `python -m eval.runner --probe 1`
- **Expected**: Top-1 precision ≥ 80% on labeled test set
- **Artifacts**: `eval/results/probe_1.json`, audit logs
- **Status**: ☐ PASS / ☐ FAIL
- **Evidence**: [Link to test run output]

## Probe 2: Wolf vs Fox Rejection
**Requirement**: Post: "red fox", Candidate: wolf image → Guard rejects with `rejection_reason = "species_conflict:wolf_for_fox"`

- **Test Command**: `python -m eval.probes.probe_2_wolf_vs_fox`
- **Expected**: Deterministic rejection with explicit reason string
- **Artifacts**: `eval/results/probe_2.json`
- **Status**: ☐ PASS / ☐ FAIL
- **Evidence**: [Link to test run output]

## Probe 3: Confidence Cutoff
**Requirement**: Low-confidence image (< 0.75) → Guard rejects with `rejection_reason = "low_confidence"`

- **Test Command**: `python -m eval.probes.probe_3_confidence_cutoff`
- **Expected**: Rejection at exactly 0.75 threshold boundary
- **Artifacts**: `eval/results/probe_3.json`
- **Status**: ☐ PASS / ☐ FAIL
- **Evidence**: [Link to test run output]

## Probe 4: No Match Trigger
**Requirement**: Post with no qualifying candidates → `guard_verdict = "no_match"` for all candidates

- **Test Command**: `python -m eval.probes.probe_4_no_match_trigger`
- **Expected**: Audit rows for every candidate evaluated, final verdict = "no_match"
- **Artifacts**: `eval/results/probe_4.json`, `recommendation_audits` table
- **Status**: ☐ PASS / ☐ FAIL
- **Evidence**: [Link to test run output]

## Probe 5: Cost Tracking
**Requirement**: Every AI operation logged to `ai_cost_logs` with operation_type, model, tokens, estimated_cost_usd

- **Test Command**: `python -m eval.probes.probe_5_cost_tracking`
- **Expected**: Vision, embedding_image, embedding_text operations all logged with non-zero costs
- **Artifacts**: `eval/results/probe_5.json`, `ai_cost_logs` table
- **Status**: ☐ PASS / ☐ FAIL
- **Evidence**: [Link to test run output]

## Probe 6: Audit Completeness
**Requirement**: Every match attempt logged in `recommendation_audits` (count = candidates evaluated per post)

- **Test Command**: `python -m eval.probes.probe_6_audit_completeness`
- **Expected**: Audit count matches candidate evaluation count for each post
- **Artifacts**: `eval/results/probe_6.json`, `recommendation_audits` table
- **Status**: ☐ PASS / ☐ FAIL
- **Evidence**: [Link to test run output]

---

## Summary

| Probe | Status | Key Metric |
|-------|--------|------------|
| 1. Basic Match | ☐ | Top-1 Precision |
| 2. Wolf vs Fox | ☐ | Rejection Reason Accuracy |
| 3. Confidence Cutoff | ☐ | Threshold Enforcement |
| 4. No Match Trigger | ☐ | No-Match Rate |
| 5. Cost Tracking | ☐ | Cost Log Coverage |
| 6. Audit Completeness | ☐ | Audit Coverage |

**Overall**: ☐ ALL PROBES PASS / ☐ SOME PROBES FAIL

*Fill in after test execution*