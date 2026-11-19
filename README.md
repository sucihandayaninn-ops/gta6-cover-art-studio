# Viceframe

An original, fully local cover art studio. Seven angled comic panels turn a photo and title into a neon sunset crime poster. No account, installation, API key, runtime dependency, or external request is needed.

## Open the studio

```sh
node serve.ts
```

Open `http://localhost:8080/` in a desktop browser. The app itself is plain static files in `app/`; any static HTTP server works. All image processing happens in the browser.

1. Pick one of the included photos, or choose/drop your own images.
2. Select a frame on the poster or in the numbered filmstrip, then choose its photo. “Use selected photo in all panels” fills the entire collage from one image.
3. Drag the photo inside its panel. Use the zoom slider or mouse wheel for closer crops. Arrow keys move the crop when the canvas is focused; Shift moves farther.
4. Edit the title and choose Vice, Heatwave, After hours, or Ocean.
5. Download a full-resolution PNG with any of the three export buttons: 1080 × 1080, 1080 × 1350, or 1920 × 1080. Each format has its own composition geometry; faces are cropped rather than stretched.

The four original supporting scenes are replaceable, independently cropped canvas illustrations. The photo treatment combines edge-preserving smoothing, ink contours, stepped pigments, split-tone grades, print grain, and a vignette. The title uses original outlined and extruded lettering treatment around a licensed display face. The VI chapter badge is drawn from original paths. There are no game assets, official logos, or copied game fonts.

## Screenshot scenes

- `?shot=cover&photo=boulevard&caption=Sunset%20Syndicate` — finished cover only.
- `?shot=editor&photo=pier&caption=Pier%20Pressure` — populated editor.
- Optional: `grade=vice|heat|night|coast` and `format=square|portrait|wide`.

The renderer uses seeded texture and scene generation. `window.__shotReady` becomes true after the cover pixels and local font are ready. Tiny platform antialiasing differences can vary a color channel by one level, without changing the composition.

`shots.json` defines the four submitted views. With the supplied Chromium and Python/Pillow installed, run:

```sh
node scripts/capture.mjs
node scripts/verify.mjs
```

The capture helper uses the supplied headless Chromium through CDP to pin the viewport, avoiding the toolbar gap and compositor pause in this host's Chrome 145 command-line screenshot handler. It records the actual rendered page and only JPEG-encodes it to satisfy the screenshot byte limit. The verification script checks the editor fit, repeatability, uploads, individual photo assignment, dragging, one-photo fill, live captions, grades, three real PNG downloads, cover-only mode, and absence of external app requests. These scripts are development tools and are not app dependencies.

## Build the entry

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/`, then creates `out/dossier.json` with the unchanged kit library in `vendor/makefun-app.ts`.

## Credits and licenses

- App code and original canvas illustrations: MIT, see `LICENSE`.
- Anton display font: SIL Open Font License 1.1, bundled with its license in `app/fonts/OFL.txt`. It is not a font from a game.
- `app/samples/pier.jpg` and `app/samples/boulevard.jpg`: the competition kit's image-model-generated sample photos, cleared by the kit for use.

No photos are sent to a server. Uploaded images live only in the current browser session. Supported input formats follow the browser's image decoder; JPEG, PNG, and WebP are suitable choices.
