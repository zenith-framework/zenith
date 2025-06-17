import { ZENITH_ORB_STEREOTYPE } from "./metadata-keys";

export const System = () => {
    return (target: any) => {
        Reflect.defineMetadata(ZENITH_ORB_STEREOTYPE, 'SYSTEM', target);
    };
};