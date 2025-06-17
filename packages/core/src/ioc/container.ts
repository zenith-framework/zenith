import { ZENITH_ORB_INJECT_NAME, ZENITH_ORB_INJECT_OPTIONS, ZENITH_ORB_PROVIDE, ZENITH_ORB_TYPE } from "../decorators/metadata-keys";
import { Orb } from "./orb";
import type { ZenithModule } from "../zenith-module";
import { zenithLogger } from "../logger";
import type { InjectOrbOptions } from "../decorators";

export class OrbContainer {
  private readonly logger = zenithLogger('OrbContainer');
  private readonly orbs: Map<string, Orb<any>>;
  private readonly orbsByType: Map<string, Orb<any>[]>;

  constructor() {
    this.orbs = new Map();
    this.orbsByType = new Map();
  }

  registerOrb<T>(orbRaw: (new (...args: any[]) => T) | T, options: { name?: string } = {}) {
    const orbName = options.name ?? this.getInjectableOrbName(orbRaw);
    if (!orbName) {
      throw new Error('Cannot register orb without a name')
    }
    let orb: Orb<any> | undefined;

    if (orbRaw instanceof Function) {
      const dependencies = Reflect.getMetadata('design:paramtypes', orbRaw) as (any[] | undefined) ?? [];
      const dependenciesNames = dependencies.map((dependency, index) => this.getInjectableOrbName(dependency, index));
      orb = new Orb<typeof orbRaw>(orbName, orbRaw, dependenciesNames, null);
      const type = Reflect.getMetadata(ZENITH_ORB_TYPE, orbRaw);
      if (type) {
        const orbs = this.orbsByType.get(type) ?? [];
        orbs.push(orb);
        this.orbsByType.set(type, orbs);
      }
    } else {
      orb = new Orb<T>(orbName, orbRaw, [], orbRaw);
    }

    this.orbs.set(orb.name, orb);

    this.logger.debug(`Registered \x1b[34m${orb.name}\x1b[0m`);
  }

  instanciateOrbs() {
    const indegrees = new Map<string, number>();

    for (const orb of this.orbs.values()) {
      indegrees.set(orb.name, 0);
    }

    for (const orb of this.orbs.values()) {
      for (const dependency of orb.dependencies) {
        indegrees.set(dependency, (indegrees.get(dependency) ?? 1) + 1);
      }
    }

    const zeroIndegreeOrbs: string[] = []
    for (const orb of this.orbs.values()) {
      if (indegrees.get(orb.name) === 0) {
        zeroIndegreeOrbs.push(orb.name);
      }
    }

    const topologicalSortedOrbs: string[] = [];
    while (zeroIndegreeOrbs.length > 0) {
      const orb = this.orbs.get(zeroIndegreeOrbs.pop()!)!;
      if (orb.getInstance()) {
        continue;
      }

      topologicalSortedOrbs.push(orb.name);

      for (const dependency of orb.dependencies) {
        indegrees.set(dependency, indegrees.get(dependency)! - 1);
        if (indegrees.get(dependency) === 0) {
          zeroIndegreeOrbs.push(dependency);
        }
      }
    }

    while (topologicalSortedOrbs.length > 0) {
      const orb = this.orbs.get(topologicalSortedOrbs.pop()!)!;
      if (orb.getInstance()) {
        continue;
      }

      const instance = this.provideInstance(orb.type);
      orb.setInstance(instance);
    }
  }

  getOrbsByType<T>(type: string): Orb<T>[] {
    return this.orbsByType.get(type) ?? [];
  }

  private getInjectableOrbName<T>(orbRaw: (new (...args: any[]) => T) | T, index?: number): string {
    const base = typeof orbRaw === 'function' ? orbRaw : (orbRaw as any).constructor;
    const injectName = index ? Reflect.getMetadata(ZENITH_ORB_INJECT_NAME, base, index.toString()) : Reflect.getMetadata(ZENITH_ORB_INJECT_NAME, base);
    return injectName ?? base.name;
  }

  private provideInstance(orbRaw: (new (...args: any[]) => any)): any {
    const parameters = Reflect.getMetadata('design:paramtypes', orbRaw) as (any[] | undefined) ?? [];
    if (!parameters) {
      throw new Error(`Orb ${orbRaw.name} is not injectable`);
    }
    const paramToOrb = parameters.map((parameter, index) => {
      const name = Reflect.getMetadata(ZENITH_ORB_INJECT_NAME, orbRaw, index.toString()) ?? parameter.name;
      const options = Reflect.getMetadata(ZENITH_ORB_INJECT_OPTIONS, orbRaw, index.toString()) ?? {} as InjectOrbOptions;
      if (!name) {
        throw new Error(`Cannot inject parameter ${index} of orb ${orbRaw.name}`);
      }
      const orb = this.get(name) as Orb<typeof parameter>;
      if (!orb && !options.allowAbsent) {
        throw new Error(`Orb ${name} not found`);
      }
      return orb;
    });
    const instance = new orbRaw(...paramToOrb);
    return instance;
  }

  get<T>(provider: (new (...args: any[]) => T) | string): T | undefined {
    const name = typeof provider === 'string' ? provider : this.getInjectableOrbName(provider);
    const orb = this.orbs.get(name);
    if (!orb) {
      return undefined;
    }

    return orb.getInstance();
  }

  registerModules(modules: ZenithModule[]) {
    for (const module of modules) {
      this.registerModule(module);
    }
  }

  registerModule(module: ZenithModule) {
    for (const key in module.module) {
      const value = module.module[key];
      if (typeof value === 'function') {
        const shouldProvide = Reflect.getMetadata(ZENITH_ORB_PROVIDE, value);
        if (shouldProvide) {
          this.registerOrb(value);
        }
      }
    }
  }
} 