import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Utils } from '../lib/js/utils.js';

describe('Utils.extend', () => {
    it('returns a new object when no sources are passed', () => {
        const out = Utils.extend();
        expect(out).toEqual({});
    });

    it('shallow-copies own enumerable properties from source', () => {
        const out = Utils.extend({}, { a: 1, b: 'x' });
        expect(out).toEqual({ a: 1, b: 'x' });
    });

    it('later sources overwrite earlier ones', () => {
        const out = Utils.extend({}, { a: 1, b: 2 }, { b: 3, c: 4 });
        expect(out).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('deep-merges nested objects', () => {
        const out = Utils.extend({}, { nested: { a: 1, b: 2 } }, { nested: { b: 99, c: 3 } });
        expect(out).toEqual({ nested: { a: 1, b: 99, c: 3 } });
    });

    it('replaces arrays wholesale (does not deep-merge them)', () => {
        const out = Utils.extend({}, { items: [1, 2, 3] }, { items: [9] });
        expect(out.items).toEqual([9]);
    });

    it('ignores null/undefined sources', () => {
        const out = Utils.extend({ a: 1 }, null, undefined, { b: 2 });
        expect(out).toEqual({ a: 1, b: 2 });
    });

    it('mutates the target and returns it (same reference)', () => {
        const target = { a: 1 };
        const out = Utils.extend(target, { b: 2 });
        expect(out).toBe(target);
    });
});

describe('Utils.createPayload', () => {
    let nowSpy;
    beforeEach(() => {
        nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    });
    afterEach(() => {
        nowSpy.mockRestore();
    });

    it('encodes the data + a timestamp as base64 JSON', () => {
        const payload = Utils.createPayload({ id: 'abc' });
        const decoded = JSON.parse(atob(payload));
        expect(decoded).toEqual({ id: 'abc', ts: 1700000000000 });
    });

    it('always overrides any caller-provided ts (the timestamp wins)', () => {
        // The spread `{ ...data, ts: Date.now() }` puts ts last, so an incoming ts is overwritten.
        const payload = Utils.createPayload({ ts: 1 });
        const decoded = JSON.parse(atob(payload));
        expect(decoded.ts).toBe(1700000000000);
    });
});

describe('Utils.isBase64', () => {
    it('returns true for a valid base64 string', () => {
        expect(Utils.isBase64(btoa('hello'))).toBe(true);
    });

    it('returns false for a malformed base64 string', () => {
        expect(Utils.isBase64('not%%base64')).toBe(false);
    });

    it('returns false for non-string input that throws', () => {
        expect(Utils.isBase64(null)).toBe(false);
    });
});

describe('Utils.trigger', () => {
    it('dispatches a CustomEvent with the supplied detail payload', () => {
        const el = document.createElement('div');
        const handler = vi.fn();
        el.addEventListener('jdzc.test', handler);
        Utils.trigger(el, 'jdzc.test', { foo: 'bar' });
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail).toEqual({ foo: 'bar' });
    });
});

describe('Utils.empty', () => {
    it('removes every child node from the element', () => {
        const el = document.createElement('div');
        el.innerHTML = '<span>a</span><span>b</span>text';
        Utils.empty(el);
        expect(el.childNodes.length).toBe(0);
    });
});

describe('Utils.detectOffset', () => {
    it('returns {top: 0, left: 0} when the element has no client rects', () => {
        const el = document.createElement('div');
        // jsdom: a detached element has 0 client rects.
        expect(Utils.detectOffset(el)).toEqual({ top: 0, left: 0 });
    });

    it('adds page scroll offset to bounding rect coordinates', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);
        el.getClientRects = () => [{}];
        el.getBoundingClientRect = () => ({ top: 50, left: 10 });
        Object.defineProperty(el.ownerDocument.defaultView, 'pageYOffset', { value: 100, configurable: true });
        Object.defineProperty(el.ownerDocument.defaultView, 'pageXOffset', { value: 20, configurable: true });
        expect(Utils.detectOffset(el)).toEqual({ top: 150, left: 30 });
    });
});

describe('Utils.width', () => {
    it('parses the computed width and strips px', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);
        const originalGCS = window.getComputedStyle;
        window.getComputedStyle = () => ({ width: '123.5px' });
        try {
            expect(Utils.width(el)).toBe(123.5);
        } finally {
            window.getComputedStyle = originalGCS;
        }
    });
});

describe('Utils.debug / warn / error', () => {
    let logSpy, warnSpy, errorSpy, dirSpy;
    beforeEach(() => {
        logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        dirSpy = vi.spyOn(console, 'dir').mockImplementation(() => { });
    });
    afterEach(() => {
        logSpy.mockRestore();
        warnSpy.mockRestore();
        errorSpy.mockRestore();
        dirSpy.mockRestore();
        delete window.JdzCaptcha;
    });

    it('does nothing when debug mode is disabled', () => {
        window.JdzCaptcha = { debugMode: false };
        Utils.debug('hello');
        Utils.warn('hello');
        Utils.error('hello');
        expect(logSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('logs string args via console.log when debug mode is on', () => {
        window.JdzCaptcha = { debugMode: true };
        Utils.debug('hello');
        expect(logSpy).toHaveBeenCalledWith('hello');
    });

    it('routes warn / error calls to the matching console method', () => {
        window.JdzCaptcha = { debugMode: true };
        Utils.warn('be careful');
        Utils.error('boom');
        expect(warnSpy).toHaveBeenCalledWith('be careful');
        expect(errorSpy).toHaveBeenCalledWith('boom');
    });

    it('uses console.dir for object args', () => {
        window.JdzCaptcha = { debugMode: true };
        Utils.debug({ a: 1 });
        expect(dirSpy).toHaveBeenCalledWith({ a: 1 });
    });
});

describe('Utils.thrown', () => {
    let warnSpy, errorSpy, dirSpy;
    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        dirSpy = vi.spyOn(console, 'dir').mockImplementation(() => { });
    });
    afterEach(() => {
        warnSpy.mockRestore();
        errorSpy.mockRestore();
        dirSpy.mockRestore();
        delete window.JdzCaptcha;
    });

    it('is a no-op when debug mode is disabled', () => {
        window.JdzCaptcha = { debugMode: false };
        Utils.thrown('oops');
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('warns for plain strings', () => {
        window.JdzCaptcha = { debugMode: true };
        Utils.thrown('oops');
        expect(warnSpy).toHaveBeenCalledWith('JdzCaptcha ERROR:', 'oops');
    });

    it('errors for Error instances', () => {
        window.JdzCaptcha = { debugMode: true };
        Utils.thrown(new Error('bad'));
        expect(errorSpy).toHaveBeenCalledWith('JdzCaptcha ERROR:', 'bad');
    });
});

describe('Utils.clearInvalidationTimeout', () => {
    it('clears the timeout when a valid id is given', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const id = setTimeout(fn, 100);
        Utils.clearInvalidationTimeout(id);
        vi.advanceTimersByTime(200);
        expect(fn).not.toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('is safe to call with null', () => {
        expect(() => Utils.clearInvalidationTimeout(null)).not.toThrow();
    });
});
