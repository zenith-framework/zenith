import { ZENITH_ORB_INJECT_NAME, ZENITH_ORB_INJECT_OPTIONS } from "./metadata-keys";

export interface InjectOrbOptions {
    allowAbsent?: boolean;
}

export function InjectOrb(name: string, options: InjectOrbOptions = {}): ParameterDecorator {
    return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
        if (propertyKey) {
            throw new Error('InjectOrb can only be used on constructor parameters');
        }
        // this works because the parameterIndex is the index of the parameter in the constructor
        Reflect.defineMetadata(ZENITH_ORB_INJECT_NAME, name, target, parameterIndex.toString());
        Reflect.defineMetadata(ZENITH_ORB_INJECT_OPTIONS, options, target, parameterIndex.toString());
    }
}