import type { ZenithSystem } from "@zenith-framework/core";
import { HttpServer } from "./web/http-server";
import { OrbContainer } from "@zenith-framework/core";

export class ZenithWebSystem implements ZenithSystem {
    private container!: OrbContainer;
    private httpServer!: HttpServer;

    init(container: OrbContainer): void {
        this.container = container;
    }


    async onStart(): Promise<void> {
        this.httpServer = this.container.get(HttpServer)!;
        await this.httpServer.registerMiddlewares();
        await this.httpServer.registerRoutes();
        await this.httpServer.start();
    }

    async onStop(): Promise<void> {
        this.httpServer.stop();
    }

    getPath(): string {
        return import.meta.dirname;
    }
}