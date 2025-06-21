import { Catch, ExceptionHandler, HttpException, UnauthorizedException } from "@zenith-framework/web";
import { BadCredentialsError } from "../../domain/errors/bad-credentials.error";

@ExceptionHandler
export class AuthExceptionHandler {
    @Catch(BadCredentialsError)
    handle(error: BadCredentialsError): HttpException {
        return new UnauthorizedException(error.message);
    }
}