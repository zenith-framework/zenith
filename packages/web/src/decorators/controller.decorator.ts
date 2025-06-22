import { declareOrb, setOrbType, ZENITH_ORB_INJECT_NAME, ZENITH_ORB_PROVIDE } from "@zenith-framework/core";
import { ZENITH_CONTROLLER_METADATA, ZENITH_ORB_TYPE_CONTROLLER } from "./metadata-keys";
import type { RequestGuardOrbProvider } from "../web/request-guard";

export interface ControllerMetadata {
    path: string;
    validated?: boolean;
    guards?: RequestGuardOrbProvider[];
}

export const Controller = (path: string = '/') => {
    return (target: any) => {
        declareOrb(target);

        const controllerMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_METADATA, target) || {} as ControllerMetadata;
        controllerMetadata.path = path;
        Reflect.defineMetadata(ZENITH_CONTROLLER_METADATA, controllerMetadata, target);

        setOrbType(target, ZENITH_ORB_TYPE_CONTROLLER);
    }
}