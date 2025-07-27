import { Orb } from "@zenith-framework/core";
import type { Validator } from "./validator";
import { z } from "zod";
import { webSystemLogger } from "../logger";
import { isZodDto, type ZodDto } from "./zod/create-zod-dto";

@Orb('Validator')
export class ZodValidator implements Validator<z.ZodSchema | ZodDto<any>> {
    async validate(data: any, baseSchema: z.ZodSchema | ZodDto<any>): Promise<boolean> {
        // By default, we expect to get the schema directly.
        // For Zod DTOs, we need to scavenge a bit to get the schema, especially for enums.
        let schema: z.ZodSchema;
        let schemaName: string | undefined;
        if (isZodDto(baseSchema)) {
            schema = baseSchema.schema as z.ZodSchema;
            schemaName = baseSchema.name;
        } else {
            schema = baseSchema;
            schemaName = schema.description;
        }

        const result = schema.safeParse(data);
        if (!result.success) {
            webSystemLogger.error(`Invalid data for schema ${schemaName}: ${result.error.message}`);
            return false;
        }
        return true;
    }
}