import { Config } from "@zenith-framework/core";
import type { ZenithWebConfig } from "./zenith-web.config";

@Config('ZenithWebConfig')
export class DefaultZenithWebConfig implements ZenithWebConfig {
    getPort(): number {
        return 3000;
    }
} 