import { InjectOrb, Orb } from "@zenith/core";
import type { BaseService } from "./base.service";

@Orb('BService')
export class BService implements BaseService {
    constructor(
        @InjectOrb('CService') private readonly cService: BaseService,
    ) {
    }
}