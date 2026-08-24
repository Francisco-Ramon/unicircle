/**
 * Universal Safe Error Handler:
 * Guarantees that any Supabase error, DOM error, or JS exception is always converted
 * into a safe, human-readable string and NEVER rendered as a raw object in JSX.
 */

export function getSafeErrorMessage(error: any): string {
  if (!error) {
    return "Something went wrong. Please try again.";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }
  if (typeof error?.message === "string") {
    return error.message;
  }
  if (typeof error?.error_description === "string") {
    return error.error_description;
  }
  if (typeof error?.error === "string") {
    return error.error;
  }
  if (typeof error?.code === "string") {
    return `Authentication error (Code: ${error.code})`;
  }
  try {
    const stringified = JSON.stringify(error);
    if (stringified && stringified !== "{}") {
      return stringified;
    }
  } catch (e) {}

  return "Something went wrong. Please try again.";
}
