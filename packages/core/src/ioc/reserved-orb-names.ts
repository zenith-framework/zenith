export const ZENITH_CONTAINER_ORB = 'OrbContainer';
export const ZENITH_CONFIG_ORB = 'ZenithConfig';

const RESERVED_ORB_NAMES = [
    ZENITH_CONTAINER_ORB,
    ZENITH_CONFIG_ORB,
] as const;

export function isReservedOrbName(name: string): boolean {
    return RESERVED_ORB_NAMES.includes(name as any);
}