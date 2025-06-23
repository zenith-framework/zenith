import 'reflect-metadata';
import { zenithLogger } from './logger'

import { ModuleLoader } from "./module-loader";
import { OrbContainer } from "./ioc/container";
import path from 'path';
import type { ZenithSystem } from './zenith-system';
import { ZENITH_ORB_TYPE_CONFIG } from './decorators/metadata-keys';
import chalk from 'chalk';

export class Zenith {
  private readonly logger = zenithLogger('Zenith');
  private readonly rootDir: string
  private readonly moduleLoader: ModuleLoader;
  private readonly container: OrbContainer;

  private readonly systemsToLoad: (new (...args: any[]) => ZenithSystem)[] = [];
  private readonly systems: ZenithSystem[] = [];

  constructor(private readonly debug: boolean = false) {
    this.rootDir = path.dirname(process.argv[1]!);
    this.moduleLoader = new ModuleLoader();
    this.container = new OrbContainer();
  }

  with(system: new (container: OrbContainer) => ZenithSystem): this {
    this.systemsToLoad.push(system);
    return this;
  }

  async start() {
    const startTime = performance.now();
    this.logger.info("Starting Zenith");

    try {
      // Always register the container first
      this.container.registerOrb(this.container, { name: 'OrbContainer' });

      await this.prepareSystems();

      const modules = await this.moduleLoader.scan(this.rootDir);
      this.container.registerModules(modules);
      this.container.instanciateOrbs();

      this.container.getOrbsByType(ZENITH_ORB_TYPE_CONFIG).forEach(orb => {
        this.logger.info(`Registered config ${chalk.blue(orb.name)} using ${chalk.blue((orb.value as any).name)}`);
      });

      this.registerShutdownHooks();

      await this.startSystems();
    } catch (error) {
      this.logger.error(`Could not start Zenith: ${error instanceof Error ? error.stack : String(error)}`);
      process.exit(1);
    }

    const totalTimeInSeconds = (performance.now() - startTime) / 1000;
    this.logger.info(`Zenith started in ${chalk.green(totalTimeInSeconds.toFixed(3))} seconds`);
  }

  private async startSystems() {
    for (const system of this.systems) {
      this.logger.info(`Starting system ${chalk.yellow(system.constructor.name)}`);
      await system.onStart();
    }
  }

  private registerShutdownHooks() {
    process.on('SIGINT', async () => {
      for (const system of this.systems) {
        this.logger.info(`Stopping ${chalk.yellow(system.constructor.name)}`);
        await system.onStop();
      }
      this.logger.info(`Shutting down`);
      process.exit(0);
    });
  }

  private async prepareSystems() {
    for (const system of this.systemsToLoad) {
      this.logger.info(`Initializing system ${chalk.yellow(system.name)}`);
      const systemInstance = new system(this.container);
      const modules = await this.moduleLoader.scan(systemInstance.getRoot());
      this.container.registerModules(modules);

      this.systems.push(systemInstance);
    }
  }
}