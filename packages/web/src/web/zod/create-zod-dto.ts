import type { z } from "zod/v4";

export interface ZodDto<
    TSchema extends z.ZodTypeAny
> {
    new(): ReturnType<TSchema['parse']>
    schema: TSchema
    isZodDto: true
    isEnumWrapper: boolean
}

export function isZodDto(schema: any): schema is ZodDto<any> {
    return schema.isZodDto === true;
}


export const createZodDto = <
    T extends z.ZodTypeAny
>(schema: T, options?: { name: string }) => {
    class ZodDtoWrapper {
        static isZodDto = true;
        static isEnumWrapper = false;
        static schema = schema;
    }

    if (options?.name) {
        Object.defineProperty(ZodDtoWrapper, 'name', {
            value: options.name,
            writable: true,
            configurable: true,
        });
    }

    return ZodDtoWrapper as unknown as ZodDto<T>;
};

// This is used to keep the same behavior as createZodDto but for enums
// The wrapping is needed because enums are not objects
// The parameter wrapping will be done by the validator or pre-processor
export const createZodEnumDto = <
    T extends z.ZodEnum<any>
>(schema: T, options: { name: string }) => {
    class ZodDtoWrapper {
        static isZodDto = true;
        static isEnumWrapper = true;
        static schema = schema;
    }

    if (options?.name) {
        Object.defineProperty(ZodDtoWrapper, 'name', {
            value: options.name,
            writable: true,
            configurable: true,
        });
    }

    return ZodDtoWrapper as unknown as ZodDto<z.ZodObject<{ value: T }>>;
};