import { Zenith, zenithLogger } from "@zenith-framework/core"
import { ZenithWebSystem } from "@zenith-framework/web";

const logger = zenithLogger('Blaze');

export const startBlaze = async () => {
    logger.info(`🚀🚀🚀 Starting Blaze 🚀🚀🚀`);

    const zenith = new Zenith().with(ZenithWebSystem);
    await zenith.start();
}