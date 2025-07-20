import { ZenithSystem } from "@zenith-framework/core";
import { HttpServer } from "./web/http-server";
import { HttpRequestHandler } from "./web/http-request-handler";

export class ZenithWebSystem extends ZenithSystem {
    private httpServer!: HttpServer;
    private httpRequestHandler!: HttpRequestHandler;

    async onStart(): Promise<void> {
        this.httpServer = this.container.get(HttpServer)!;
        this.httpRequestHandler = this.container.get(HttpRequestHandler)!;

        await this.httpRequestHandler.registerMiddlewares();

        await this.httpServer.registerRoutes();
        await this.httpServer.start();
    }

    async onStop(): Promise<void> {
        this.httpServer.stop();
    }

    getRoot(): string {
        return import.meta.dirname;
    }
}