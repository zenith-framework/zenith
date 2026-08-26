import { Orb, zenithLogger, type OnOrbDestroy, type OnOrbInit } from "@zenith-framework/core";

const logger = zenithLogger('ConnectionPool');

/**
 * Stands in for a real database pool: something that has to be opened before the
 * application serves traffic, and closed when it shuts down.
 */
@Orb()
export class ConnectionPool implements OnOrbInit, OnOrbDestroy {
    private connected = false;

    async onInit(): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 25));
        this.connected = true;
        logger.info('Pool connected');
    }

    async onDestroy(): Promise<void> {
        this.connected = false;
        logger.info('Pool closed');
    }

    isConnected(): boolean {
        return this.connected;
    }
}
