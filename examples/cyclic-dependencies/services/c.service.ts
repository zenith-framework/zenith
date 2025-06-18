import { InjectOrb, Orb } from "@zenith/core";
import type { BaseService } from "./base.service";

@Orb('CService')
export class CService implements BaseService {
    constructor(
        @InjectOrb('AService') private readonly aService: BaseService,
    ) {
    }
}