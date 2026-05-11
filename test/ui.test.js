import { describe, expect, it } from 'vitest';
import { CSS, defaults } from '../lib/js/constants.js';
import { UI } from '../lib/js/ui.js';

const cloneDefaults = () => JSON.parse(JSON.stringify(defaults));

describe('UI.buildCredits', () => {
    it('returns an empty string when credits are disabled (falsy)', () => {
        expect(UI.buildCredits({ credits: false })).toBe('');
        expect(UI.buildCredits({ credits: '' })).toBe('');
    });

    it('renders the credit anchor when credits = "show"', () => {
        const html = UI.buildCredits({ credits: 'show' });
        expect(html).toContain('JdzCaptcha');
        expect(html).toContain('href="https://joffreydemetz.com"');
        expect(html).not.toContain('display:none');
    });

    it('hides the credit span via inline style when credits = "hide"', () => {
        const html = UI.buildCredits({ credits: 'hide' });
        expect(html).toContain('style="display:none;"');
    });
});

describe('UI.buildCaptchaInitialHolder', () => {
    it('contains the verify message and core box classes', () => {
        const html = UI.buildCaptchaInitialHolder(cloneDefaults());
        expect(html).toContain(defaults.messages.initialization.verify);
        expect(html).toContain(CSS.box);
        expect(html).toContain(CSS.boxB);
        expect(html).toContain(CSS.circle);
        expect(html).toContain(CSS.title);
    });
});

describe('UI.buildCaptchaHolder', () => {
    it('renders the header, three hidden input fields and the captcha id', () => {
        const html = UI.buildCaptchaHolder(cloneDefaults(), 9876543210123);
        expect(html).toContain(defaults.messages.header);
        expect(html).toContain(`name="jdzc[${defaults.fields.selection}]"`);
        expect(html).toContain(`name="jdzc[${defaults.fields.id}]"`);
        expect(html).toContain(`name="jdzc[${defaults.fields.honeypot}]"`);
        expect(html).toContain('value="9876543210123"');
    });

    it('mounts into the DOM and contains exactly three hidden inputs', () => {
        const wrap = document.createElement('div');
        wrap.innerHTML = UI.buildCaptchaHolder(cloneDefaults(), 1);
        const hiddenInputs = wrap.querySelectorAll('input[type="hidden"]');
        expect(hiddenInputs.length).toBe(3);
    });
});

describe('UI.buildCheckmark', () => {
    it('returns a complete SVG checkmark', () => {
        const html = UI.buildCheckmark();
        expect(html.startsWith('<svg')).toBe(true);
        expect(html).toContain('class="checkmark"');
    });
});

describe('UI.buildValidSelectionMessage / buildInvalidSelectionMessage', () => {
    it('valid message contains the success copy + checkmark', () => {
        const html = UI.buildValidSelectionMessage(cloneDefaults());
        expect(html).toContain(defaults.messages.correct);
        expect(html).toContain(CSS.checkmark);
        expect(html).toContain('<svg');
    });

    it('invalid message contains incorrect.title and incorrect.subtitle', () => {
        const html = UI.buildInvalidSelectionMessage(cloneDefaults());
        expect(html).toContain(defaults.messages.incorrect.title);
        expect(html).toContain(defaults.messages.incorrect.subtitle);
    });
});

describe('UI.buildErrorMessage', () => {
    it('embeds the supplied top and bottom messages', () => {
        const html = UI.buildErrorMessage('Top!', 'Bottom!');
        expect(html).toContain('Top!');
        expect(html).toContain('Bottom!');
        expect(html).toContain(CSS.title);
        expect(html).toContain(CSS.subtitle);
    });
});

describe('UI.addLoadingSpinner / removeLoadingSpinner', () => {
    it('addLoadingSpinner adds the opacity class and a single loader child', () => {
        const el = document.createElement('div');
        UI.addLoadingSpinner(el);
        expect(el.classList.contains(CSS.opacity)).toBe(true);
        expect(el.querySelectorAll(`.${CSS.loader}`).length).toBe(1);
    });

    it('removeLoadingSpinner clears the opacity class and the loader child', () => {
        const el = document.createElement('div');
        UI.addLoadingSpinner(el);
        UI.removeLoadingSpinner(el);
        expect(el.classList.contains(CSS.opacity)).toBe(false);
        expect(el.querySelector(`.${CSS.loader}`)).toBeNull();
    });
});

describe('UI.removeLoadingSpinnerOnImageLoad', () => {
    it('does nothing if the element has no background image url', () => {
        const el = document.createElement('div');
        const cb = () => {
            throw new Error('callback should not have run');
        };
        expect(() => UI.removeLoadingSpinnerOnImageLoad(el, cb)).not.toThrow();
    });

    it('hooks Image.onload and invokes the callback when the image loads', async () => {
        const el = document.createElement('div');
        el.style.backgroundImage = "url('https://example.test/foo.png')";

        // Patch the global Image with a controllable stub
        const originalImage = global.Image;
        const created = [];
        global.Image = class {
            constructor() { created.push(this); }
            set src(v) {
                this._src = v;
                // Defer onload so the implementation gets to assign it first
                queueMicrotask(() => this.onload && this.onload());
            }
            get src() { return this._src; }
        };

        try {
            const cb = await new Promise((resolve) => {
                UI.removeLoadingSpinnerOnImageLoad(el, () => resolve('called'));
            });
            expect(cb).toBe('called');
            expect(created[0]._src).toBe('https://example.test/foo.png');
        } finally {
            global.Image = originalImage;
        }
    });
});
