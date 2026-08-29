/** Dev-console breadcrumb for swallowed AsyncStorage read/write failures. */
export function logStorageError(context: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[storage:${context}]`, error);
  }
}
