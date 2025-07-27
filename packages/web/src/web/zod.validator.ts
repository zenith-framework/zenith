import { Orb } from "@zenith-framework/core";
import type { Validator } from "./validator";
import { z } from "zod";
import { webSystemLogger } from "../logger";
import { isZodDto, type ZodDto } from "./zod/create-zod-dto";

@Orb('Validator')
export class ZodValidator implements Validator<z.ZodSchema | ZodDto<any>> {
    async validate(data: any, schema?: z.ZodSchema | ZodDto<any>): Promise<boolean> {
        if (!schema) {
            webSystemLogger.error('No schema provided to ZodValidator');
            return false;
        }

        // By default, we expect to get the schema directly.
        // For Zod DTOs, we need to scavenge a bit to get the schema, especially for enums.
        let dataToValidate = data;
        if (isZodDto(schema)) {
            if (schema.isEnumWrapper) {
                dataToValidate = { value: data };
            }
            schema = schema.schema as z.ZodSchema;
        }

        const result = schema.safeParse(dataToValidate);
        if (!result.success) {
            webSystemLogger.error(`Invalid data for schema ${schema.description}: ${JSON.stringify(result.error)}`);
            return false;
        }
        return true;
    }
}