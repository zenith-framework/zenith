import { ZENITH_ORB_INJECT_NAME } from "../decorators/metadata-keys";
import type { Constructor, OrbProvider } from "../types";

export function getInjectableOrbName<T>(orbRaw: OrbProvider<T>): string {
    const base = (typeof orbRaw === 'function' ? orbRaw : (orbRaw as object).constructor) as Constructor;
    const injectName = Reflect.getMetadata(ZENITH_ORB_INJECT_NAME, base) as string | undefined;
    return injectName ?? base.name;
}