import { Zenith, zenithLogger } from "@zenith-framework/core"
import { ZenithWebSystem } from "@zenith-framework/web";

const logger = zenithLogger('Blaze');

export const startBlaze = () => {
    logger.info(`🚀🚀🚀 Starting Blaze 🚀🚀🚀`);

    const zenith = new Zenith();
    zenith.with(ZenithWebSystem);
    zenith.start();
}