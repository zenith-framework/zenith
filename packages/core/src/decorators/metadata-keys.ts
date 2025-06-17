export const ZENITH_ORB_PROVIDE = '__ZENITH_ORB_PROVIDE';
export const ZENITH_ORB_TYPE = '__ZENITH_ORB_TYPE';
export const ZENITH_ORB_INJECT_NAME = '__ZENITH_ORB_INJECT_NAME';
export const ZENITH_ORB_INJECT_OPTIONS = '__ZENITH_ORB_INJECT_OPTIONS';

export const ZENITH_ORB_TYPE_CONFIG = '__ZENITH_ORB_TYPE_CONFIG';

export function setOrbType(target: any, type: string) {
    Reflect.defineMetadata(ZENITH_ORB_TYPE, type, target);
}  