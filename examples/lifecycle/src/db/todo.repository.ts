import { Orb, zenithLogger, type OnOrbInit } from "@zenith-framework/core";
import { ConnectionPool } from "./connection-pool";

const logger = zenithLogger('TodoRepository');

@Orb()
export class TodoRepository implements OnOrbInit {
    constructor(private readonly pool: ConnectionPool) { }

    async onInit(): Promise<void> {
        // The pool is guaranteed to be initialised first: onInit runs in dependency order.
        logger.info(`Warming cache (pool connected: ${this.pool.isConnected()})`);
    }

    findAll(): string[] {
        return ['read the lifecycle example'];
    }
}
