import type { z } from "zod/v4";

export const createZodDto = <T extends z.ZodTypeAny>(schema: T, options?: { name: string }) => {
    class ZodDto {
        static schema = schema;
    }

    if (options?.name) {
        Object.defineProperty(ZodDto, 'name', {
            value: options.name,
            writable: true,
            configurable: true,
        });
    }

    return ZodDto;
};