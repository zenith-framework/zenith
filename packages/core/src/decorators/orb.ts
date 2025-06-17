import { ZENITH_ORB_INJECT_NAME, ZENITH_ORB_PROVIDE } from "./metadata-keys";

export const Orb = (name?: string) => {
    return (target: any) => {
        Reflect.defineMetadata(ZENITH_ORB_PROVIDE, true, target);
        Reflect.defineMetadata(ZENITH_ORB_INJECT_NAME, name ?? target.name, target);
    }
} 