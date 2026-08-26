import { AsyncLocalStorage } from "async_hooks";

import type { ZenithRequest } from "../zenith-request";

// uses ALS to store the request
export class ZenithRequestContext {
    private static storage = new AsyncLocalStorage<ZenithRequestContext>();

    readonly request: ZenithRequest;
    private _body: unknown;

    constructor(request: ZenithRequest) {
        this.request = request;
    }

    // Static methods
    static createForRequest<T>(request: ZenithRequest, handler: () => T): T {
        const context = new ZenithRequestContext(request);
        return ZenithRequestContext.storage.run(context, handler);
    }

    static current(): ZenithRequestContext | undefined {
        return this.storage.getStore()!;
    }

    set body(body: unknown) {
        this._body = body;
    }

    get body() {
        return this._body;
    }
}