import { ZENITH_ORB_INJECT_NAME, ZENITH_ORB_PROVIDE } from "./metadata-keys";
import type { Constructor } from "../types";

export function declareOrb<T extends Constructor>(target: T, name?: string): T {
    Reflect.defineMetadata(ZENITH_ORB_PROVIDE, true, target);
    Reflect.defineMetadata(ZENITH_ORB_INJECT_NAME, name ?? target.name, target);
    return target;
}

export const Orb = (name?: string) => {
    return (target: Constructor) => {
        declareOrb(target, name);
    }
} 