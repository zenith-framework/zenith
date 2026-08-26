import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';

import { Get, Post } from './http-method.decorator';
import { Body, Query, RouteParam, type RouteParamMetadata } from './route-param';
import { Validated } from './validated.decorator';
import { ZENITH_CONTROLLER_ROUTE_ARGS } from './metadata-keys';

function routeArgsOf(controller: any, handler: string): RouteParamMetadata[] {
    return (Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE_ARGS, controller.prototype, handler) ?? []) as RouteParamMetadata[];
}

describe('route parameter decorators', () => {
    it('records a single parameter at its own index', () => {
        class SingleParamController {
            @Get('/:id')
            findOne(@RouteParam('id') _id: string) { }
        }

        const args = routeArgsOf(SingleParamController, 'findOne');
        expect(args).toHaveLength(1);
        expect(args[0]).toMatchObject({ type: 'route', name: 'id', index: 0 });
    });

    it('keeps parameters aligned with the handler signature', () => {
        // TypeScript applies parameter decorators right-to-left. Appending would
        // record these in reverse and swap the injected arguments at runtime.
        class MultiParamController {
            @Post('/:id')
            update(
                @RouteParam('id') _id: string,
                @Query('filter') _filter: string,
                @Body() _body: unknown,
            ) { }
        }

        const args = routeArgsOf(MultiParamController, 'update');
        expect(args).toHaveLength(3);
        expect(args[0]).toMatchObject({ type: 'route', name: 'id', index: 0 });
        expect(args[1]).toMatchObject({ type: 'query', name: 'filter', index: 1 });
        expect(args[2]).toMatchObject({ type: 'body', index: 2 });
    });

    it('leaves a hole for an undecorated parameter', () => {
        class GappedController {
            @Get('/:id')
            find(_untagged: string, @RouteParam('id') _id: string) { }
        }

        const args = routeArgsOf(GappedController, 'find');
        expect(args).toHaveLength(2);
        expect(args[0]).toBeUndefined();
        expect(args[1]).toMatchObject({ type: 'route', name: 'id', index: 1 });
    });

    it('does not leak parameter metadata between handlers', () => {
        class TwoHandlerController {
            @Get('/:id')
            first(@RouteParam('id') _id: string) { }

            @Get('/')
            second(@Query('q') _q: string) { }
        }

        expect(routeArgsOf(TwoHandlerController, 'first')[0]).toMatchObject({ type: 'route' });
        expect(routeArgsOf(TwoHandlerController, 'second')[0]).toMatchObject({ type: 'query' });
    });

    it('does not mutate the parent metadata when a subclass adds handlers', () => {
        class BaseController {
            @Get('/:id')
            find(@RouteParam('id') _id: string) { }
        }

        class ChildController extends BaseController {
            @Get('/child')
            findChild(@Query('q') _q: string) { }
        }

        expect(routeArgsOf(BaseController, 'find')).toHaveLength(1);
        expect(routeArgsOf(ChildController, 'findChild')).toHaveLength(1);
    });

    it('attaches @Validated to the parameter it sits above', () => {
        const schema = { marker: 'schema' };

        class ValidatedParamController {
            @Post('/')
            create(
                @Query('q') _q: string,
                @Validated(schema) @Body() _body: unknown,
            ) { }
        }

        const args = routeArgsOf(ValidatedParamController, 'create');
        expect(args[0]!.validated).toBeUndefined();
        expect(args[1]).toMatchObject({ type: 'body', validated: true, validationSchema: schema });
    });
});
