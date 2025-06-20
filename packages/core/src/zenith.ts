import 'reflect-metadata';
import { zenithLogger } from './logger'

import { ModuleLoader } from "./module-loader";
import { OrbContainer } from "./ioc/container";
import path from 'path';
import type { ZenithSystem } from './zenith-system';
import { ZENITH_ORB_TYPE_CONFIG } from './decorators/metadata-keys';

export class Zenith {
  private readonly logger = zenithLogger('Zenith');
  private readonly rootDir: string
  private readonly moduleLoader: ModuleLoader;
  private readonly container: OrbContainer;

  private readonly systems: ZenithSystem[] = [];

  constructor(private readonly debug: boolean = false) {
    this.rootDir = path.dirname(process.argv[1]!);
    this.moduleLoader = new ModuleLoader();
    this.container = new OrbContainer();
  }

  with(system: (new (...args: any[]) => ZenithSystem) | ZenithSystem) {
    this.systems.push(system instanceof Function ? new system() : system);
  }

  async start() {
    this.logger.info("Starting Zenith");

    try {
      // Always register the container first
      this.container.registerOrb(this.container, { name: 'OrbContainer' });


      await this.prepareSystems();

      const modules = await this.moduleLoader.scan(this.rootDir);
      this.container.registerModules(modules);
      this.container.instanciateOrbs();

      this.container.getOrbsByType(ZENITH_ORB_TYPE_CONFIG).forEach(orb => {
        this.logger.info(`Registered config \x1b[34m${orb.name}\x1b[0m using \x1b[34m${(orb.value as any).name}\x1b[0m`);
      });

      this.registerShutdownHooks();

      await this.startSystems();
    } catch {
      this.logger.error('Could not start Zenith, see errors above');
      process.exit(1);
    }

    this.logger.info(`All systems started`);
  }

  private async startSystems() {
    for (const system of this.systems) {
      this.logger.info(`Starting system \x1b[33m${system.constructor.name}\x1b[0m`);
      await system.onStart();
    }
  }

  private registerShutdownHooks() {
    process.on('SIGINT', async () => {
      for (const system of this.systems) {
        this.logger.info(`Stopping \x1b[33m${system.constructor.name}\x1b[0m`);
        await system.onStop();
      }
      this.logger.info(`Shutting down`);
      process.exit(0);
    });
  }

  private async prepareSystems() {
    for (const system of this.systems) {
      this.logger.info(`Initializing system \x1b[33m${system.constructor.name}\x1b[0m`);
      system.init(this.container);

      this.logger.info(`Registering orbs for system \x1b[33m${system.constructor.name}\x1b[0m`);
      await this.moduleLoader.scan(system.getPath());
    }
  }
}