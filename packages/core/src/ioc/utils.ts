import { ZENITH_ORB_INJECT_NAME } from "../decorators/metadata-keys";

export function getInjectableOrbName<T>(orbRaw: (new (...args: any[]) => T) | T): string {
    const base = typeof orbRaw === 'function' ? orbRaw : (orbRaw as any).constructor;
    const injectName = Reflect.getMetadata(ZENITH_ORB_INJECT_NAME, base);
    return injectName ?? base.name;
}