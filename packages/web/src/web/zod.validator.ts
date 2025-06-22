import { Orb } from "@zenith-framework/core";
import type { Validator } from "./validator";
import { z } from "zod";
import { webSystemLogger } from "../logger";

@Orb('Validator')
export class ZodValidator implements Validator<z.ZodSchema> {
    async validate(data: any, schema?: z.ZodSchema): Promise<boolean> {
        if (!schema) {
            webSystemLogger.error('No schema provided to ZodValidator');
            return false;
        }
        const result = schema.safeParse(data);
        if (!result.success) {
            webSystemLogger.error(`Invalid data for schema ${schema.description}: ${JSON.stringify(result.error)}`);
            return false;
        }
        return true;
    }
}   