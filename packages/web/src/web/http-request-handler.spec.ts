import 'reflect-metadata';
import { beforeEach, describe, expect, it } from 'bun:test';
import { OrbContainer } from '@zenith-framework/core';
import { z } from 'zod';
import type { BunRequest } from 'bun';

import { Body, Controller, Get, HttpCode, Post, Query, RouteParam, Validated } from '../decorators';
import { Catch, ExceptionHandler } from '../decorators/exception-handler.decorator';
import { Guards } from '../decorators/guards.decorator';
import { HttpRequestHandler } from './http-request-handler';
import { JsonRequestDecoder } from './json-request.decoder';
import { JsonResponseEncoder } from './json-response.encoder';
import { ZodValidator } from './zod.validator';
import { ConflictException } from './http-exception';
import type { RequestGuard } from './request-guard';

interface CallOptions {
    method?: string;
    url?: string;
    params?: Record<string, string>;
    body?: unknown;
    contentType?: string | null;
}

/**
 * Drives a controller method through the real request pipeline without binding a port.
 */
async function callRoute(
    handler: HttpRequestHandler,
    controller: any,
    methodName: string,
    options: CallOptions = {},
): Promise<Response> {
    const { method = 'GET', url = 'http://localhost/test', params = {}, body, contentType = 'application/json' } = options;

    const headers: Record<string, string> = {};
    if (contentType !== null) {
        headers['content-type'] = contentType;
    }

    const request = new Request(url, {
        method,
        headers,
        ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    });
    const bunRequest = Object.assign(request, { params }) as unknown as BunRequest;

    return await handler.handleRequest({
        bunRequest,
        fullPath: new URL(url).pathname,
        routing: { controller, handler: controller[methodName] },
    });
}

describe('HttpRequestHandler', () => {
    let container: OrbContainer;
    let handler: HttpRequestHandler;

    async function bootstrap(...orbs: any[]) {
        for (const orb of orbs) {
            container.registerOrb(orb);
        }
        container.instanciateOrbs();
        handler = new HttpRequestHandler(container, container.get('Validator')!);
        await handler.registerMiddlewares();
    }

    beforeEach(() => {
        container = new OrbContainer();
        container.registerOrb(JsonRequestDecoder);
        container.registerOrb(JsonResponseEncoder);
        container.registerOrb(ZodValidator);
    });

    describe('argument injection', () => {
        @Controller('/args')
        class ArgsController {
            @Get('/:id')
            multiple(@RouteParam('id') id: string, @Query('filter') filter: string) {
                return { id, filter };
            }

            @Post('/:id')
            withBody(@RouteParam('id') id: string, @Body() body: any) {
                return { id, body };
            }

            @Get('/gap')
            withGap(@RouteParam('id') id: string, undecorated: string) {
                return { id, undecorated: undecorated ?? null };
            }
        }

        beforeEach(async () => {
            await bootstrap(ArgsController);
        });

        it('injects a route param and a query param in signature order', async () => {
            const response = await callRoute(handler, container.get(ArgsController), 'multiple', {
                url: 'http://localhost/args/42?filter=open',
                params: { id: '42' },
            });

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ id: '42', filter: 'open' });
        });

        it('injects a route param alongside a decoded body', async () => {
            const response = await callRoute(handler, container.get(ArgsController), 'withBody', {
                method: 'POST',
                url: 'http://localhost/args/7',
                params: { id: '7' },
                body: { name: 'write tests' },
            });

            expect(response.status).toBe(201);
            expect(await response.json()).toEqual({ id: '7', body: { name: 'write tests' } });
        });

        it('passes undefined for an undecorated parameter instead of failing', async () => {
            const response = await callRoute(handler, container.get(ArgsController), 'withGap', {
                url: 'http://localhost/args/gap',
                params: { id: '9' },
            });

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ id: '9', undecorated: null });
        });
    });

    describe('status codes', () => {
        @Controller('/status')
        class StatusController {
            @Get('/')
            read() {
                return { ok: true };
            }

            @Post('/')
            create(@Body() body: any) {
                return body;
            }

            @HttpCode(202)
            @Post('/accepted')
            accept(@Body() body: any) {
                return body;
            }

            @HttpCode(204)
            @Get('/no-content')
            noContent() {
                return null;
            }
        }

        beforeEach(async () => {
            await bootstrap(StatusController);
        });

        it('answers 200 for GET', async () => {
            const response = await callRoute(handler, container.get(StatusController), 'read');
            expect(response.status).toBe(200);
        });

        it('answers 201 for POST', async () => {
            const response = await callRoute(handler, container.get(StatusController), 'create', {
                method: 'POST',
                body: { a: 1 },
            });
            expect(response.status).toBe(201);
        });

        it('honours @HttpCode over the method default', async () => {
            const response = await callRoute(handler, container.get(StatusController), 'accept', {
                method: 'POST',
                body: { a: 1 },
            });
            expect(response.status).toBe(202);
        });

        it('honours @HttpCode on a GET route', async () => {
            const response = await callRoute(handler, container.get(StatusController), 'noContent');
            expect(response.status).toBe(204);
        });
    });

    describe('content negotiation', () => {
        @Controller('/content')
        class ContentController {
            @Get('/text')
            text() {
                return 'plain string';
            }

            @Get('/json')
            json() {
                return { shape: 'object' };
            }

            @Post('/json')
            create(@Body() body: any) {
                return body;
            }
        }

        beforeEach(async () => {
            await bootstrap(ContentController);
        });

        it('encodes a string response as text/plain', async () => {
            const response = await callRoute(handler, container.get(ContentController), 'text');
            expect(response.headers.get('content-type')).toBe('text/plain');
            expect(await response.text()).toBe('plain string');
        });

        it('encodes an object response as application/json', async () => {
            const response = await callRoute(handler, container.get(ContentController), 'json');
            expect(response.headers.get('content-type')).toBe('application/json');
            expect(await response.json()).toEqual({ shape: 'object' });
        });

        it('rejects a body whose content type has no registered decoder', async () => {
            const response = await callRoute(handler, container.get(ContentController), 'create', {
                method: 'POST',
                body: '<xml/>',
                contentType: 'application/xml',
            });

            expect(response.status).toBe(415);
        });
    });

    describe('guards', () => {
        class AllowGuard implements RequestGuard {
            async accepts() {
                return true;
            }
        }

        class DenyGuard implements RequestGuard {
            async accepts() {
                return false;
            }
        }

        @Controller('/guarded')
        class GuardedController {
            @Guards([AllowGuard])
            @Get('/allowed')
            allowed() {
                return { ok: true };
            }

            @Guards([DenyGuard])
            @Get('/denied')
            denied() {
                return { ok: true };
            }

            @Guards([AllowGuard, DenyGuard])
            @Get('/mixed')
            mixed() {
                return { ok: true };
            }
        }

        beforeEach(async () => {
            await bootstrap(AllowGuard, DenyGuard, GuardedController);
        });

        it('runs the handler when the guard accepts', async () => {
            const response = await callRoute(handler, container.get(GuardedController), 'allowed');
            expect(response.status).toBe(200);
        });

        it('answers 401 when the guard rejects', async () => {
            const response = await callRoute(handler, container.get(GuardedController), 'denied');
            expect(response.status).toBe(401);
        });

        it('rejects when any guard in the chain rejects', async () => {
            const response = await callRoute(handler, container.get(GuardedController), 'mixed');
            expect(response.status).toBe(401);
        });
    });

    describe('validation', () => {
        const CreateSchema = z.object({ name: z.string() });

        @Controller('/validated')
        class ValidatedController {
            @Validated(CreateSchema)
            @Post('/')
            create(@Body() body: z.infer<typeof CreateSchema>) {
                return body;
            }

            @Validated(z.coerce.number())
            @Get('/:id')
            read(@RouteParam('id') id: string) {
                return { id };
            }
        }

        beforeEach(async () => {
            await bootstrap(ValidatedController);
        });

        it('accepts a body matching the schema', async () => {
            const response = await callRoute(handler, container.get(ValidatedController), 'create', {
                method: 'POST',
                body: { name: 'valid' },
            });

            expect(response.status).toBe(201);
            expect(await response.json()).toEqual({ name: 'valid' });
        });

        it('answers 400 for a body violating the schema', async () => {
            const response = await callRoute(handler, container.get(ValidatedController), 'create', {
                method: 'POST',
                body: { name: 12345 },
            });

            expect(response.status).toBe(400);
        });

        it('answers 400 for a route param violating the schema', async () => {
            const response = await callRoute(handler, container.get(ValidatedController), 'read', {
                url: 'http://localhost/validated/abc',
                params: { id: 'abc' },
            });

            expect(response.status).toBe(400);
        });
    });

    describe('error mapping', () => {
        class DomainError extends Error { }
        class SpecificDomainError extends DomainError { }
        class UnmappedError extends Error { }

        @ExceptionHandler
        class DomainExceptionHandler {
            @Catch(DomainError)
            handle(error: DomainError) {
                return new ConflictException(error.message);
            }
        }

        @Controller('/errors')
        class ErrorController {
            @Get('/http')
            httpException(): never {
                throw new ConflictException('already exists');
            }

            @Get('/domain')
            domain(): never {
                throw new DomainError('domain failure');
            }

            @Get('/subclass')
            subclass(): never {
                throw new SpecificDomainError('subclass failure');
            }

            @Get('/unmapped')
            unmapped(): never {
                throw new UnmappedError('boom');
            }
        }

        beforeEach(async () => {
            await bootstrap(DomainExceptionHandler, ErrorController);
        });

        it('maps a thrown HttpException to its own status', async () => {
            const response = await callRoute(handler, container.get(ErrorController), 'httpException');
            expect(response.status).toBe(409);
        });

        it('maps an error to its registered exception handler', async () => {
            const response = await callRoute(handler, container.get(ErrorController), 'domain');
            expect(response.status).toBe(409);
            expect(await response.json()).toMatchObject({ details: 'domain failure' });
        });

        it('uses the base class handler for a subclassed error', async () => {
            const response = await callRoute(handler, container.get(ErrorController), 'subclass');
            expect(response.status).toBe(409);
            expect(await response.json()).toMatchObject({ details: 'subclass failure' });
        });

        it('falls back to 500 when no handler matches', async () => {
            const response = await callRoute(handler, container.get(ErrorController), 'unmapped');
            expect(response.status).toBe(500);
        });
    });
});
