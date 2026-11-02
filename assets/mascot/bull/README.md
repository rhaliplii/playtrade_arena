# Profit.com Bull — mascot assets

Learn does not render the Bull in real time. Each state is a short pre-rendered
transparent clip with a still of the same artwork behind it, and the front end
picks between them. Nothing in the UI names a file.

    animations/   bull-<state>.webm        transparent VP9, full figure 320x400
                  bull-<state>-bust.webm   head crop 300x300, where used
    static/       bull-<state>.webp        the fallback, same render
                  bull-<state>-bust.webp
    manifest.json state -> files

## The contract

A state with a `clip` entry animates. A state without one shows its `still`.
To add an animation: drop the file in `animations/`, add the entry, reload.
No page code changes.

## States

| state | length | role |
|---|---|---|
| `idle` | 6.0s loop | breathing, and nothing else |
| `idle-glance` | 1.4s | micro-event, scheduled every 8–15s |
| `idle-shift` | 2.4s | micro-event, scheduled every 11–21s |
| `thinking` | 2.0s | a question has appeared |
| `look-left` / `look-right` | 0.8s | attention shift |
| `point-left` / `point-right` | 1.6s | look here — opens with the head turn |
| `acknowledge` | 0.8s | the smallest positive beat |
| `correct` | 1.3s | a right answer |
| `try-again` | 1.5s | a wrong one, supportively |
| `celebrate` | 2.0s | a lesson finished |
| `celebrate-strong` | 2.6s | a whole learning path finished |

`wave` exists in the state table with no clip. It needs a raised arm, which
this mesh cannot do (see below), and section 37 of the brief makes it rare
anyway — the Bull acknowledges instead.

## Why idle is only breathing

A six-second loop played forever reads as a loop. So `idle` carries breathing
and nothing more, and the small glances and weight shifts that make it look
unrehearsed are separate clips the player fires at random intervals. The
learner sees a different few seconds every time.

There is no blink. The eyes are geometry without lids, so a blink would mean
editing the approved face.

## The deformation limit

Shoulder abduction past roughly 30 degrees opens a seam in the hoodie: the
sleeve is modelled as a tube buried inside the hoodie body, and rotating the
arm swings its buried end out through the surface. Measured on the rig — clean
at 25 degrees, a ripple at 35, torn at 45.

So every gesture here is built from the head, neck, torso and forearm. That is
also what section 10 actually asks a point to be: head turn, upper-body
orientation, elbow bent, forearm toward the target. A raised-arm wave or a
two-armed celebration would need the sleeve geometry repaired first.

## Provenance

Authored in `assets/mascot/rig/80_library.py` on the rig in
`profit_bull_skinned.blend`, rendered through the same Cycles / AgX setup the
approved stills came from, and installed by `90_install_assets.py`. A neutral
render from that rig measures 0.28/255 mean pixel error against
`assets/mascot/reference/neutral.png`, so a paused frame of any clip belongs
to the approved render set.

`tools/bull-clip-check.html` measures any clip's duration, alpha coverage and
actual motion. Use it before shipping one: an earlier batch looked perfect
frame-by-frame and turned out to move almost nothing.

## Weight

The hero fetches `idle` (373 KB) plus whatever it enters — roughly 750 KB of
video once the two idle micro-clips have been pulled, all lazily and all
cached. The page itself is interactive long before any of it: the still is on
screen from the first paint and the clips fade in over it.

Lowering the encoder quality was measured and rejected: MEDIUM saves about 10%
on `idle` (373 → 336 KB). The bytes are in the alpha channel and the frame
count, so the real lever would be rendering the slow clips at 15fps — worth
doing if the budget ever matters, and it would roughly halve them.

## In the Playtrade Academy

Copied from profit_learn with the same rig, clips and state machine
(`academy/bull.js`). Two additions:

- **manifest.js.** The page loads the manifest as a script rather than fetching
  `manifest.json`, so the clips also play when the Academy is opened straight
  from disk. Edit `manifest.json`, then run `python3 tools/bull-manifest.py`.
- **Safari clips.** WebKit (desktop Safari, and every browser on iPhone/iPad)
  drops WebM's alpha channel, so each clip has an HEVC-with-alpha `.mov` twin,
  listed as `clipHevc`. Rebuild them after re-rendering with
  `tools/bull-hevc/build.sh` (all clips, ~30s) or
  `tools/bull-hevc/build.sh bull-idle.webm` (one). It needs only macOS: Chrome
  decodes the WebM frames, a small Swift program encodes the .mov.
