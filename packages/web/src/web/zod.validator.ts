import { Orb } from "@zenith-framework/core";
import type { Validator } from "./validator";
import { webSystemLogger } from "../logger";
import { isZodDto } from "./zod/create-zod-dto";

/**
 * The part of a Zod schema this validator actually uses.
 *
 * Declared structurally because `zod` and `zod/v4` expose separate type namespaces,
 * and DTOs are built against the latter.
 */
interface ParsableSchema {
    safeParse(data: unknown): { success: boolean, error?: { message: string } };
    description?: string;
}

@Orb('Validator')
export class ZodValidator implements Validator<unknown> {
    async validate(data: unknown, baseSchema: unknown): Promise<boolean> {
        // By default, we expect to get the schema directly.
        // For Zod DTOs, we need to scavenge a bit to get the schema, especially for enums.
        let schema: ParsableSchema;
        let schemaName: string | undefined;
        if (isZodDto(baseSchema)) {
            schema = baseSchema.schema as unknown as ParsableSchema;
            schemaName = baseSchema.name;
        } else {
            schema = baseSchema as ParsableSchema;
            schemaName = schema.description;
        }

        const result = schema.safeParse(data);
        if (!result.success) {
            webSystemLogger.error(`Invalid data for schema ${schemaName}: ${result.error?.message}`);
            return false;
        }
        return true;
    }
}
