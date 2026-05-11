import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/js/fetch.js', () => ({ default: vi.fn() }));

import Fetch from '../lib/js/fetch.js';
import { Captcha } from '../lib/js/captcha.js';
import { defaults } from '../lib/js/constants.js';

const mockFetch = Fetch;

const resetCaptcha = () => {
    Captcha.config = null;
    Captcha.initialized = false;
    Captcha.instances = [];
};

const buildPage = (n = 1) => {
    let html = '<form>';
    html += `<input type="hidden" name="jdzc[${defaults.fields.token}]" value="csrf" />`;
    for (let i = 0; i < n; i++) {
        html += `<div class="jdzc-target" id="t${i}"></div>`;
    }
    html += '</form>';
    document.body.innerHTML = html;
};

describe('Captcha.initialize — no loaderUrl', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        resetCaptcha();
        document.body.innerHTML = '';
    });

    it('falls back to defaults when no loaderUrl is supplied', () => {
        Captcha.initialize(null);
        expect(Captcha.initialized).toBe(true);
        expect(Captcha.config.path).toBe(defaults.path);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('merges options on top of defaults', () => {
        Captcha.initialize(null, null, { theme: 'dark', credits: 'hide' });
        expect(Captcha.config.theme).toBe('dark');
        expect(Captcha.config.credits).toBe('hide');
        expect(Captcha.config.series).toBe(defaults.series);
    });
});

describe('Captcha.initialize — with loaderUrl (mocked Fetch)', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        resetCaptcha();
        document.body.innerHTML = '';
    });

    it('uses Fetch and merges the returned data on top of defaults', () => {
        mockFetch.mockImplementation(({ success }) => success({ theme: 'dark' }));
        Captcha.initialize('/load');
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(Captcha.initialized).toBe(true);
        expect(Captcha.config.theme).toBe('dark');
        expect(Captcha.config.path).toBe(defaults.path);
    });

    it('falls back to defaults when the load request errors', () => {
        mockFetch.mockImplementation(({ error }) => error(new Error('boom')));
        Captcha.initialize('/load', null, { theme: 'dark' });
        expect(Captcha.initialized).toBe(true);
        expect(Captcha.config.theme).toBe('dark');
    });

    it('refuses to initialize twice', () => {
        mockFetch.mockImplementation(({ success }) => success({}));
        Captcha.initialize('/load');
        const callsAfterFirst = mockFetch.mock.calls.length;
        Captcha.initialize('/load');
        // Second call should not trigger another fetch
        expect(mockFetch.mock.calls.length).toBe(callsAfterFirst);
    });
});

describe('Captcha.initialize — selector wiring', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        resetCaptcha();
        document.body.innerHTML = '';
    });

    it('immediately runs loadFromSelector when document is already loaded', () => {
        buildPage(2);
        const spy = vi.spyOn(Captcha, 'loadFromSelector');
        Captcha.initialize(null, '.jdzc-target');
        expect(spy).toHaveBeenCalledWith('.jdzc-target');
        spy.mockRestore();
    });
});

describe('Captcha.loadFromSelector', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        resetCaptcha();
        document.body.innerHTML = '';
    });

    it('returns early without selector', () => {
        Captcha.initialize(null);
        Captcha.loadFromSelector(null);
        expect(Captcha.instances.length).toBe(0);
    });

    it('builds one widget per matching element', () => {
        buildPage(3);
        Captcha.initialize(null);
        Captcha.loadFromSelector('.jdzc-target');
        expect(Captcha.instances.length).toBe(3);
    });

    it('appends to instances on subsequent calls (does not replace)', () => {
        buildPage(2);
        Captcha.initialize(null);
        Captcha.loadFromSelector('#t0');
        Captcha.loadFromSelector('#t1');
        expect(Captcha.instances.length).toBe(2);
    });

    it('binds callbacks from options.callbacks to new instance elements only', () => {
        buildPage(2);
        Captcha.initialize(null);
        const cb = vi.fn();
        Captcha.loadFromSelector('.jdzc-target', { callbacks: { 'jdzc.test': cb } });
        Captcha.instances.forEach((w) => w.$element.dispatchEvent(new CustomEvent('jdzc.test')));
        expect(cb).toHaveBeenCalledTimes(2);
    });
});

describe('Captcha.checkIfValid', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        resetCaptcha();
        document.body.innerHTML = '';
    });

    it('returns false when not initialized', () => {
        expect(Captcha.checkIfValid()).toBe(false);
    });

    it('returns false when initialized but no instances exist', () => {
        Captcha.initialize(null);
        expect(Captcha.checkIfValid()).toBe(false);
    });

    it('returns true when initialized with at least one instance', () => {
        buildPage(1);
        Captcha.initialize(null);
        Captcha.loadFromSelector('.jdzc-target');
        expect(Captcha.checkIfValid()).toBe(true);
    });
});

describe('Captcha.reset', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        resetCaptcha();
        document.body.innerHTML = '';
    });

    it('is a no-op when no instances exist', () => {
        Captcha.initialize(null);
        const result = Captcha.reset();
        expect(result).toBe(Captcha);
    });

    it('resets every instance when no widgetId is provided', () => {
        buildPage(2);
        Captcha.initialize(null);
        Captcha.loadFromSelector('.jdzc-target');
        const spies = Captcha.instances.map((w) => vi.spyOn(w, 'reset').mockImplementation(() => { }));
        Captcha.reset();
        spies.forEach((s) => expect(s).toHaveBeenCalledTimes(1));
    });

    it('resets only the matching widget when an id is given', () => {
        buildPage(2);
        Captcha.initialize(null);
        Captcha.loadFromSelector('.jdzc-target');
        const spies = Captcha.instances.map((w) => vi.spyOn(w, 'reset').mockImplementation(() => { }));
        const targetId = Captcha.instances[1].id;
        Captcha.reset(targetId);
        expect(spies[0]).not.toHaveBeenCalled();
        expect(spies[1]).toHaveBeenCalledTimes(1);
    });
});

describe('Captcha.bind', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        resetCaptcha();
        document.body.innerHTML = '';
    });

    it('attaches the listener to every instance when no widgetId is given', () => {
        buildPage(2);
        Captcha.initialize(null);
        Captcha.loadFromSelector('.jdzc-target');
        const cb = vi.fn();
        Captcha.bind('jdzc.test', cb);
        Captcha.instances.forEach((w) => w.$element.dispatchEvent(new CustomEvent('jdzc.test')));
        expect(cb).toHaveBeenCalledTimes(2);
    });

    it('attaches the listener only to the targeted widget when widgetId is given', () => {
        buildPage(2);
        Captcha.initialize(null);
        Captcha.loadFromSelector('.jdzc-target');
        const cb = vi.fn();
        const targetId = Captcha.instances[0].id;
        Captcha.bind('jdzc.test', cb, targetId);
        Captcha.instances.forEach((w) => w.$element.dispatchEvent(new CustomEvent('jdzc.test')));
        expect(cb).toHaveBeenCalledTimes(1);
    });
});
