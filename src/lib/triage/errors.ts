export type TriageErrorCode =
  | "unauthorized"
  | "not_found"
  | "invalid_state"
  | "forbidden";

export class TriageError extends Error {
  readonly code: TriageErrorCode;

  constructor(code: TriageErrorCode, message: string) {
    super(message);
    this.name = "TriageError";
    this.code = code;
  }
}

export function httpStatusForTriageError(code: TriageErrorCode): number {
  switch (code) {
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "invalid_state":
      return 409;
  }
}
