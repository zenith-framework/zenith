import { setOrbType, ZENITH_ORB_INJECT_NAME, ZENITH_ORB_PROVIDE } from "@zenith/core";
import { ZENITH_CONTROLLER_PATH } from "./metadata-keys";

export const Controller = (path: string = '/') => {
    return (target: any) => {
        Reflect.defineMetadata(ZENITH_ORB_PROVIDE, true, target);
        Reflect.defineMetadata(ZENITH_ORB_INJECT_NAME, target.name, target);
        Reflect.defineMetadata(ZENITH_CONTROLLER_PATH, path, target);
        setOrbType(target, 'CONTROLLER');
    }
}