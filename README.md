# JiZy Captcha

Frontend assets (JS + CSS + icons) for JdzCaptcha — an icon-based CAPTCHA where users select the least-displayed icon in a randomized grid. No distorted text.

This package is the client-side companion to the PHP server library [JdzCaptcha](https://jdz.joffreydemetz.com/jdzcaptcha). It is published on npm as `jdzcaptcha` (the repository is `jizy-captcha`).

## Install

```bash
npm install jdzcaptcha
```

## What's in the package

- `dist/public/js/jdzcaptcha.min.js` — client script, sets the browser global `window.JdzCaptcha`
- `dist/public/css/jdzcaptcha.min.css` — stylesheet
- `dist/assets/jdzcaptcha/` — icon series and placeholder
- `lib/` — JS and Less sources and icon sets for custom builds
- `cli/jpack.js`, `config/` — jpack build entrypoint and templates

## Usage

Include the built CSS and JS in your page, add a container where the captcha should render, and
initialize it:

```html
<link rel="stylesheet" href="/css/jdzcaptcha.min.css">
<script src="/js/jdzcaptcha.min.js"></script>

<form method="post" action="/validate/">
    <!-- the CSRF token input rendered by the PHP library: name="jdzc[_jdzc-token]" -->
    <div class="jdzc"></div>
</form>

<script>JdzCaptcha.initialize('/captcha/load/', '.jdzc');</script>
```

`initialize()` POSTs to the loader URL to fetch the configuration, merges it over the defaults and
the options you pass, then builds a widget in every element matching the selector (after
`DOMContentLoaded` if the page is still loading). A widget needs the CSRF token input in its
closest `<form>`; without it, the container stays empty (the error is logged in debug mode).

The server-side PHP library issues the challenge and validates the submission. See the [JdzCaptcha docs](https://jdz.joffreydemetz.com/jdzcaptcha) for full integration.

## JS API

| Call | Description |
|---|---|
| `JdzCaptcha.initialize(loaderUrl, selector = null, options = {})` | Loads the configuration and builds the widgets. A second call only loads the new selector. |
| `JdzCaptcha.loadFromSelector(selector, options = {})` | Builds widgets for more elements with the current configuration. |
| `JdzCaptcha.reset(widgetId = null)` | Resets one widget, or all of them. |
| `JdzCaptcha.bind(event, callback, widgetId = null)` | Adds an event listener on one widget's container, or on all of them. |

Console logging and detailed error messages are off by default: set `window.JDZ_DEBUG_MODE = true`
before the script loads (or `JdzCaptcha.debugMode = true` afterwards).

### Options

| Option | Default | Notes |
|---|---|---|
| `path` | `'/captcha/request/'` | Challenge endpoint (image + selection requests). Required. |
| `series` | `'streamline'` | Icon series, written to the container's `data-series`. |
| `theme` | `'light'` | Icon variant, written to the container's `data-theme`; also adds the `jdzc-theme-<theme>` class. |
| `fontFamily` | `''` | Font applied to the widget. |
| `credits` | `'show'` | `'hide'` hides the credits line. |
| `security` | — | `clickDelay` (1500 ms), `hoverDetection` (true), `enableInitialMessage` (true: the widget waits for a click before loading), `initializeDelay` (500 ms), `selectionResetDelay` (3000 ms), `loadingAnimationDelay` (1000 ms), `invalidateTime` (2 min). |
| `fields` | — | Form field names, posted as `jdzc[<name>]`: `selection` (`_jdzc-hf-se`), `id` (`_jdzc-hf-id`), `honeypot` (`_jdzc-hf-hp`), `token` (`_jdzc-token`). |
| `messages` | — | UI strings: `initialization.loading` / `.verify`, `header`, `correct`, `incorrect.title` / `.subtitle`, `timeout.title` / `.subtitle`. |
| `callbacks` | — | `{ eventName: fn }`, bound on each new widget's container. |

### Events

Each widget dispatches `CustomEvent`s on its container, with `event.detail.captchaId`:
`jdzc.init` (challenge loaded; `detail.options` too), `jdzc.success`, `jdzc.error`,
`jdzc.timeout` (too many wrong selections), `jdzc.reset`, `jdzc.invalidated`, `jdzc.refreshed`.

After a correct selection the widget stays in its success state (since 2.0.9 it no longer resets
itself); after a wrong one it resets after `security.selectionResetDelay`.

## Icon series & variants

Icons are organized as `{series}/{variant}`. The package ships with one series — **streamline** (50 icons, light variant only: black icons on a clear background). Dark-variant and additional series can be dropped into `lib/iconsets/{series}/{variant}/` for a custom build.

Select the iconset with the `series` and `theme` options; the widget writes them on the container
as `data-series` / `data-theme` and sends them to the server with each challenge request.

## Theming

The colours are CSS custom properties set at `:root` (`--jizy-captcha-color`, `-bg`, `-border`,
`-header`, `-subtitle`, `-footer`, `-footer-link`, `-success`, `-error`, …). Override them in a
stylesheet loaded after this one. The `jdzc-theme-dark` class on the container switches to the
dark palette.

## Custom build

The package ships with [jizy-packer](https://jizy.joffreydemetz.com/packer) scripts:

```bash
npm run jpack:dist         # build into dist/
npm run jpack:build        # build into build/export/ (add -- --config <abs path to a JSON file, or a JSON string>)
npm run jpack:dist-debug   # same as jpack:dist, with verbose logging
npm run jpack:build-debug
```

The custom config can declare the `iconsets` to copy, e.g.
`{"iconsets":[{"theme":"streamline","variant":"light"}]}`; it defaults to `streamline/light`.
Iconsets that are not under `lib/iconsets/` are skipped: the consumer serves them itself.

## Tests

```bash
npm test                # vitest (jsdom)
npm run test:watch
npm run test:coverage
```

## License

MIT — Joffrey Demetz
