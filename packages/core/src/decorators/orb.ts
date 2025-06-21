import { ZENITH_ORB_INJECT_NAME, ZENITH_ORB_PROVIDE } from "./metadata-keys";

export function declareOrb(target: any, name?: string) {
    Reflect.defineMetadata(ZENITH_ORB_PROVIDE, true, target);
    Reflect.defineMetadata(ZENITH_ORB_INJECT_NAME, name ?? target.name, target);
    return target;
}

export const Orb = (name?: string) => {
    return (target: any) => {
        declareOrb(target, name);
    }
} 