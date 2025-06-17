import { Zenith, zenithLogger } from "@zenith/core"
import { ZenithWebSystem } from "@zenith/web";

const logger = zenithLogger('Blaze');

export const startBlaze = () => {
    logger.info(`🚀🚀🚀 Starting Blaze 🚀🚀🚀`);

    const zenith = new Zenith();
    zenith.with(ZenithWebSystem);
    zenith.start();
}