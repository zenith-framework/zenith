import { ZENITH_ORB_INJECT_NAME, ZENITH_ORB_INJECT_OPTIONS, ZENITH_ORB_PROVIDE, ZENITH_ORB_TYPE } from "../decorators/metadata-keys";
import { OrbWrapper } from "./orb-wrapper";
import type { ZenithModule } from "../zenith-module";
import { zenithLogger } from "../logger";
import type { InjectOrbOptions } from "../decorators";
import { CyclicDependencyError } from "./cyclic-dependencies.error";
import chalk from "chalk";
import { getInjectableOrbName } from "./utils";

export class OrbContainer {
  private readonly logger = zenithLogger('OrbContainer');
  private readonly orbs: Map<string, OrbWrapper<any>>;

  constructor() {
    this.orbs = new Map();
  }

  registerOrb<T>(orbRaw: (new (...args: any[]) => T) | T, options: { name?: string } = {}) {
    const orbName = options.name ?? getInjectableOrbName(orbRaw);
    if (!orbName) {
      throw new Error('Cannot register orb without a name')
    }
    let orb: OrbWrapper<any> | undefined;
    const type = Reflect.getMetadata(ZENITH_ORB_TYPE, typeof orbRaw === 'function' ? orbRaw : (orbRaw as any).constructor);

    if (orbRaw instanceof Function) {
      const dependencies = Reflect.getMetadata('design:paramtypes', orbRaw) as (any[] | undefined) ?? [];
      const dependenciesNames = dependencies.map((dependency, index) => this.getInjectableOrbNameFromParameter(orbRaw, index, dependency.name));
      orb = new OrbWrapper<typeof orbRaw>(orbName, type, orbRaw, dependenciesNames, null);
    } else {
      orb = new OrbWrapper<T>(orbName, type, orbRaw, [], orbRaw);
    }

    this.orbs.set(orb.name, orb);
    this.logger.debug(`Registered orb ${chalk.blue(orb.name)}`);
  }

  instanciateOrbs() {
    const indegrees = new Map<string, number>();

    for (const orb of this.orbs.values()) {
      indegrees.set(orb.name, 0);
    }

    for (const orb of this.orbs.values()) {
      for (const dependency of orb.dependencies) {
        indegrees.set(dependency, indegrees.get(dependency)! + 1);
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

      topologicalSortedOrbs.push(orb.name);

      for (const dependency of orb.dependencies) {
        indegrees.set(dependency, indegrees.get(dependency)! - 1);
        if (indegrees.get(dependency) === 0) {
          zeroIndegreeOrbs.push(dependency);
        }
      }
    }

    if (topologicalSortedOrbs.length < this.orbs.size) {
      const visited = new Set<string>();
      const onStack = new Set<string>();
      const cycles = [];

      for (const startNode of this.orbs.values()) {
        if (visited.has(startNode.name)) {
          continue;
        }

        const stack = [{ orb: startNode.name, dependencies: [...startNode.dependencies] }];
        const path = [startNode.name];
        onStack.add(startNode.name);

        while (stack.length > 0) {
          const { orb: currentNode, dependencies } = stack.pop()!;
          const neighbor = dependencies.shift();
          stack.push({ orb: currentNode, dependencies: [...dependencies] });
          if (!neighbor) {
            stack.pop();
            const node = path.pop()!;
            onStack.delete(node);
            visited.add(node);
          } else {
            if (!visited.has(neighbor)) {
              stack.push({ orb: neighbor, dependencies: [...this.orbs.get(neighbor)!.dependencies] });
              path.push(neighbor);
              onStack.add(neighbor);
              visited.add(neighbor);
              continue;
            } else if (onStack.has(neighbor)) {
              const cycleStart = path.indexOf(neighbor);
              const cycle = [...path.slice(cycleStart), neighbor];
              cycles.push(cycle);
            }
          }
        }
      }

      this.logger.error(`Cyclic dependency detected: ${cycles.map(cycle => cycle.join(' -> ')).join(', ')}`);
      throw new CyclicDependencyError(cycles);
    }

    const failedInjections: string[] = [];
    while (topologicalSortedOrbs.length > 0) {
      const orb = this.orbs.get(topologicalSortedOrbs.pop()!)!;
      if (orb.getInstance()) {
        continue;
      }

      try {
        const instance = this.provideInstance(orb.value);
        orb.setInstance(instance);
      } catch (error) {
        this.logger.error(`Error providing instance for ${orb.name}: ${error instanceof Error ? error.stack : String(error)}`);
        failedInjections.push(orb.name);
        continue;
      }
    }

    if (failedInjections.length > 0) {
      this.logger.error(`Failed to instantiate [${chalk.red(failedInjections.join(', '))}]`);
      throw new Error(`Failed to instantiate [${failedInjections.join(', ')}]`);
    }

    if (topologicalSortedOrbs.length > 0) {
      this.logger.error(`Cyclic dependency detected: ${topologicalSortedOrbs.join(' -> ')}`);
      throw new CyclicDependencyError([topologicalSortedOrbs]);
    }
  }

  getOrbsByType<T>(type: string): OrbWrapper<T>[] {
    return Array.from(this.orbs.values()).filter(orb => orb.type === type) as OrbWrapper<T>[];
  }

  private getInjectableOrbNameFromParameter<T>(orbRaw: (new (...args: any[]) => T) | T, parameterIndex: number, parameterTypeName: string): string {
    const base = typeof orbRaw === 'function' ? orbRaw : (orbRaw as any).constructor;
    const injectName = Reflect.getMetadata(ZENITH_ORB_INJECT_NAME, base, parameterIndex.toString());
    return injectName ?? parameterTypeName;
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
      const orb = this.get(name) as OrbWrapper<typeof parameter>;
      if (!orb && !options.allowAbsent) {
        throw new Error(`Orb ${name} not found`);
      }
      return orb;
    });
    const instance = new orbRaw(...paramToOrb);
    return instance;
  }

  get<T>(provider: (new (...args: any[]) => T) | string): T | undefined {
    const name = typeof provider === 'string' ? provider : getInjectableOrbName(provider);
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