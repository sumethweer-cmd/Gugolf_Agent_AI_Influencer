---
name: content-request
description: Turns one specific content idea for a named AI-influencer character into a validated, generate-ready ComfyUI prompt (e.g. "อยากได้ content ของ momo แนว streamer reaction กับคลิปเรื่อง..."). Use when the user already gave a specific topic/idea for a character, not just "plan a calendar." Also invoked internally by content-calendar once per day.
---

# Content Request (Entry B) — Single-Item Pipeline Orchestrator

This is the one path every content item goes through, whether it came from a
human's specific ask or from `content-calendar`'s day-by-day loop. It runs the
layers below in order and owns the validation retry loop.

## Pipeline

```
content_input
     │
     ▼
content-director        → content_spec.yaml   (schemas/content_spec.yaml)
     │
     ▼
delivery-format-selector → format_spec.yaml (delivery part)
     │
     ▼
format-router (skip if delivery_format is carousel/story and no single dynamic shot)
     │                  → format_spec.yaml (visual_format part)
     ▼
prompt-enhancer         → enhanced_spec.yaml
     │
     ▼
comfyui-compiler        → compiled_prompt.yaml (one per shot/slide)
     │
     ▼
prompt-validator (TEMPORARILY DISABLED 2026-09-05 — see Step 2, skip straight through)
     │
  ┌──┴──┐
 PASS  FAIL → reprocess from validation_report.retry_layer, re-running every
  │           layer from there back down to comfyui-compiler, then validate again
  ▼
report result to whoever called this skill (human or content-calendar)
```

## Step 0 — Build/confirm content_input

If invoked directly by a human: confirm character + idea are both present
(`schemas/content_input.yaml`, Entry B fields). If a field the schema needs is
missing (e.g. no platform/delivery format hint), ask once rather than guessing
silently — except `requested_delivery_format`/`platform`, which are allowed to
be null (that's exactly what `delivery-format-selector` exists to decide).

If invoked by `content-calendar`: use the `content_input` it already built —
don't re-ask the user anything the calendar step already confirmed.

## Step 1 — Run the layers

Invoke each layer skill in order via the Skill tool, passing the previous
layer's output forward. Each layer skill is responsible for reading its own
required knowledge files (character DNA, content DNA, format bible, platform
spec, model spec) — this skill just sequences them and carries the schema
objects between steps.

## Step 2 — Validation loop

**TEMPORARILY DISABLED (2026-09-05, per human instruction) — do not invoke
`prompt-validator` right now.** The human paused this step because the
content itself (content-director's dialogue, prompt-enhancer's delivery) was
still reading as bland/textbook and it wasn't worth spending validator tokens
polishing the technical/format correctness of writing that needed a creative
rewrite first, not a compliance check. Skip straight to Step 3 and write
output with `status: pending` (never `qc_fail` while this is disabled — there's
no validation_report to attach). Set `validation_report: null`.

**Re-enable this step once a human confirms the creative quality problem is
fixed** (see content-director's Voice Check and prompt-enhancer's Human
Delivery Check, both added 2026-09-05) — at that point, restore the block
below and go back to always validating:

<details>
<summary>Validation loop (restore when re-enabled)</summary>

Invoke `prompt-validator` **as a subagent** (Agent tool), giving it only:
`compiled_prompt.yaml` + the specific DNA/content_dna/format_bible/platform_spec
files that were actually used — never the reasoning trail that produced them.
This is deliberate: a validator sharing context with the layer that just wrote
the prompt tends to grade its own work leniently.

- On `pass: true` → hand `compiled_prompt` back to the caller AND write the
  output (Step 3 below) with `status: pending`.
- On `pass: false` → read `retry_layer`, re-invoke that skill and every skill
  after it in the pipeline order above (never just patch one field in place —
  downstream layers may depend on what changed). Re-validate. Cap at 3 retries;
  if still failing, still write the output (Step 3) but with `status: qc_fail`
  and the failing `validation_report` attached — a human reviews it on the
  student instead of it silently disappearing.

</details>

## Step 3 — Write output (local files)

Write each compiled prompt as a local .txt the student can copy straight into the workflow:
```
content_output/{character}/{date}/item{NN}_compiled_prompt.txt
```
(`output_granularity: per_content_item` models like minimax-h3 → the full structured sections as one file; `per_shot` models like krea → one file per shot, `item{NN}_shot{N}_compiled_prompt.txt`.)

Also write a short `item{NN}_notes.md` next to it: a few-word title, `content_category`, `core_mechanic`, `delivery_format`, `visual_format`, `platform`, `model`, the in-character line, and any warnings (experimental template, estimated timing, items the student must verify).

**If `comfyui-compiler` split the item into multiple duration-limited segments** (minimax-h3 items over ~15s — see that model spec's "Duration Limit" section), write each segment as its own file, in order: `item{NN}_part{N}_compiled_prompt.txt`, and say in the notes that segment 1 is a "shot" segment and the later ones are "context" segments.

**Before creating a new item**, look in `content_output/{character}/` for earlier `item*_notes.md` files that contain a "fix next time" note from the student — read it so you do not repeat the same mistake.

## Notes
- This skill owns state for exactly one content item. `content-calendar` runs
  one instance of this per day/item, isolated (see that skill's Step 2).
- Never skip `prompt-validator` to save time, even for a "simple" item — the
  whole point of this pipeline is catching problems before GPU generation, not after.
