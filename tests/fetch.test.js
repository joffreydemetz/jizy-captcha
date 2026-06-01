import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fetch from '../lib/js/fetch.js';

const okResponse = (body, contentType = 'application/json') => ({
    ok: true,
    status: 200,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    headers: { get: () => contentType },
});

describe('Fetch', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });
    afterEach(() => {
        delete global.fetch;
        vi.restoreAllMocks();
    });

    it('defaults to GET and always sets the X-Requested-With header', async () => {
        global.fetch.mockResolvedValueOnce(okResponse({ ok: 1 }));
        const success = vi.fn();
        await Fetch({ url: '/x', success });
        const [url, opts] = global.fetch.mock.calls[0];
        expect(url).toBe('/x');
        expect(opts.method).toBe('GET');
        expect(opts.headers['X-Requested-With']).toBe('XMLHttpRequest');
        expect(success).toHaveBeenCalledWith({ ok: 1 });
    });

    it('uppercases the supplied method', async () => {
        global.fetch.mockResolvedValueOnce(okResponse(''));
        await Fetch({ url: '/x', type: 'post', success: () => { } });
        expect(global.fetch.mock.calls[0][1].method).toBe('POST');
    });

    it('JSON-stringifies a plain-object body and sets Content-Type', async () => {
        global.fetch.mockResolvedValueOnce(okResponse(''));
        await Fetch({ url: '/x', type: 'POST', data: { a: 1 } });
        const opts = global.fetch.mock.calls[0][1];
        expect(opts.headers['Content-Type']).toBe('application/json');
        expect(opts.body).toBe(JSON.stringify({ a: 1 }));
    });

    it('passes FormData bodies through untouched and does NOT set Content-Type', async () => {
        global.fetch.mockResolvedValueOnce(okResponse(''));
        const fd = new FormData();
        fd.append('k', 'v');
        await Fetch({ url: '/x', type: 'POST', data: fd });
        const opts = global.fetch.mock.calls[0][1];
        expect(opts.body).toBe(fd);
        expect(opts.headers['Content-Type']).toBeUndefined();
    });

    it('parses a JSON response body when possible', async () => {
        global.fetch.mockResolvedValueOnce(okResponse({ hello: 'world' }));
        const success = vi.fn();
        await Fetch({ url: '/x', success });
        expect(success).toHaveBeenCalledWith({ hello: 'world' });
    });

    it('falls back to the raw text when the body is not JSON', async () => {
        global.fetch.mockResolvedValueOnce(okResponse('plain-text-payload'));
        const success = vi.fn();
        await Fetch({ url: '/x', success });
        expect(success).toHaveBeenCalledWith('plain-text-payload');
    });

    it('calls the error callback on a non-ok HTTP response', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: async () => '',
        });
        const success = vi.fn();
        const error = vi.fn();
        await Fetch({ url: '/x', success, error });
        expect(success).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalledTimes(1);
        expect(error.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(error.mock.calls[0][0].message).toMatch(/500/);
    });

    it('calls the error callback when fetch itself rejects', async () => {
        const boom = new Error('network down');
        global.fetch.mockRejectedValueOnce(boom);
        const error = vi.fn();
        await Fetch({ url: '/x', error });
        expect(error).toHaveBeenCalledWith(boom);
    });

    it('does not throw when neither callback is supplied (success path)', async () => {
        global.fetch.mockResolvedValueOnce(okResponse({}));
        await expect(Fetch({ url: '/x' })).resolves.toBeUndefined();
    });

    it('does not throw when neither callback is supplied (error path)', async () => {
        global.fetch.mockRejectedValueOnce(new Error('x'));
        await expect(Fetch({ url: '/x' })).resolves.toBeUndefined();
    });

    it('lets caller-supplied headers override the defaults', async () => {
        global.fetch.mockResolvedValueOnce(okResponse(''));
        await Fetch({
            url: '/x',
            headers: { 'X-Requested-With': 'override', 'X-Custom': 'yes' },
        });
        const opts = global.fetch.mock.calls[0][1];
        expect(opts.headers['X-Requested-With']).toBe('override');
        expect(opts.headers['X-Custom']).toBe('yes');
    });
});
