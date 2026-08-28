import { declareOrb, setOrbType, type Constructor } from "@zenith-framework/core";
import { ZENITH_MIDDLEWARE_METADATA, ZENITH_ORB_TYPE_MIDDLEWARE } from "./metadata-keys";

export interface MiddlewareMetadata {
    /**
     * Lower runs earlier on the way in, and therefore later on the way out.
     * Middlewares sharing an order keep a stable, name-sorted order between boots.
     */
    order?: number;
}

export const DEFAULT_MIDDLEWARE_ORDER = 0;

export const Middleware = (metadata: MiddlewareMetadata = {}) => {
    return (target: Constructor) => {
        Reflect.defineMetadata(ZENITH_MIDDLEWARE_METADATA, metadata, target);
        declareOrb(target);
        setOrbType(target, ZENITH_ORB_TYPE_MIDDLEWARE);
    };
};
