import { setOrbType, ZENITH_ORB_INJECT_NAME, ZENITH_ORB_PROVIDE, ZENITH_ORB_TYPE_CONFIG } from "./metadata-keys";

export const Config = (name?: string) => {
    return (target: any) => {
        setOrbType(target, ZENITH_ORB_TYPE_CONFIG);
        Reflect.defineMetadata(ZENITH_ORB_INJECT_NAME, name ?? target.name, target);
        Reflect.defineMetadata(ZENITH_ORB_PROVIDE, true, target);
    }
}