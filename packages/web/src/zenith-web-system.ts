import { ZenithSystem } from "@zenith-framework/core";
import { HttpServer } from "./web/http-server";
import { HttpRequestHandler } from "./web/http-request-handler";
import { ZenithWebConfig } from "./config/zenith-web.config";
import { ZenithOpenApiGenerator } from "./web/openapi/zenith-open-api.generator";

export class ZenithWebSystem extends ZenithSystem {
    private config!: ZenithWebConfig;
    private httpServer!: HttpServer;
    private httpRequestHandler!: HttpRequestHandler;
    private openApiGenerator!: ZenithOpenApiGenerator;

    async onStart(): Promise<void> {
        this.config = this.container.get('ZenithWebConfig')!;
        this.httpServer = this.container.get(HttpServer)!;
        this.httpRequestHandler = this.container.get(HttpRequestHandler)!;
        this.openApiGenerator = this.container.get(ZenithOpenApiGenerator)!;

        await this.httpRequestHandler.registerMiddlewares();

        await this.httpServer.scanAndRegisterRoutes();

        if (this.config.generateOpenApiDocs()) {
            await this.openApiGenerator.generateOpenApiDocs();
        }


        await this.httpServer.start();
    }

    async onStop(): Promise<void> {
        this.httpServer.stop();
    }

    getRoot(): string {
        return import.meta.dirname;
    }
}