import { setOrbType, ZENITH_ORB_INJECT_NAME, ZENITH_ORB_PROVIDE, ZENITH_ORB_TYPE_CONFIG } from "./metadata-keys";

export const Config = (nameOrFunction?: string | Function) => {
    return (target: any) => {
        setOrbType(target, ZENITH_ORB_TYPE_CONFIG);
        Reflect.defineMetadata(ZENITH_ORB_INJECT_NAME, typeof nameOrFunction === 'function' ? nameOrFunction.name : nameOrFunction ?? target.name, target);
        Reflect.defineMetadata(ZENITH_ORB_PROVIDE, true, target);
    }
}