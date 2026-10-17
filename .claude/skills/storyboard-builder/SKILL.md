---
name: storyboard-builder
description: Turns a content idea, a finished pipeline item, or a reference teardown into a scene-by-scene visual storyboard, with one reference image per scene. Each scene lists character(s), setting, script/dialogue, lighting, camera angle/movement, and an ordered action sequence, so the student can review the plan visually before writing the final video prompt. Image generation uses the agent's own built-in image tool when it has one (e.g. Codex image generation); otherwise it calls the OpenAI or Gemini image API with the student's own key. Triggers: "build a storyboard", "storyboard this", "make storyboard images", "ทำ storyboard", "ทำสตอรี่บอร์ด".
---

# storyboard-builder

Goal: turn an idea into a real storyboard — a text breakdown per scene PLUS a generated reference image per scene — so the student reviews the plan visually before committing to the final video prompt (`content-request` / `comfyui-compiler`). The agent is a patient mentor: explain what a storyboard is in one or two sentences the first time, then work step by step.

## Input → Output
- **Input (any one of):** the student's idea or script · a finished pipeline item from `content-request` (`content_output/<character>/<date>/item01_...`) · a `teardown.md` if the student already has one (this kit does not include the tool that creates teardowns). Also needed: which character the storyboard is for (ask if not given) — the character's locked identity block from `characters/<character>/character_dna.md` must be slotted into every scene.
- **Output (in `storyboard/<slug>/`):** `storyboard.md` (scene-by-scene text) + `scene-01.png`, `scene-02.png`, … (one reference image per scene).

## Step 0 — decide how images will be made (tell the student plainly)
1. **If you (the agent) have a built-in image-generation tool** — for example Codex with its image generation — use it directly for Step 4. **No API key is needed.** Say so to the student.
2. **If you do not** (Claude Code cannot create images by itself) — tell the student honestly: *"I can't draw images myself. To make storyboard pictures I need an image API key (OpenAI or Gemini). You can skip pictures and keep the text storyboard only."* Offer both options and let the student choose. If they want pictures, follow `docs/API_KEYS.md` (they put the key in `.env` themselves — never in chat), run `scripts/doctor.sh` and show the result.
   - Needs `curl`, `jq`, and `OPENAI_API_KEY` or `GEMINI_API_KEY` in the environment or in the project's `.env`.
   - The model names inside `scripts/generate-image.sh` (`gpt-image-1`, `gemini-2.5-flash-image`) may be outdated: if a request fails with a "model not found/not allowed" message, tell the student, do not guess a fix silently; check the provider's current image model name together.
   - Image APIs cost money and may need extra account verification or billing set up — tell the student to check pricing/quota on the provider's site first, and ask before generating many images.

## Step 1 — Read the source
Read the idea/script/pipeline item (or the teardown's beat table) in full. For a teardown, the beat table is the source of truth for what happens each second.

## Step 2 — Break into scenes
Group beats into a manageable number of scenes (usually 4–8 for a 15–30s clip, not one per second) — contiguous beats with the same setting and camera setup belong together, the same way `format-router` / `prompt-enhancer` group beats into shots. Each scene must be a distinct visual moment worth its own picture.

## Step 3 — Write each scene in full detail
For every scene write ALL of:
- **Character(s)** — who is in frame (from the character's locked identity block)
- **Setting** — where, matching the idea/teardown
- **Script** — the line(s) spoken in this scene (localized, never copied verbatim from someone else's reel)
- **Lighting** — natural/artificial, hard/soft, color temperature
- **Camera** — angle, height, framing, movement (static/handheld/push-in/pan)
- **Action** — a clear, ordered, step-by-step description of physical action (specific movements in sequence, not a vibe)

Write this to `storyboard.md`, one scene per section, numbered to match the image filenames. **Show the text storyboard to the student and wait for their OK before making images.**

## Step 4 — One reference image per scene
Build a single dense image prompt from the scene's Character / Setting / Lighting / Camera / Action — the Script field is NOT part of the image prompt (no speech bubbles or on-screen text in a still).
- Built-in image tool: generate each scene image, save as `storyboard/<slug>/scene-NN.png`.
- Otherwise: `scripts/generate-image.sh --provider openai|gemini --prompt "<scene prompt>" --out storyboard/<slug>/scene-NN.png`

Run scenes **one at a time** and check each result with the student before the next, so one failure does not waste calls.

## Step 5 — Hand off
Tell the student the storyboard and images are ready in `storyboard/<slug>/`. After they approve (or after revising specific scenes — re-run Step 4 for just those), the approved storyboard becomes the idea fed into `content-request` for the final `minimax-h3` prompt. The scene images can also be used as reference pictures in the workflow (crop out any text or watermarks first).

## Security — API keys
Never ask the student to paste an API key into chat. They set it as an environment variable or in a local `.env` file that is git-ignored; you may only check that the variable is non-empty without printing its value. Never commit a key.

## Anti-patterns
- Do NOT generate images before the text storyboard is complete and shown to the student.
- Do NOT put the spoken script into the image prompt as on-screen text.
- Do NOT skip the per-scene breakdown — it is what makes each image prompt specific.
- Do NOT pretend you can generate images if you have no image tool and no API key.
- Do NOT generate many images (cost) without telling the student what it may cost and getting a yes.

## Related Skills
- `content-request` / `comfyui-compiler` — the next step after the storyboard is approved
