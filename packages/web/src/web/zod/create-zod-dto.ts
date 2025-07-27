import type { z } from "zod/v4";

export interface ZodDto<
    TSchema extends z.ZodTypeAny
> {
    new(): ReturnType<TSchema['parse']>
    schema: TSchema
}

export const createZodDto = <T extends z.ZodTypeAny>(schema: T, options?: { name: string }) => {
    class ZodDtoWrapper {
        static schema = schema;
    }

    if (options?.name) {
        Object.defineProperty(ZodDtoWrapper, 'name', {
            value: options.name,
            writable: true,
            configurable: true,
        });
    }

    return ZodDtoWrapper as ZodDto<T>;
};