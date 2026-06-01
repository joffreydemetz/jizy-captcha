import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Fetch module so we can control success/error responses without touching the network.
vi.mock('../lib/js/fetch.js', () => ({ default: vi.fn() }));

import Fetch from '../lib/js/fetch.js';
import { CSS, defaults } from '../lib/js/constants.js';
import { Widget } from '../lib/js/widget.js';

const mockFetch = Fetch;

const buildOptions = (overrides = {}) => {
    const opts = JSON.parse(JSON.stringify(defaults));
    return { ...opts, ...overrides, security: { ...opts.security, ...(overrides.security || {}) } };
};

const buildHostElement = (token = 'csrf-token') => {
    document.body.innerHTML = `
        <form>
            <input type="hidden" name="jdzc[${defaults.fields.token}]" value="${token}" />
            <div id="host"></div>
        </form>
    `;
    return document.getElementById('host');
};

describe('Widget.create — guards', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        document.body.innerHTML = '';
    });

    it('returns null when the element argument is falsy', () => {
        expect(Widget.create(null, buildOptions())).toBeNull();
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns null when options.path is missing', () => {
        const host = buildHostElement();
        const opts = buildOptions();
        delete opts.path;
        expect(Widget.create(host, opts)).toBeNull();
        expect(host.dataset.jdzcId).toBeUndefined();
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns null when options is missing entirely', () => {
        const host = buildHostElement();
        expect(Widget.create(host, undefined)).toBeNull();
    });

    it('returns null when the element already has data-jdzc-id', () => {
        const host = buildHostElement();
        host.dataset.jdzcId = '12345';
        expect(Widget.create(host, buildOptions())).toBeNull();
        expect(host.dataset.jdzcId).toBe('12345');
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns a Widget instance for valid input', () => {
        const host = buildHostElement();
        const w = Widget.create(host, buildOptions());
        expect(w).toBeInstanceOf(Widget);
        expect(typeof w.id).toBe('number');
    });
});

describe('Widget — initial state (enableInitialMessage true)', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        document.body.innerHTML = '';
    });

    it('renders the initial holder and stamps the element with theme + series + id', () => {
        const host = buildHostElement();
        const w = new Widget(host, buildOptions());
        expect(host.dataset.jdzcId).toBeDefined();
        expect(Number(host.dataset.jdzcId)).toBe(w.id);
        expect(host.getAttribute('data-theme')).toBe('light');
        expect(host.getAttribute('data-series')).toBe('streamline');
        expect(host.classList.contains('jdzc-theme-light')).toBe(true);
        expect(host.classList.contains(CSS.init)).toBe(true);
        // No fetch yet — we're still on the initial message.
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('clicking the initial holder transitions into the challenge state', () => {
        const host = buildHostElement();
        new Widget(host, buildOptions());
        host.click();
        expect(host.classList.contains(CSS.init)).toBe(false);
        // Now the challenge holder has been rendered → fetch should have fired.
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const fetchOpts = mockFetch.mock.calls[0][0];
        expect(fetchOpts.url).toBe(defaults.path);
        expect(fetchOpts.type).toBe('POST');
        expect(fetchOpts.headers).toEqual({ 'X-JdzCaptcha-Token': 'csrf-token' });
    });
});

describe('Widget — generate without initial message', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        document.body.innerHTML = '';
    });

    it('renders the challenge holder and immediately fetches when enableInitialMessage = false', () => {
        const host = buildHostElement();
        const opts = buildOptions({
            security: { enableInitialMessage: false, loadingAnimationDelay: 0 },
        });
        new Widget(host, opts);
        expect(host.querySelector(`.${CSS.boxB}`)).toBeTruthy();
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('defers the initial Fetch via setTimeout when loadingAnimationDelay > 0', () => {
        vi.useFakeTimers();
        try {
            const host = buildHostElement();
            const opts = buildOptions({
                security: { enableInitialMessage: false, loadingAnimationDelay: 200 },
            });
            new Widget(host, opts);
            // Nothing fired synchronously
            expect(mockFetch).not.toHaveBeenCalled();
            // After the delay, the deferred load() runs and triggers Fetch
            vi.advanceTimersByTime(200);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });

    it('aborts when the form has no CSRF token', () => {
        document.body.innerHTML = '<form><div id="host"></div></form>';
        const host = document.getElementById('host');
        new Widget(host, buildOptions({ security: { enableInitialMessage: false, loadingAnimationDelay: 0 } }));
        expect(mockFetch).not.toHaveBeenCalled();
    });
});

describe('Widget — generateCaptchaId', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        document.body.innerHTML = '';
    });

    it('produces an integer < 10^13', () => {
        const host = buildHostElement();
        const w = new Widget(host, buildOptions());
        expect(Number.isInteger(w.id)).toBe(true);
        expect(w.id).toBeGreaterThanOrEqual(0);
        expect(w.id).toBeLessThan(10 ** 13);
    });
});

describe('Widget — createHeaders', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        document.body.innerHTML = '';
    });

    it('returns the X-JdzCaptcha-Token header when a token is given', () => {
        const host = buildHostElement();
        const w = new Widget(host, buildOptions());
        expect(w.createHeaders('abc')).toEqual({ 'X-JdzCaptcha-Token': 'abc' });
    });

    it('returns an empty object when token is empty', () => {
        const host = buildHostElement();
        const w = new Widget(host, buildOptions());
        expect(w.createHeaders('')).toEqual({});
        expect(w.createHeaders(null)).toEqual({});
    });
});

describe('Widget — submitIconSelection', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        document.body.innerHTML = '';
    });

    it('writes the selection coordinates and id into the hidden inputs', () => {
        const host = buildHostElement();
        const opts = buildOptions({ security: { enableInitialMessage: false, loadingAnimationDelay: 0 } });
        const w = new Widget(host, opts);

        // generate() inserted the holder; widget.js then needs the selection cursor element
        // to exist before submitIconSelection runs. We have to fake the icon holder bits.
        w.$iconHolder = host.querySelector(`.${CSS.boxB}`);
        w.$iconHolder.innerHTML = `<div class="${CSS.selection}"><i></i></div>`;
        w.captchaImageWidth = 200;

        w.submitIconSelection(50, 75);

        const sel = host.querySelector(`input[name="jdzc[${defaults.fields.selection}]"]`);
        const id = host.querySelector(`input[name="jdzc[${defaults.fields.id}]"]`);
        expect(sel.getAttribute('value')).toBe('50,75,200');
        expect(id.getAttribute('value')).toBe(String(w.id));
    });

    it('does nothing if a submission is already in flight', () => {
        const host = buildHostElement();
        const opts = buildOptions({ security: { enableInitialMessage: false, loadingAnimationDelay: 0 } });
        const w = new Widget(host, opts);
        w.$iconHolder = host.querySelector(`.${CSS.boxB}`);
        w.$iconHolder.innerHTML = `<div class="${CSS.selection}"><i></i></div>`;

        const callsBefore = mockFetch.mock.calls.length;
        w.submitting = true;
        w.submitIconSelection(10, 10);
        expect(mockFetch.mock.calls.length).toBe(callsBefore);
    });

    it('is a no-op when xPos or yPos is undefined', () => {
        const host = buildHostElement();
        const opts = buildOptions({ security: { enableInitialMessage: false, loadingAnimationDelay: 0 } });
        const w = new Widget(host, opts);
        w.$iconHolder = host.querySelector(`.${CSS.boxB}`);
        w.$iconHolder.innerHTML = `<div class="${CSS.selection}"><i></i></div>`;
        const callsBefore = mockFetch.mock.calls.length;
        w.submitIconSelection(undefined, undefined);
        expect(mockFetch.mock.calls.length).toBe(callsBefore);
        expect(w.submitting).toBe(false);
    });
});

describe('Widget — events', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        document.body.innerHTML = '';
    });

    it('fires jdzc.reset on reset()', () => {
        const host = buildHostElement();
        const opts = buildOptions({ security: { enableInitialMessage: false, loadingAnimationDelay: 0 } });
        const w = new Widget(host, opts);
        const handler = vi.fn();
        host.addEventListener('jdzc.reset', handler);
        w.reset();
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail).toEqual({ captchaId: w.id });
    });
});

describe('Widget — registerSelectionEvents / unregisterSelectionEvents', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        document.body.innerHTML = '';
    });

    it('attaches the four mouse handlers and tracks them on the selection node', () => {
        const host = buildHostElement();
        const w = new Widget(host, buildOptions({ security: { enableInitialMessage: false, loadingAnimationDelay: 0 } }));
        w.$iconHolder = host.querySelector(`.${CSS.boxB}`);
        w.$iconHolder.innerHTML = `<div class="${CSS.selection}"><i></i></div>`;
        w.registerSelectionEvents();
        const sel = host.querySelector(`.${CSS.selection}`);
        expect(sel._jdzc_listeners).toBeDefined();
        expect(Object.keys(sel._jdzc_listeners).sort()).toEqual(['click', 'mouseenter', 'mouseleave', 'mousemove']);
    });

    it('is idempotent — a second register call does nothing', () => {
        const host = buildHostElement();
        const w = new Widget(host, buildOptions({ security: { enableInitialMessage: false, loadingAnimationDelay: 0 } }));
        w.$iconHolder = host.querySelector(`.${CSS.boxB}`);
        w.$iconHolder.innerHTML = `<div class="${CSS.selection}"><i></i></div>`;
        w.registerSelectionEvents();
        const first = host.querySelector(`.${CSS.selection}`)._jdzc_listeners;
        w.registerSelectionEvents();
        const second = host.querySelector(`.${CSS.selection}`)._jdzc_listeners;
        expect(second).toBe(first);
    });

    it('unregisterSelectionEvents removes the cached listener bag', () => {
        const host = buildHostElement();
        const w = new Widget(host, buildOptions({ security: { enableInitialMessage: false, loadingAnimationDelay: 0 } }));
        w.$iconHolder = host.querySelector(`.${CSS.boxB}`);
        w.$iconHolder.innerHTML = `<div class="${CSS.selection}"><i></i></div>`;
        w.registerSelectionEvents();
        w.unregisterSelectionEvents();
        const sel = host.querySelector(`.${CSS.selection}`);
        expect(sel._jdzc_listeners).toBeUndefined();
    });
});

describe('Widget — mouse handlers', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        document.body.innerHTML = '';
    });

    const setup = () => {
        const host = buildHostElement();
        const w = new Widget(host, buildOptions({ security: { enableInitialMessage: false, loadingAnimationDelay: 0 } }));
        w.$iconHolder = host.querySelector(`.${CSS.boxB}`);
        w.$iconHolder.innerHTML = `<div class="${CSS.selection}"><i></i></div>`;
        return { host, w };
    };

    it('mouseEnterEvent shows the cursor, sets hovering, and positions it', () => {
        const { w } = setup();
        const target = w.$iconHolder.querySelector(`.${CSS.selection}`);
        target.getBoundingClientRect = () => ({ top: 0, left: 0 });
        const evt = { currentTarget: target, clientX: 25, clientY: 30 };
        w.mouseEnterEvent(evt);
        const cursor = w.$iconHolder.querySelector(`.${CSS.selection} > i`);
        expect(cursor.style.display).toBe('inline');
        expect(w.hovering).toBe(true);
        // cursor position is offset by -8 / -7
        expect(cursor.style.left).toBe('17px');
        expect(cursor.style.top).toBe('23px');
    });

    it('mouseLeaveEvent hides the cursor and clears hovering', () => {
        const { w } = setup();
        w.hovering = true;
        const cursor = w.$iconHolder.querySelector(`.${CSS.selection} > i`);
        cursor.style.display = 'inline';
        w.mouseLeaveEvent();
        expect(cursor.style.display).toBe('none');
        expect(w.hovering).toBe(false);
    });

    it('mouseMoveEvent does nothing when not hovering', () => {
        const { w } = setup();
        w.hovering = false;
        const cursor = w.$iconHolder.querySelector(`.${CSS.selection} > i`);
        cursor.style.left = '0px';
        const target = w.$iconHolder.querySelector(`.${CSS.selection}`);
        target.getBoundingClientRect = () => ({ top: 0, left: 0 });
        w.mouseMoveEvent({ currentTarget: target, clientX: 50, clientY: 50 });
        expect(cursor.style.left).toBe('0px');
    });

    it('mouseClickEvent ignores clicks before clickDelay has elapsed', () => {
        const { w } = setup();
        w.generated = true;
        w.generatedInTime = new Date();
        w.options.security.clickDelay = 5000;
        const submitSpy = vi.spyOn(w, 'submitIconSelection');
        const target = w.$iconHolder.querySelector(`.${CSS.selection}`);
        target.getBoundingClientRect = () => ({ top: 0, left: 0 });
        w.mouseClickEvent({ currentTarget: target, clientX: 50, clientY: 50 });
        expect(submitSpy).not.toHaveBeenCalled();
    });

    it('mouseClickEvent forwards to submitIconSelection once clickDelay has passed', () => {
        const { w } = setup();
        w.generated = true;
        w.generatedInTime = new Date(Date.now() - 10000);
        w.options.security.clickDelay = 1000;
        const submitSpy = vi.spyOn(w, 'submitIconSelection').mockImplementation(() => { });
        const target = w.$iconHolder.querySelector(`.${CSS.selection}`);
        target.getBoundingClientRect = () => ({ top: 0, left: 0 });
        w.mouseClickEvent({ currentTarget: target, clientX: 80, clientY: 90 });
        expect(submitSpy).toHaveBeenCalledWith(80, 90);
    });
});
