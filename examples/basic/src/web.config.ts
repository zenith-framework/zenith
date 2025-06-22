import { Config } from "@zenith-framework/core";
import { ZenithWebConfig } from "@zenith-framework/web";

@Config('ZenithWebConfig')
export class WebConfig implements ZenithWebConfig {
    httpServerPort = () => {
        return 3005;
    };
};