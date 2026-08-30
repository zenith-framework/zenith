import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';

import { ZenithWebConfig } from '../../config/zenith-web.config';
import { CorsMiddleware } from './cors.middleware';
import type { CorsOptions } from './cors-options';

function corsFor(options: CorsOptions | undefined) {
    class TestConfig extends ZenithWebConfig {
        override cors(): CorsOptions | undefined {
            return options;
        }
    }
    return new CorsMiddleware(new TestConfig());
}

const ok = () => Promise.resolve(new Response('body', { status: 200, headers: { 'X-Existing': 'kept' } }));

function preflight(origin: string, method = 'POST', headers = 'content-type') {
    return new Request('http://localhost/todos', {
        method: 'OPTIONS',
        headers: { Origin: origin, 'Access-Control-Request-Method': method, 'Access-Control-Request-Headers': headers },
    });
}

const simple = (origin?: string) =>
    new Request('http://localhost/todos', { headers: origin ? { Origin: origin } : {} });

describe('CorsMiddleware', () => {
    it('does nothing when cors is not configured', async () => {
        const response = await corsFor(undefined).handle(simple('https://app.example'), ok);

        expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
        expect(await response.text()).toBe('body');
    });

    it('does nothing for a request without an Origin', async () => {
        const response = await corsFor({ origins: '*' }).handle(simple(), ok);

        expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('adds headers to a simple request from an allowed origin', async () => {
        const response = await corsFor({ origins: ['https://app.example'] }).handle(simple('https://app.example'), ok);

        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example');
        expect(response.headers.get('Vary')).toContain('Origin');
        // The wrapped response must survive being copied.
        expect(response.headers.get('X-Existing')).toBe('kept');
        expect(await response.text()).toBe('body');
        expect(response.status).toBe(200);
    });

    it('serves a disallowed origin without CORS headers rather than rejecting it', async () => {
        let reached = false;
        const response = await corsFor({ origins: ['https://app.example'] })
            .handle(simple('https://evil.example'), () => { reached = true; return ok(); });

        expect(reached).toBe(true);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('answers a preflight without reaching the route', async () => {
        let reached = false;
        const response = await corsFor({ origins: '*', maxAgeSeconds: 600 })
            .handle(preflight('https://app.example'), () => { reached = true; return ok(); });

        expect(reached).toBe(false);
        expect(response.status).toBe(204);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
        expect(response.headers.get('Access-Control-Max-Age')).toBe('600');
    });

    it('echoes the requested headers when none are configured', async () => {
        const response = await corsFor({ origins: '*' }).handle(preflight('https://app.example', 'POST', 'x-trace, content-type'), ok);

        expect(response.headers.get('Access-Control-Allow-Headers')).toBe('x-trace, content-type');
        expect(response.headers.get('Vary')).toContain('Access-Control-Request-Headers');
    });

    it('echoes the origin instead of a wildcard when credentials are allowed', async () => {
        // A browser rejects Access-Control-Allow-Origin: * on a credentialed response.
        const response = await corsFor({ origins: '*', credentials: true }).handle(simple('https://app.example'), ok);

        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example');
        expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
        expect(response.headers.get('Vary')).toContain('Origin');
    });

    it('exposes the configured response headers', async () => {
        const response = await corsFor({ origins: '*', exposedHeaders: ['X-Total-Count'] }).handle(simple('https://app.example'), ok);

        expect(response.headers.get('Access-Control-Expose-Headers')).toBe('X-Total-Count');
    });

    it('treats a plain OPTIONS without a requested method as a normal request', async () => {
        let reached = false;
        const request = new Request('http://localhost/todos', { method: 'OPTIONS', headers: { Origin: 'https://app.example' } });
        await corsFor({ origins: '*' }).handle(request, () => { reached = true; return ok(); });

        expect(reached).toBe(true);
    });
});
