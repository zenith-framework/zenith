import { InjectOrb, Orb, ZenithSystem } from "@zenith-framework/core";
import { ZenithWebConfig } from "./config/zenith-web.config";
import { HttpRequestHandler } from "./web/http-request-handler";
import { HttpServer } from "./web/http-server";
import { RouterRegistrar } from "./routing/router-registrar";
import { ZenithOpenApiGenerator } from "./web/openapi/zenith-open-api.generator";

@Orb()
export class ZenithWebSystem extends ZenithSystem {
    static readonly root = import.meta.dirname;

    constructor(
        @InjectOrb('ZenithWebConfig') private readonly config: ZenithWebConfig,
        private readonly httpServer: HttpServer,
        private readonly httpRequestHandler: HttpRequestHandler,
        private readonly routerRegistrar: RouterRegistrar,
        private readonly openApiGenerator: ZenithOpenApiGenerator,
    ) {
        super();
    }

    async onStart(): Promise<void> {
        await this.httpRequestHandler.registerMiddlewares();

        await this.httpServer.scanAndRegisterRoutes();
        this.routerRegistrar.registerRouters();

        if (this.config.generateOpenApiDocs()) {
            await this.openApiGenerator.generateOpenApiDocs();
        }

        await this.httpServer.start();
    }

    async onStop(): Promise<void> {
        await this.httpServer.stop();
    }
}
