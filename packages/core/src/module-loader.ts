import fs from 'fs';
import type { ZenithModule } from "./zenith-module";
import { zenithLogger } from "./logger";
import { Glob } from 'bun';

export class ModuleLoader {
    private readonly logger = zenithLogger('ModuleLoader');
    private modules: ZenithModule[] = [];

    async scan(root: string): Promise<ZenithModule[]> {
        this.logger.debug(`Scanning modules in ${root}`);
        const glob = new Glob(`**/*.ts`);
        const files = [...glob.scanSync({ cwd: root, absolute: true })];
        const filteredFiles = files
            .filter(file => (file !== 'index.ts' && !file.endsWith('.spec.ts')));

        for (const file of filteredFiles) {
            const module = await import(file);
            this.modules.push({ name: file, path: file, module });
        }

        return this.modules;
    }

    getModules() {
        return this.modules;
    }
}