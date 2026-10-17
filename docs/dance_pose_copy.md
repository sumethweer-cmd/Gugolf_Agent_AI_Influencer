# Format Bible: Dance Pose Copy (MiniMax H3 + DWPose)

Source: hands-on experiment (2026-10-14, ComfyUI). A fixed-camera
dance clip where the BODY motion is copied from a reference dance video
through DWPose (`<Video 1>` in the prompt) and the prompt only supplies
identity (`<Picture 1>`), framing and the FACE performance. Result: both
prompt variants below followed the dance well and looked good (user rating
"10/10" and "11/10"). Evidence is a handful of clips on one character — treat
the rules as tested defaults, not laws.

```
Camera:
- Fixed tripod / propped phone at chest height, medium shot (head to hips)
  — same steadiness as tripod_casual.md
- Say "the frame is the same as <Video 1>" to inherit the reference
  framing, OR describe the setting in words. Without one of the two the
  background is left to the model/Picture 1 (the prompt above says nothing
  about it) — decide on purpose.

Body / Movement:
- Delegated entirely to the pose reference. The prompt states ONLY
  "dances the same choreography as <Video 1>, moving her arms, hips and
  feet in the same order and at the same tempo, her hair and clothes
  swaying naturally with the movement".
- NEVER describe head tilts, torso angles, steps or hand shapes — they
  compete with the pose signal.

Face (the only thing the text really controls):
- One prose paragraph of OBSERVABLE actions inside the single shot:
  eyes (half-lidded, squint, crescent smile-eyes), gaze (returns to the
  lens, glances down and back up through bangs), eyebrows (lift on accents),
  mouth, smile arc (teasing half-smile → closed-eye smile → shy bright smile
  at the end).
- Never "expression like <Video 1>" / "same expression as the video" —
  the reference is for motion only; write the face yourself.
- Avoid bare mood words ("sexy", "cute") — one or two are fine as an
  overall tag ("coy, flirty and playful") but must be followed by concrete
  eye / mouth / gaze actions.

Mouth:
- Reference clips are usually someone singing, so the model may sing along.
  Decide: (a) "lips lightly parted and silently mouthing along to the song"
  (tested, 10/10) or (b) "She is a silent dancer: her mouth stays quiet and
  her lips rest softly closed or just slightly parted" (tested, also good).
  Pick one explicitly; leaving the mouth unspecified gave unwanted singing.
  Side-by-side check (reference | mouthing variant | silent-dancer variant,
  8 frames sampled at 1 fps): both copy the arm/hand poses closely; the
  mouthing variant keeps the mouth open in most frames (singing look, closer
  to the reference performer's lip-sync), the silent-dancer variant shows
  closed-mouth smiles and a sweeter, brighter look. Choose by the look wanted.

Audio:
- overall_soundscape / non_diegetic_music "N/A" worked; adding a room-tone
  soundscape ("soft room tone and the gentle rustle of clothing") with the
  silent-dancer wording also worked. Replace the audio with the original
  track in the edit.

Settings:
- 8 steps, 1.0 MP (single pass) already looked good — use as default.
  Budget frames x MP <= ~540 per segment; a 12.5 s dance (300 frames) fits one
  segment.
```

## The Load-Bearing Pattern

1. **One `[Shot 1]`, no timestamps anywhere.** A beat-by-beat face timeline
   (`00:00.000-00:01.000: ...`) made the dance drift away from the pose —
   the model appeared to follow the text schedule instead of the pose.
   (Observed once; the mechanism is a hypothesis, the outcome was clear.)
2. **Reference video = motion only.** `retention_analysis` states
   `<Video 1> ... motion_reference - the dance choreography, body movement
   and timing are followed` and nothing about the face.
3. **Face = prose, same shot.** One or two sentences (or a short paragraph)
   appended to the choreography sentence.
4. **Mouth stated explicitly** (mouthing vs silent).

## Skeleton (copy and edit)

```
subject_definitions:
<Picture 1> a young woman, her face, hairstyle, skin and outfit exactly as shown in <Picture 1>.

summary:
[reference generation] The woman from <Picture 1> performs the same dance as shown in <Video 1>, matching its choreography, movement and rhythm, with the same energy and timing. <Picture 1> defines her identity and outfit.

retention_analysis:
<Picture 1> (appears in [Shot 1]): fully_preserved - identity, facial features, hairstyle and outfit retained throughout.
<Video 1> (appears in [Shot 1]): motion_reference - the dance choreography, body movement and timing are followed.

detailed_description:
Vertical 9:16 smartphone footage, camera fixed on a tripod at chest height, the frame is the same as <Video 1>, even soft front light, fine natural camera grain.
[Shot 1] The woman from <Picture 1> dances the same choreography as <Video 1>, moving her arms, hips and feet in the same order and at the same tempo, her hair and clothes swaying naturally with the movement, until the clip ends. <MOUTH SENTENCE>. <FACE PARAGRAPH: eyes / gaze / eyebrows / smile arc, observable actions, no timestamps>

overall_soundscape:
N/A  (or: soft room tone and the gentle rustle of clothing as she moves)

non_diegetic_music:
N/A
```

## Common Failure Patterns
- Timestamped face timeline inside the shot → dance no longer matches the
  pose.
- Mouth unspecified → character sings along to invented lyrics.
- Describing head/body angles → fights DWPose.
- "Same expression as <Video 1>" → expression not controlled; also
  inherits the reference performer's look.
- Forgetting the background: "the frame is the same as <Video 1>" does not
  name a setting.

## Open Questions (not yet tested)
- Which of the three changes in the later variant (silent-dancer wording,
  longer face paragraph, room-tone soundscape) mattered — they were changed
  together.
- Behaviour with a reference video of a different length than the segment.
- Multi-segment dance chains (context continuity) — only single-segment
  clips tried.

## Best Suited For
Short single-segment (<=15 s) dance / trend clips where a reference dance
video is available and the persona face and outfit come from a Picture.
