import { ZenithSystem } from "@zenith-framework/core";
import { HttpServer } from "./web/http-server";

export class ZenithWebSystem extends ZenithSystem {
    private httpServer!: HttpServer;

    async onStart(): Promise<void> {
        this.httpServer = this.container.get(HttpServer)!;
        await this.httpServer.registerMiddlewares();
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