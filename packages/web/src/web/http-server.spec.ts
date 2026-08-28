import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';

import { OrbContainer } from '@zenith-framework/core';
import { ZenithWebConfig } from '../config/zenith-web.config';
import { HttpServer } from './http-server';
import type { HttpRequestHandler } from './http-request-handler';
import type { ZenithRequestRouting } from './zenith-request-routing';

class TestWebConfig extends ZenithWebConfig {
    constructor(private readonly timeoutMs: number) {
        super();
    }

    // Port 0 lets the OS pick a free one, so tests never collide.
    override httpServerPort(): number {
        return 0;
    }

    override shutdownTimeoutMs(): number {
        return this.timeoutMs;
    }
}

/** Calls the route handler directly; the request pipeline is covered by its own spec. */
const passthroughRequestHandler = {
    handleRequest: ({ routing }: { routing: ZenithRequestRouting }) =>
        routing.handler.call(routing.controller) as Promise<Response>,
} as unknown as HttpRequestHandler;

function serverFor(handler: () => Promise<Response>, timeoutMs: number) {
    const controller = { handle: handler };
    const server = new HttpServer(new OrbContainer(), passthroughRequestHandler, new TestWebConfig(timeoutMs));
    server.registerRoute('/slow', 'GET', { controller, handler: controller.handle });
    return server;
}

describe('HttpServer', () => {
    it('waits for in-flight requests before stop() resolves', async () => {
        let completed = false;
        const server = serverFor(async () => {
            await Bun.sleep(150);
            completed = true;
            return new Response('done');
        }, 5000);

        await server.start();
        const inFlight = fetch(`http://localhost:${server.port}/slow`);
        // Give the request time to reach the handler before shutting down.
        await Bun.sleep(30);

        await server.stop();

        // The whole point: orbs the handler depends on are only destroyed after this.
        expect(completed).toBe(true);
        expect((await inFlight).status).toBe(200);
    });

    it('closes active connections once the drain exceeds the timeout', async () => {
        let release: () => void = () => { /* replaced below */ };
        const blocked = new Promise<void>(resolve => { release = resolve; });
        const server = serverFor(async () => {
            await blocked;
            return new Response('late');
        }, 50);

        await server.start();
        const inFlight = fetch(`http://localhost:${server.port}/slow`).catch(() => 'aborted');
        await Bun.sleep(30);

        const startedAt = performance.now();
        await server.stop();
        expect(performance.now() - startedAt).toBeLessThan(2000);

        release();
        await inFlight;
    });

    it('is a no-op when the server was never started', async () => {
        const server = serverFor(() => Promise.resolve(new Response('unused')), 5000);
        await server.stop();
        expect(server.port).toBeUndefined();
    });
});
