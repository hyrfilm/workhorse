class ReservationFailed extends Error {}
class DuplicateTaskError extends Error {}

class UnreachableError extends Error {
  constructor(nvr: never, message: string) {
    super(`${nvr}: ${message}`);
    this.name = 'UnreachableError';
  }
}

export { ReservationFailed, DuplicateTaskError, UnreachableError };
