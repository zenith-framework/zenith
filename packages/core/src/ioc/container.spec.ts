import 'reflect-metadata';
import { beforeEach, describe, expect, it } from 'bun:test';

import { Config } from '../decorators/config';
import { InjectOrb } from '../decorators/inject-orb';
import { Orb } from '../decorators/orb';
import { ZENITH_ORB_TYPE_CONFIG } from '../decorators/metadata-keys';
import { OrbContainer } from './container';
import { CyclicDependencyError } from './cyclic-dependencies.error';
import type { OnOrbDestroy, OnOrbInit } from './orb-lifecycle';

describe('OrbContainer', () => {
    let container: OrbContainer;

    beforeEach(() => {
        container = new OrbContainer();
    });

    describe('registration and resolution', () => {
        it('instantiates an orb without dependencies', () => {
            @Orb()
            class Standalone {
                readonly id = 'standalone';
            }

            container.registerOrb(Standalone);
            container.instanciateOrbs();

            expect(container.get(Standalone)).toBeInstanceOf(Standalone);
            expect(container.get<Standalone>('Standalone')!.id).toBe('standalone');
        });

        it('returns undefined for an orb that was never registered', () => {
            expect(container.get('NeverRegistered')).toBeUndefined();
        });

        it('registers a plain value under an explicit name', () => {
            const value = { answer: 42 };

            container.registerOrb(value, { name: 'Answer' });
            container.instanciateOrbs();

            expect(container.get<typeof value>('Answer')).toBe(value);
        });

        it('honours the name given to @Orb', () => {
            @Orb('RenamedOrb')
            class OriginalName { }

            container.registerOrb(OriginalName);
            container.instanciateOrbs();

            expect(container.get('RenamedOrb')).toBeInstanceOf(OriginalName);
            expect(container.get('OriginalName')).toBeUndefined();
        });

        it('resolves the same singleton instance for every consumer', () => {
            @Orb()
            class Shared { }

            @Orb()
            class FirstConsumer {
                constructor(readonly shared: Shared) { }
            }

            @Orb()
            class SecondConsumer {
                constructor(readonly shared: Shared) { }
            }

            container.registerOrb(Shared);
            container.registerOrb(FirstConsumer);
            container.registerOrb(SecondConsumer);
            container.instanciateOrbs();

            const shared = container.get(Shared);
            expect(container.get(FirstConsumer)!.shared).toBe(shared!);
            expect(container.get(SecondConsumer)!.shared).toBe(shared!);
        });
    });

    describe('dependency injection', () => {
        it('injects constructor dependencies by type name', () => {
            @Orb()
            class Repository {
                findAll() {
                    return ['a', 'b'];
                }
            }

            @Orb()
            class Service {
                constructor(readonly repository: Repository) { }
            }

            container.registerOrb(Repository);
            container.registerOrb(Service);
            container.instanciateOrbs();

            expect(container.get(Service)!.repository).toBeInstanceOf(Repository);
            expect(container.get(Service)!.repository.findAll()).toEqual(['a', 'b']);
        });

        it('instantiates a dependency chain deepest-first', () => {
            const instantiationOrder: string[] = [];

            @Orb()
            class Level3 {
                constructor() {
                    instantiationOrder.push('Level3');
                }
            }

            @Orb()
            class Level2 {
                constructor(readonly level3: Level3) {
                    instantiationOrder.push('Level2');
                }
            }

            @Orb()
            class Level1 {
                constructor(readonly level2: Level2) {
                    instantiationOrder.push('Level1');
                }
            }

            // Registered in reverse to prove ordering comes from the graph, not insertion.
            container.registerOrb(Level1);
            container.registerOrb(Level2);
            container.registerOrb(Level3);
            container.instanciateOrbs();

            expect(instantiationOrder).toEqual(['Level3', 'Level2', 'Level1']);
            expect(container.get(Level1)!.level2.level3).toBeInstanceOf(Level3);
        });

        it('instantiates a diamond dependency exactly once', () => {
            let baseInstantiations = 0;

            @Orb()
            class Base {
                constructor() {
                    baseInstantiations++;
                }
            }

            @Orb()
            class Left {
                constructor(readonly base: Base) { }
            }

            @Orb()
            class Right {
                constructor(readonly base: Base) { }
            }

            @Orb()
            class Top {
                constructor(readonly left: Left, readonly right: Right) { }
            }

            container.registerOrb(Base);
            container.registerOrb(Left);
            container.registerOrb(Right);
            container.registerOrb(Top);
            container.instanciateOrbs();

            expect(baseInstantiations).toBe(1);
            const top = container.get(Top)!;
            expect(top.left.base).toBe(top.right.base);
        });

        it('injects by explicit name with @InjectOrb', () => {
            @Orb('DatabaseUrl')
            class Ignored { }

            @Orb()
            class NeedsNamed {
                constructor(@InjectOrb('DatabaseUrl') readonly url: any) { }
            }

            container.registerOrb(Ignored);
            container.registerOrb(NeedsNamed);
            container.instanciateOrbs();

            expect(container.get(NeedsNamed)!.url).toBeInstanceOf(Ignored);
        });

        it('injects an @InjectOrb dependency positioned after an inferred one', () => {
            @Orb()
            class Inferred { }

            @Orb('Named')
            class ByName { }

            @Orb()
            class MixedInjection {
                constructor(
                    readonly inferred: Inferred,
                    @InjectOrb('Named') readonly named: any,
                ) { }
            }

            container.registerOrb(Inferred);
            container.registerOrb(ByName);
            container.registerOrb(MixedInjection);
            container.instanciateOrbs();

            const mixed = container.get(MixedInjection)!;
            expect(mixed.inferred).toBeInstanceOf(Inferred);
            expect(mixed.named).toBeInstanceOf(ByName);
        });
    });

    describe('missing dependencies', () => {
        it('fails to instantiate when a dependency is not registered', () => {
            @Orb()
            class NeedsMissing {
                constructor(@InjectOrb('DoesNotExist') readonly missing: any) { }
            }

            container.registerOrb(NeedsMissing);

            expect(() => container.instanciateOrbs()).toThrow('Failed to instantiate [NeedsMissing]');
        });

        it('injects undefined when the dependency is declared allowAbsent', () => {
            @Orb()
            class TolerantOfMissing {
                constructor(@InjectOrb('DoesNotExist', { allowAbsent: true }) readonly missing: any) { }
            }

            container.registerOrb(TolerantOfMissing);
            container.instanciateOrbs();

            expect(container.get(TolerantOfMissing)).toBeInstanceOf(TolerantOfMissing);
            expect(container.get(TolerantOfMissing)!.missing).toBeUndefined();
        });

        it('still instantiates unrelated orbs alongside an allowAbsent gap', () => {
            @Orb()
            class Present { }

            @Orb()
            class PartiallySatisfied {
                constructor(
                    readonly present: Present,
                    @InjectOrb('DoesNotExist', { allowAbsent: true }) readonly missing: any,
                ) { }
            }

            container.registerOrb(Present);
            container.registerOrb(PartiallySatisfied);
            container.instanciateOrbs();

            expect(container.get(PartiallySatisfied)!.present).toBeInstanceOf(Present);
            expect(container.get(PartiallySatisfied)!.missing).toBeUndefined();
        });
    });

    describe('cyclic dependencies', () => {
        it('detects a direct two-orb cycle', () => {
            @Orb()
            class CycleA {
                constructor(@InjectOrb('CycleB') readonly b: any) { }
            }

            @Orb()
            class CycleB {
                constructor(@InjectOrb('CycleA') readonly a: any) { }
            }

            container.registerOrb(CycleA);
            container.registerOrb(CycleB);

            expect(() => container.instanciateOrbs()).toThrow(CyclicDependencyError);
        });

        it('detects a three-orb cycle', () => {
            @Orb()
            class RingA {
                constructor(@InjectOrb('RingB') readonly b: any) { }
            }

            @Orb()
            class RingB {
                constructor(@InjectOrb('RingC') readonly c: any) { }
            }

            @Orb()
            class RingC {
                constructor(@InjectOrb('RingA') readonly a: any) { }
            }

            container.registerOrb(RingA);
            container.registerOrb(RingB);
            container.registerOrb(RingC);

            expect(() => container.instanciateOrbs()).toThrow(CyclicDependencyError);
        });

        it('reports the members of the cycle', () => {
            @Orb()
            class PairA {
                constructor(@InjectOrb('PairB') readonly b: any) { }
            }

            @Orb()
            class PairB {
                constructor(@InjectOrb('PairA') readonly a: any) { }
            }

            container.registerOrb(PairA);
            container.registerOrb(PairB);

            try {
                container.instanciateOrbs();
                throw new Error('expected instanciateOrbs to throw');
            } catch (error) {
                expect(error).toBeInstanceOf(CyclicDependencyError);
                const names = (error as CyclicDependencyError).cycles.flat();
                expect(names).toContain('PairA');
                expect(names).toContain('PairB');
            }
        });

        it('does not report a cycle for a self-contained acyclic graph', () => {
            @Orb()
            class Leaf { }

            @Orb()
            class Branch {
                constructor(readonly leaf: Leaf) { }
            }

            container.registerOrb(Leaf);
            container.registerOrb(Branch);

            expect(() => container.instanciateOrbs()).not.toThrow();
        });
    });

    describe('getOrbsByType', () => {
        it('returns only orbs matching the requested type', () => {
            @Config('SomeConfig')
            class SomeConfig { }

            @Orb()
            class NotAConfig { }

            container.registerOrb(SomeConfig);
            container.registerOrb(NotAConfig);
            container.instanciateOrbs();

            const configs = container.getOrbsByType(ZENITH_ORB_TYPE_CONFIG);
            expect(configs).toHaveLength(1);
            expect(configs[0]!.name).toBe('SomeConfig');
        });

        it('returns an empty list when nothing matches', () => {
            expect(container.getOrbsByType('__NO_SUCH_TYPE')).toEqual([]);
        });
    });

    describe('decorator metadata', () => {
        it('explains the problem when design:paramtypes is missing', () => {
            // Mimics a project compiled without emitDecoratorMetadata: a constructor
            // that takes dependencies but carries no paramtypes metadata.
            class NoMetadata {
                constructor(readonly dependency: unknown) { }
            }

            expect(() => container.registerOrb(NoMetadata)).toThrow(/emitDecoratorMetadata/);
        });

        it('accepts a dependency-free class with no metadata', () => {
            class NoDependencies { }

            expect(() => container.registerOrb(NoDependencies)).not.toThrow();
        });
    });

    describe('lifecycle', () => {
        it('runs onInit in dependency order', async () => {
            const initialised: string[] = [];

            @Orb()
            class Database implements OnOrbInit {
                async onInit() {
                    initialised.push('Database');
                }
            }

            @Orb()
            class Repository implements OnOrbInit {
                constructor(readonly database: Database) { }
                async onInit() {
                    initialised.push('Repository');
                }
            }

            @Orb()
            class Service implements OnOrbInit {
                constructor(readonly repository: Repository) { }
                async onInit() {
                    initialised.push('Service');
                }
            }

            container.registerOrb(Service);
            container.registerOrb(Repository);
            container.registerOrb(Database);
            container.instanciateOrbs();
            await container.initOrbs();

            expect(initialised).toEqual(['Database', 'Repository', 'Service']);
        });

        it('awaits asynchronous initialisation before moving on', async () => {
            const events: string[] = [];

            @Orb()
            class SlowDependency implements OnOrbInit {
                ready = false;
                async onInit() {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    this.ready = true;
                    events.push('dependency ready');
                }
            }

            @Orb()
            class Dependent implements OnOrbInit {
                constructor(readonly slow: SlowDependency) { }
                async onInit() {
                    events.push(`dependent sees ready=${this.slow.ready}`);
                }
            }

            container.registerOrb(SlowDependency);
            container.registerOrb(Dependent);
            container.instanciateOrbs();
            await container.initOrbs();

            expect(events).toEqual(['dependency ready', 'dependent sees ready=true']);
        });

        it('aborts startup when onInit throws', async () => {
            @Orb()
            class BrokenOnInit implements OnOrbInit {
                async onInit() {
                    throw new Error('could not connect');
                }
            }

            container.registerOrb(BrokenOnInit);
            container.instanciateOrbs();

            await expect(container.initOrbs()).rejects.toThrow('could not connect');
        });

        it('runs onDestroy in reverse initialisation order', async () => {
            const destroyed: string[] = [];

            @Orb()
            class Pool implements OnOrbDestroy {
                async onDestroy() {
                    destroyed.push('Pool');
                }
            }

            @Orb()
            class Consumer implements OnOrbDestroy {
                constructor(readonly pool: Pool) { }
                async onDestroy() {
                    destroyed.push('Consumer');
                }
            }

            container.registerOrb(Pool);
            container.registerOrb(Consumer);
            container.instanciateOrbs();
            await container.initOrbs();
            await container.destroyOrbs();

            expect(destroyed).toEqual(['Consumer', 'Pool']);
        });

        it('keeps destroying orbs after one of them fails', async () => {
            const destroyed: string[] = [];

            @Orb()
            class Innermost implements OnOrbDestroy {
                async onDestroy() {
                    destroyed.push('Innermost');
                }
            }

            @Orb()
            class Failing implements OnOrbDestroy {
                constructor(readonly innermost: Innermost) { }
                async onDestroy() {
                    throw new Error('teardown blew up');
                }
            }

            container.registerOrb(Innermost);
            container.registerOrb(Failing);
            container.instanciateOrbs();

            await expect(container.destroyOrbs()).resolves.toBeUndefined();
            expect(destroyed).toEqual(['Innermost']);
        });

        it('destroys orbs registered after startup first', async () => {
            const destroyed: string[] = [];

            @Orb()
            class BootTime implements OnOrbDestroy {
                async onDestroy() {
                    destroyed.push('BootTime');
                }
            }

            container.registerOrb(BootTime);
            container.instanciateOrbs();

            container.registerOrb({ onDestroy: () => { destroyed.push('Late'); } }, { name: 'Late' });
            await container.destroyOrbs();

            expect(destroyed).toEqual(['Late', 'BootTime']);
        });

        it('ignores orbs that declare no lifecycle hooks', async () => {
            @Orb()
            class Plain { }

            container.registerOrb(Plain);
            container.instanciateOrbs();

            await expect(container.initOrbs()).resolves.toBeUndefined();
            await expect(container.destroyOrbs()).resolves.toBeUndefined();
        });
    });

    describe('name collisions', () => {
        function orbNamed(name: string) {
            @Orb(name)
            class Collides { }
            return Collides;
        }

        it('refuses two different orbs sharing a name', () => {
            container.registerOrb(orbNamed('Duplicated'), { source: '/app/first.ts' });

            expect(() => container.registerOrb(orbNamed('Duplicated'), { source: '/app/second.ts' }))
                .toThrow(/Two different orbs are registered as 'Duplicated'/);
        });

        it('names both files in the collision message', () => {
            container.registerOrb(orbNamed('Duplicated'), { source: '/app/first.ts' });

            expect(() => container.registerOrb(orbNamed('Duplicated'), { source: '/app/second.ts' }))
                .toThrow(/first\.ts and \/app\/second\.ts/);
        });

        it('accepts the same class registered twice', () => {
            const Reexported = orbNamed('Reexported');

            container.registerOrb(Reexported);
            expect(() => container.registerOrb(Reexported)).not.toThrow();
        });

        it('lets a config replace another config of the same name', () => {
            @Config('SharedConfig')
            class DefaultConfig {
                readonly origin = 'default';
            }

            @Config('SharedConfig')
            class ProjectConfig {
                readonly origin = 'project';
            }

            container.registerOrb(DefaultConfig);
            container.registerOrb(ProjectConfig);
            container.instanciateOrbs();

            expect(container.get<ProjectConfig>('SharedConfig')!.origin).toBe('project');
        });

        it('refuses a scanned orb that claims a reserved name', () => {
            @Orb('ZenithConfig')
            class RogueConfig { }

            expect(() => container.registerModules([{
                name: 'rogue',
                path: '/app/rogue.ts',
                module: { default: undefined, RogueConfig },
            }])).toThrow(/reserved/);
        });
    });

    describe('registerModules', () => {
        it('registers only the exports marked as orbs', () => {
            @Orb()
            class ExportedOrb { }

            class ExportedButNotAnOrb { }

            container.registerModules([{
                name: 'fake-module',
                path: '/fake/module.ts',
                module: {
                    default: undefined,
                    ExportedOrb,
                    ExportedButNotAnOrb,
                    aConstant: 'not a function',
                },
            }]);
            container.instanciateOrbs();

            expect(container.get(ExportedOrb)).toBeInstanceOf(ExportedOrb);
            expect(container.get('ExportedButNotAnOrb')).toBeUndefined();
        });
    });
});
