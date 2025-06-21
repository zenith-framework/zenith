export class HttpException {
    constructor(
        public readonly status: number,
        public readonly message: string,
        public readonly details?: string
    ) {
    }
}

export class BadRequestException extends HttpException {
    constructor(details?: string) {
        super(400, `Bad request`, details);
    }
}

export class UnauthorizedException extends HttpException {

    constructor(details?: string) {
        super(401, `Unauthorized`, details);
    }
}

export class ForbiddenException extends HttpException {

    constructor(details?: string) {
        super(403, `Forbidden`, details);
    }
}

export class NotFoundException extends HttpException {
    constructor(details?: string) {
        super(404, `Not found`, details);
    }
}

export class MethodNotAllowedException extends HttpException {

    constructor(details?: string) {
        super(405, `Method not allowed`, details);
    }
}

export class NotAcceptableException extends HttpException {

    constructor(details?: string) {
        super(406, `Not acceptable`, details);
    }
}

export class RequestTimeoutException extends HttpException {

    constructor(details?: string) {
        super(408, `Request timeout`, details);
    }
}

export class ConflictException extends HttpException {

    constructor(details?: string) {
        super(409, `Conflict`, details);
    }
}

export class UnsupportedMediaTypeException extends HttpException {

    constructor(details?: string) {
        super(415, `Unsupported media type`, details);
    }
}


export class InternalServerErrorException extends HttpException {
    constructor(message: string) {
        super(500, message);
    }
}