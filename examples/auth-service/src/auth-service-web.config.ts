import { Config } from "@zenith-framework/core";
import { ZenithWebConfig } from "@zenith-framework/web";

@Config('ZenithWebConfig')
export class AuthServiceWebConfig extends ZenithWebConfig {
    getPort(): number {
        return 3001;
    }
}