type WakeApiFn = () => Promise<unknown>;
type ApiFetchFn = (url: string, init: RequestInit) => Promise<Response>;
type TimeoutSignalFactory = (timeoutMs: number) => AbortSignal;

export async function fetchLlmAfterWake(
  url: string,
  init: RequestInit,
  options: {
    wakeApi: WakeApiFn;
    apiFetch: ApiFetchFn;
    timeoutMs: number;
    createTimeoutSignal?: TimeoutSignalFactory;
  }
): Promise<Response> {
  await options.wakeApi();
  const signal =
    init.signal ??
    (options.createTimeoutSignal ?? ((timeoutMs: number) => AbortSignal.timeout(timeoutMs)))(
      options.timeoutMs
    );
  return options.apiFetch(url, { ...init, signal });
}
