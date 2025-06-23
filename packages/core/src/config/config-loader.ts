import path from 'path';
import dotenv from 'dotenv';
import { zenithLogger } from '../logger';
import { ZenithConfig } from './zenith-config';

const ENV_FILE_NAME = '.env';

export class ConfigLoader {
    private readonly logger = zenithLogger('ConfigLoader');
    constructor(private readonly zenithRoot: string) {
    }

    private async findFolderWithNearestConfigFile(env?: string): Promise<string | undefined> {
        let root: string | undefined = this.zenithRoot;

        const envFileName = env ? `${ENV_FILE_NAME}.${env}` : ENV_FILE_NAME;
        while (root !== '/') {
            const envSpecificFile = Bun.file(`${root}/${envFileName}`);
            const envFile = Bun.file(`${root}/${ENV_FILE_NAME}`);
            if (await envSpecificFile.exists() || await envFile.exists()) {
                return root;
            }
            root = path.dirname(root);
        }

        return undefined;
    }

    async loadConfig(env?: string): Promise<ZenithConfig> {
        const configFolder = await this.findFolderWithNearestConfigFile(env);
        const values: Record<string, any> = {};
        if (!configFolder) {
            return new ZenithConfig(values);
        }

        const filesToLoad: string[] = [`${configFolder}/.env`];
        if (env) {
            filesToLoad.push(`${configFolder}/.env.${env}`);
        }

        for (const file of filesToLoad) {
            const fileContent = await Bun.file(file).text();
            Object.assign(values, dotenv.parse(fileContent));
            this.logger.info(`Applying config from ${file}`);
        }

        return new ZenithConfig(values);
    }
}