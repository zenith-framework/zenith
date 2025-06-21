import fs from 'fs';
import type { ZenithModule } from "./zenith-module";
import { zenithLogger } from "./logger";

export class ModuleLoader {
    private readonly logger = zenithLogger('ModuleLoader');
    private modules: ZenithModule[] = [];

    async scan(root: string): Promise<ZenithModule[]> {
        this.logger.debug(`Scanning modules in ${root}`);
        const dirEntries = fs.readdirSync(root, { withFileTypes: true, recursive: true })
            .filter(dirEntry => (dirEntry.name !== 'index.ts' || dirEntry.parentPath !== root) && !dirEntry.name.includes('.spec.ts'));

        for (const dirEntry of dirEntries) {
            if (dirEntry.isFile()) {
                const module = await import(`${dirEntry.parentPath}/${dirEntry.name}`);
                this.modules.push({ name: dirEntry.name, path: `${dirEntry.parentPath}/${dirEntry.name}`, module });
            }
        }

        return this.modules;
    }

    getModules() {
        return this.modules;
    }
}