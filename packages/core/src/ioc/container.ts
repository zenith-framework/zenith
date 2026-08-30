import { ZENITH_ORB_INJECT_NAME, ZENITH_ORB_INJECT_OPTIONS, ZENITH_ORB_PROVIDE, ZENITH_ORB_TYPE, ZENITH_ORB_TYPE_CONFIG } from "../decorators/metadata-keys";
import { OrbWrapper } from "./orb-wrapper";
import type { ZenithModule } from "../zenith-module";
import { zenithLogger } from "../logger";
import type { InjectOrbOptions } from "../decorators/inject-orb";
import { CyclicDependencyError } from "./cyclic-dependencies.error";
import chalk from "chalk";
import { getInjectableOrbName } from "./utils";
import type { Constructor } from "../types";
import { hasOnDestroy, hasOnInit } from "./orb-lifecycle";
import { isReservedOrbName } from "./reserved-orb-names";

export class OrbContainer {
  private readonly modules: ZenithModule[] = [];
  private readonly logger = zenithLogger('OrbContainer');
  private readonly orbs: Map<string, OrbWrapper<unknown>>;
  /** Order in which orbs were constructed: dependencies before their dependents. */
  private readonly initialisationOrder: string[] = [];

  constructor() {
    this.orbs = new Map();
  }

  /**
   * `T` describes the instance the orb resolves to. It cannot be inferred from an
   * `unknown` provider, so callers that need the typed wrapper state it, as with get().
   */
  registerOrb<T = unknown>(orbRaw: unknown, options: { name?: string, source?: string } = {}): OrbWrapper<T> {
    const orbName = options.name ?? getInjectableOrbName(orbRaw);
    if (!orbName) {
      throw new Error('Cannot register orb without a name')
    }
    let orb: OrbWrapper<T>;
    const type = Reflect.getMetadata(ZENITH_ORB_TYPE, typeof orbRaw === 'function' ? orbRaw : (orbRaw as object).constructor);

    this.assertNameIsAvailable(orbName, orbRaw, type, options.source);

    if (orbRaw instanceof Function) {
      assertDecoratorMetadataIsEmitted(orbRaw as Constructor);
      const dependencies = Reflect.getMetadata('design:paramtypes', orbRaw) as (Constructor[] | undefined) ?? [];
      const dependenciesNames = dependencies.map((dependency, index) => this.getInjectableOrbNameFromParameter(orbRaw, index, dependency.name));
      orb = new OrbWrapper<T>(orbName, type, orbRaw, dependenciesNames, null, options.source);
    } else {
      orb = new OrbWrapper<T>(orbName, type, orbRaw, [], orbRaw as T, options.source);
    }

    this.orbs.set(orb.name, orb as OrbWrapper<unknown>);
    this.logger.debug(`Registered orb ${chalk.blue(orb.name)}`);
    return orb;
  }

  /**
   * With filesystem scanning there is no import list to catch a name clash, so two
   * classes sharing a name would otherwise overwrite each other in silence.
   *
   * Configs are exempt: replacing a config by declaring one under the same name is
   * how a project overrides a system's defaults.
   */
  private assertNameIsAvailable(orbName: string, orbRaw: unknown, type: string | undefined, source?: string) {
    const existing = this.orbs.get(orbName);
    if (!existing || existing.value === orbRaw) {
      // Re-registering the same class (a re-export, a file scanned twice) is a no-op.
      return;
    }
    if (type === ZENITH_ORB_TYPE_CONFIG) {
      return;
    }

    const where = [existing.source, source].filter(Boolean);
    const locations = where.length === 2 ? ` (${where[0]} and ${where[1]})` : '';
    throw new Error(
      `Two different orbs are registered as '${orbName}'${locations}. ` +
      `Give one of them another name with @Orb('AnotherName').`
    );
  }

  instanciateOrbs() {
    const indegrees = new Map<string, number>();

    for (const orb of this.orbs.values()) {
      indegrees.set(orb.name, 0);
    }

    for (const orb of this.orbs.values()) {
      for (const dependency of orb.dependencies) {
        // Unregistered dependencies are not graph nodes. They are reported with full
        // context by provideInstance (or ignored when declared allowAbsent).
        if (!indegrees.has(dependency)) {
          continue;
        }
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
        if (!indegrees.has(dependency)) {
          continue;
        }
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
              stack.push({ orb: neighbor, dependencies: [...(this.orbs.get(neighbor)?.dependencies ?? [])] });
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

    // topologicalSortedOrbs runs dependents -> dependencies; reverse it so every orb
    // is built (and later initialised) after everything it depends on.
    const dependenciesFirst = [...topologicalSortedOrbs].reverse();
    const failedInjections: string[] = [];

    for (const orbName of dependenciesFirst) {
      const orb = this.orbs.get(orbName)!;
      this.initialisationOrder.push(orbName);
      if (orb.getInstance()) {
        continue;
      }

      try {
        const instance = this.provideInstance(orb.value as Constructor);
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
  }

  /**
   * Runs `onInit` on every orb that declares one, in dependency order.
   *
   * This is the seam between "the graph is constructed" and "the systems start":
   * the place for an orb to open a connection, warm a cache, or run a migration.
   */
  async initOrbs(): Promise<void> {
    for (const orbName of this.initialisationOrder) {
      const instance = this.orbs.get(orbName)?.getInstance();
      if (!hasOnInit(instance)) {
        continue;
      }

      this.logger.debug(`Initializing orb ${chalk.blue(orbName)}`);
      try {
        await instance.onInit();
      } catch (error) {
        this.logger.error(`Error initializing ${chalk.red(orbName)}: ${error instanceof Error ? error.stack : String(error)}`);
        throw error;
      }
    }
  }

  /**
   * Runs `onDestroy` on every orb that declares one, in reverse initialisation order.
   *
   * Orbs registered after startup are destroyed first, since nothing that was already
   * running can depend on them. Failures are logged so one bad teardown cannot strand
   * the resources held by the others.
   */
  async destroyOrbs(): Promise<void> {
    const initialised = new Set(this.initialisationOrder);
    const registeredLate = [...this.orbs.keys()].filter(name => !initialised.has(name));
    const destructionOrder = [...registeredLate, ...[...this.initialisationOrder].reverse()];

    for (const orbName of destructionOrder) {
      const instance = this.orbs.get(orbName)?.getInstance();
      if (!hasOnDestroy(instance)) {
        continue;
      }

      this.logger.debug(`Destroying orb ${chalk.blue(orbName)}`);
      try {
        await instance.onDestroy();
      } catch (error) {
        this.logger.error(`Error destroying ${chalk.red(orbName)}: ${error instanceof Error ? error.stack : String(error)}`);
      }
    }
  }

  getOrbsByType<T>(type: string): OrbWrapper<T>[] {
    return Array.from(this.orbs.values()).filter(orb => orb.type === type) as unknown as OrbWrapper<T>[];
  }

  private getInjectableOrbNameFromParameter(orbRaw: unknown, parameterIndex: number, parameterTypeName: string): string {
    const base = typeof orbRaw === 'function' ? orbRaw : (orbRaw as object).constructor;
    const injectName = Reflect.getMetadata(ZENITH_ORB_INJECT_NAME, base, parameterIndex.toString()) as string | undefined;
    return injectName ?? parameterTypeName;
  }

  private provideInstance(orbRaw: Constructor): unknown {
    const parameters = Reflect.getMetadata('design:paramtypes', orbRaw) as (Constructor[] | undefined) ?? [];
    const resolvedDependencies = parameters.map((parameter, index) => {
      const name = (Reflect.getMetadata(ZENITH_ORB_INJECT_NAME, orbRaw, index.toString()) as string | undefined) ?? parameter.name;
      const options = (Reflect.getMetadata(ZENITH_ORB_INJECT_OPTIONS, orbRaw, index.toString()) as InjectOrbOptions | undefined) ?? {};
      if (!name) {
        throw new Error(`Cannot inject parameter ${index} of orb ${orbRaw.name}`);
      }
      const dependency = this.get(name);
      if (!dependency && !options.allowAbsent) {
        throw new Error(`Orb ${name} not found`);
      }
      return dependency;
    });
    return new orbRaw(...resolvedDependencies);
  }

  /**
   * Resolving by class infers the instance type. Resolving by name cannot, so it is a
   * separate overload: without one, `T | undefined` has no inference site and collapses
   * to `undefined` at the call site.
   */
  get<T>(orbClass: Constructor<T>): T | undefined;
  get<T = unknown>(orbName: string): T | undefined;
  get<T>(provider: Constructor<T> | string): T | undefined {
    const name = typeof provider === 'string' ? provider : getInjectableOrbName(provider);
    const orb = this.orbs.get(name);
    if (!orb) {
      return undefined;
    }

    return orb.getInstance() as T | undefined;
  }

  registerModules(modules: ZenithModule[]) {
    for (const module of modules) {
      this.modules.push(module);
      this.registerModule(module);
    }
  }

  /**
   * Every module the scan loaded. Orbs are picked out of these automatically; systems
   * use this to find declarations that are not orbs, such as exported routers.
   */
  getModules(): readonly ZenithModule[] {
    return this.modules;
  }

  registerModule(module: ZenithModule) {
    for (const key in module.module) {
      const value = module.module[key];
      if (typeof value === 'function') {
        const shouldProvide = Reflect.getMetadata(ZENITH_ORB_PROVIDE, value);
        if (shouldProvide) {
          const orbName = getInjectableOrbName(value);
          if (isReservedOrbName(orbName)) {
            throw new Error(
              `'${orbName}' is reserved by Zenith but is declared as an orb in ${module.path}. ` +
              `Give it another name with @Orb('AnotherName').`
            );
          }
          this.registerOrb(value, { source: module.path });
        }
      }
    }
  }
}

/**
 * Constructor parameter types come from the `design:paramtypes` metadata emitted by
 * `emitDecoratorMetadata`. Without that flag the container silently builds every orb
 * with zero arguments, and the failure only surfaces much later as an undefined
 * property access. Detect it at registration and say what is actually wrong.
 */
function assertDecoratorMetadataIsEmitted(orbRaw: Constructor) {
  if (orbRaw.length === 0) {
    return;
  }
  if (Reflect.getMetadata('design:paramtypes', orbRaw) !== undefined) {
    return;
  }
  throw new Error(
    `Cannot read the constructor dependencies of '${orbRaw.name}'. ` +
    `Set "experimentalDecorators": true and "emitDecoratorMetadata": true in the tsconfig.json that applies to this file.`
  );
}
