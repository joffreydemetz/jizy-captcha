import { describe, expect, it } from 'vitest';
import { CSS, VERSION, defaults } from '../lib/js/constants.js';

describe('constants — VERSION', () => {
    it('exports a semantic version string', () => {
        expect(typeof VERSION).toBe('string');
        expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
});

describe('constants — CSS', () => {
    it('every class name uses the jdzc- prefix', () => {
        Object.values(CSS).forEach((cls) => {
            expect(cls).toMatch(/^jdzc-/);
        });
    });

    it('has no duplicate class names across keys', () => {
        const values = Object.values(CSS);
        expect(new Set(values).size).toBe(values.length);
    });
});

describe('constants — defaults', () => {
    it('exposes the documented top-level options', () => {
        expect(defaults).toMatchObject({
            path: '/captcha/request/',
            token: true,
            credits: 'show',
            series: 'streamline',
            theme: 'light',
        });
    });

    it('contains the security sub-config with sensible numeric values', () => {
        expect(defaults.security).toMatchObject({
            clickDelay: 1500,
            hoverDetection: true,
            enableInitialMessage: true,
            initializeDelay: 500,
            selectionResetDelay: 3000,
            loadingAnimationDelay: 1000,
        });
        expect(defaults.security.invalidateTime).toBe(1000 * 60 * 2);
    });

    it('contains the four hidden form field names with the _jdzc-hf- prefix', () => {
        const { fields } = defaults;
        expect(fields).toEqual({
            selection: '_jdzc-hf-se',
            id: '_jdzc-hf-id',
            honeypot: '_jdzc-hf-hp',
            token: '_jdzc-token',
        });
    });

    it('contains the user-facing message bundle', () => {
        expect(defaults.messages).toHaveProperty('initialization.loading');
        expect(defaults.messages).toHaveProperty('initialization.verify');
        expect(defaults.messages).toHaveProperty('header');
        expect(defaults.messages).toHaveProperty('correct');
        expect(defaults.messages).toHaveProperty('incorrect.title');
        expect(defaults.messages).toHaveProperty('incorrect.subtitle');
        expect(defaults.messages).toHaveProperty('timeout.title');
        expect(defaults.messages).toHaveProperty('timeout.subtitle');
    });
});
