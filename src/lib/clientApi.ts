import type { ApiResponse } from "@/types/domain";

// Browser-side fetch helpers. Always resolve to an ApiResponse; never throw.

async function toApiResponse<T>(res: Response): Promise<ApiResponse<T>> {
  try {
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return { ok: false, error: { code: "bad_response", message: `Server returned ${res.status}.` } };
  }
}

function networkError<T>(): ApiResponse<T> {
  return { ok: false, error: { code: "network", message: "No connection to the server. Check your network and retry." } };
}

export async function apiGet<T>(url: string, signal?: AbortSignal): Promise<ApiResponse<T>> {
  try {
    return await toApiResponse<T>(await fetch(url, { cache: "no-store", signal }));
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return networkError<T>();
  }
}

export async function apiPost<T>(url: string, body: unknown, signal?: AbortSignal): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    return await toApiResponse<T>(res);
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return networkError<T>();
  }
}

export async function apiPostForm<T>(url: string, form: FormData): Promise<ApiResponse<T>> {
  try {
    return await toApiResponse<T>(await fetch(url, { method: "POST", body: form }));
  } catch {
    return networkError<T>();
  }
}
