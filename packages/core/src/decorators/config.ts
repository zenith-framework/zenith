import { setOrbType, ZENITH_ORB_INJECT_NAME, ZENITH_ORB_PROVIDE, ZENITH_ORB_TYPE_CONFIG } from "./metadata-keys";
import type { Constructor } from "../types";

export const Config = (nameOrFunction?: string | Constructor) => {
    return (target: Constructor) => {
        setOrbType(target, ZENITH_ORB_TYPE_CONFIG);
        Reflect.defineMetadata(ZENITH_ORB_INJECT_NAME, typeof nameOrFunction === 'function' ? nameOrFunction.name : nameOrFunction ?? target.name, target);
        Reflect.defineMetadata(ZENITH_ORB_PROVIDE, true, target);
    }
}