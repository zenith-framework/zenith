import type { ZenithSystem } from "@zenith/core";
import { HttpServer } from "./web/http-server";
import { OrbContainer } from "@zenith/core";

export class ZenithWebSystem implements ZenithSystem {
    private container!: OrbContainer;
    private httpServer!: HttpServer;

    init(container: OrbContainer): void {
        this.container = container;
    }


    async onStart(): Promise<void> {
        this.httpServer = this.container.get(HttpServer)!;
        await this.httpServer.registerRoutes();
        await this.httpServer.start();
    }

    async registerOrbs(): Promise<void> {
    }

    async onStop(): Promise<void> {
        this.httpServer.stop();
    }

    getPath(): string {
        return import.meta.dirname;
    }
}