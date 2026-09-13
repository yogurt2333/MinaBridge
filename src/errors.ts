export class MigrationError extends Error {
  constructor(message: string, readonly exitCode = 1) {
    super(message);
  }
}
