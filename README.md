# JiZy Captcha

Frontend assets (JS + CSS + icons) for JdzCaptcha — an icon-based CAPTCHA where users select the least-displayed icon in a randomized grid. No distorted text.

This package is the client-side companion to the PHP server library [JdzCaptcha](https://jdz.joffreydemetz.com/jdzcaptcha).

## Install

```bash
npm install jdzcaptcha
```

## What's in the package

- `dist/public/js/jdzcaptcha.min.js` — client script
- `dist/public/css/jdzcaptcha.min.css` — stylesheet
- `dist/assets/jdzcaptcha/` — icon series and placeholder
- `lib/` — Less sources and icon sets for custom builds
- `cli/jpack.js`, `config/` — jpack build entrypoint and templates

## Usage

Include the built CSS and JS in your page, and add a container where the captcha should render:

```html
<link rel="stylesheet" href="/css/jdzcaptcha.min.css">
<script src="/js/jdzcaptcha.min.js"></script>

<div class="jdzc" data-series="streamline" data-theme="light"></div>
```

The server-side PHP library issues the challenge and validates the submission. See the [JdzCaptcha docs](https://jdz.joffreydemetz.com/jdzcaptcha) for full integration.

## Icon series & variants

Icons are organized as `{series}/{variant}`. The package ships with one series — **streamline** (50 icons, light variant only: black icons on a clear background). Dark-variant and additional series can be dropped into `lib/iconsets/{series}/{variant}/` for a custom build.

Select the iconset on the container via `data-series` and `data-theme`:

```html
<div class="jdzc" data-series="streamline" data-theme="light"></div>
```

## Custom build

The package ships with [jizy-packer](https://jizy.joffreydemetz.com/jizy-packer) scripts:

```bash
npm run jpack:dist   # build into dist/
npm run jpack:build  # build into build/ with custom json config 
```

## License

MIT — Joffrey Demetz