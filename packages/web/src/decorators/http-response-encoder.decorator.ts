import { declareOrb, Orb, setOrbType } from "@zenith-framework/core";
import { ZENITH_MIME_TYPES, ZENITH_ORB_TYPE_RESPONSE_ENCODER } from "./metadata-keys";

export const HttpResponseEncoder = (mimeTypes: string[]) => {
    return (target: any) => {
        Reflect.defineMetadata(ZENITH_MIME_TYPES, mimeTypes, target);
        declareOrb(target);
        setOrbType(target, ZENITH_ORB_TYPE_RESPONSE_ENCODER);
    };
};      