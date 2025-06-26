import { InjectOrb, Orb } from "@zenith-framework/core";
import type { BaseService } from "./base.service";

@Orb('DService')
export class CService implements BaseService {
    constructor(
        @InjectOrb('AService') private readonly aService: BaseService,
    ) {
    }
}