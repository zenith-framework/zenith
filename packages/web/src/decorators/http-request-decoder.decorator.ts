import { declareOrb, setOrbType, type Constructor } from "@zenith-framework/core";
import { ZENITH_MIME_TYPES, ZENITH_ORB_TYPE_REQUEST_DECODER } from "./metadata-keys";

export const HttpRequestDecoder = (mimeTypes: string[]) => {
    return (target: Constructor) => {
        Reflect.defineMetadata(ZENITH_MIME_TYPES, mimeTypes, target);
        declareOrb(target);
        setOrbType(target, ZENITH_ORB_TYPE_REQUEST_DECODER);
    };
};  