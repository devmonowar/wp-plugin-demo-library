# wp-plugin-demo-library

Remote demo library for [devmonowar](https://github.com/devmonowar)'s WordPress
plugins. Served over **GitHub Pages** and consumed by each plugin's built-in
"Demo Library" screen, so demos can be added or updated **without shipping a new
plugin release**.

> This repository contains **only demo resources** (JSON + images). It never
> contains WordPress plugin code, and nothing here is bundled into any plugin's
> WordPress.org package.

## Layout

```
wp-plugin-demo-library/
└── general-slider/
    ├── demo-library.json      # manifest: list of demos + metadata
    ├── demos/                 # one JSON per demo (slides, settings, image URLs)
    ├── previews/              # card thumbnails
    └── assets/
        ├── images/            # full-size slide images (sideloaded on import)
        ├── fonts/  svg/  videos/
```

Each plugin gets its own top-level folder (`general-slider/`, future plugins…).

## GitHub Pages

Enable **Settings → Pages → Deploy from branch → `main` / `/` (root)**.

Base URL:

```
https://devmonowar.github.io/wp-plugin-demo-library/
```

General Slider manifest:

```
https://devmonowar.github.io/wp-plugin-demo-library/general-slider/demo-library.json
```

## Adding a demo

1. Build the slider, then use **Demo Export** in General Slider to get a ZIP
   (demo JSON with image URLs already rewritten + the image files).
2. Drop the images into `general-slider/assets/images/` and the JSON into
   `general-slider/demos/`.
3. Add the demo's entry to `general-slider/demo-library.json`.
4. Record the image source/license in `general-slider/CREDITS.md`.
5. Commit & push. The new demo appears in the plugin automatically (after the
   6-hour manifest cache expires, or a manual refresh).

No plugin release or Git tag required.

## Image licensing

Use only **CC0 / public-domain** or explicitly redistribution-friendly images
(Openverse with the CC0 filter, Pexels, Pixabay). Images are downloaded onto
end-user sites on import, so the license must allow that. See `CREDITS.md`.
