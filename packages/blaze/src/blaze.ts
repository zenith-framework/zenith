import { Zenith } from "@zenith/core"
import { ZenithWebSystem } from "@zenith/web";
import { zenithLogger } from "../../core/src/logger";

const logger = zenithLogger('Blaze');

export const startBlaze = () => {
    logger.info(`🚀🚀🚀 Starting Blaze 🚀🚀🚀`);

    const zenith = new Zenith();
    zenith.with(ZenithWebSystem);
    zenith.start();
}