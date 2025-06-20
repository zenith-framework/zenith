import { Catch, ExceptionHandler } from "@zenith/web";
import { BadCredentialsError } from "../../domain/errors/bad-credentials.error";
import { Orb } from "@zenith/core";

@ExceptionHandler
export class AuthExceptionHandler {
    @Catch(BadCredentialsError)
    handle(error: BadCredentialsError) {
        return { error: error.message };
    }
}