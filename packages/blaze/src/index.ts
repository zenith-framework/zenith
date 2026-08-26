import { Zenith, zenithLogger, type ZenithSystemClass } from "@zenith-framework/core"
import { ZenithWebSystem } from "@zenith-framework/web";

const logger = zenithLogger('Blaze');

export interface BlazeOptions {
    /** Systems to load in addition to the web system. */
    with?: ZenithSystemClass[];
}

/**
 * Starts a Zenith application with the web system already wired up.
 *
 * Returns the running instance so the caller can reach the container, and accepts
 * extra systems so adding one does not mean abandoning Blaze.
 */
export const startBlaze = async (options: BlazeOptions = {}): Promise<Zenith> => {
    logger.info(`🚀🚀🚀 Starting Blaze 🚀🚀🚀`);

    const zenith = new Zenith().with(ZenithWebSystem);
    for (const system of options.with ?? []) {
        zenith.with(system);
    }

    await zenith.start();
    return zenith;
}
