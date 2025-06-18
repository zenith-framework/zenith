import { Orb, setOrbType } from "@zenith/core";
import { ZENITH_MIME_TYPES, ZENITH_RESPONSE_ENCODER } from "./metadata-keys";

export const HttpResponseEncoder = (mimeTypes: string[]) => {
    return (target: any) => {
        Reflect.defineMetadata(ZENITH_MIME_TYPES, mimeTypes, target);
        Orb()(target);
        setOrbType(target, ZENITH_RESPONSE_ENCODER);
    };
};  