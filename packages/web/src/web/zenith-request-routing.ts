/** A controller method exposed as a route. Its arguments are injected from the request. */
export type RouteHandler = (...args: unknown[]) => unknown;

/** A controller instance. Route handlers are reached by method name. */
export type ControllerInstance = object;

export interface ZenithRequestRouting {
    controller: ControllerInstance;
    handler: RouteHandler;
}
