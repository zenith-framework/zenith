import { setOrbType, ZENITH_ORB_INJECT_NAME, ZENITH_ORB_PROVIDE } from "@zenith-framework/core";
import { ZENITH_CONTROLLER_METADATA, ZENITH_ORB_TYPE_CONTROLLER } from "./metadata-keys";

export interface ControllerMetadata {
    path: string;
    validated?: boolean;
}

export const Controller = (path: string = '/') => {
    return (target: any) => {
        Reflect.defineMetadata(ZENITH_ORB_PROVIDE, true, target);
        Reflect.defineMetadata(ZENITH_ORB_INJECT_NAME, target.name, target);

        const controllerMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_METADATA, target) || {} as ControllerMetadata;
        controllerMetadata.path = path;
        Reflect.defineMetadata(ZENITH_CONTROLLER_METADATA, controllerMetadata, target);

        setOrbType(target, ZENITH_ORB_TYPE_CONTROLLER);
    }
}