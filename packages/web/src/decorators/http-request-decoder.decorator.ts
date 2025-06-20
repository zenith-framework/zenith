import { Orb, setOrbType } from "@zenith/core";
import { ZENITH_MIME_TYPES, ZENITH_ORB_TYPE_REQUEST_DECODER } from "./metadata-keys";

export const HttpRequestDecoder = (mimeTypes: string[]) => {
    return (target: any) => {
        Reflect.defineMetadata(ZENITH_MIME_TYPES, mimeTypes, target);
        Orb()(target);
        setOrbType(target, ZENITH_ORB_TYPE_REQUEST_DECODER);
    };
};  