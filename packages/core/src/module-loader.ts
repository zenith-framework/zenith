import type { ZenithModule } from "./zenith-module";
import { zenithLogger } from "./logger";
import { Glob } from 'bun';
import chalk from "chalk";

export class ModuleLoader {
    private readonly logger = zenithLogger('ModuleLoader');
    private visitedModules: Set<string> = new Set();

    async scan(root: string): Promise<ZenithModule[]> {
        const modules: ZenithModule[] = [];
        this.logger.debug(`Scanning modules in ${root}`);
        const glob = new Glob(`**/*.ts`);
        const files = [...glob.scanSync({ cwd: root, absolute: true })];
        const filteredFiles = files
            .filter(file => (!file.endsWith('.spec.ts') && !file.endsWith('/index.ts')));

        for (const file of filteredFiles) {
            if (this.visitedModules.has(file)) {
                continue;
            }
            const module = await import(file);
            modules.push({ name: file, path: file, module });
            this.visitedModules.add(file);
        }

        return modules;
    }
}