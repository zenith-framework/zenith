import fs from 'fs';
import type { ZenithModule } from "./zenith-module";

export class ModuleLoader {
    private modules: ZenithModule[] = [];

    async scan(root: string): Promise<ZenithModule[]> {
        const dirEntries = fs.readdirSync(root, { withFileTypes: true, recursive: true })
            .filter(dirEntry => dirEntry.name !== 'index.ts' || dirEntry.parentPath !== root);

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