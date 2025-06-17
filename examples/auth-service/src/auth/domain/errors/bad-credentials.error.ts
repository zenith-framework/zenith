export class BadCredentialsError extends Error {
  constructor() {
    super(`BAD_CREDENTIALS`);
  }
}
