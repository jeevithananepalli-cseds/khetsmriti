"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError, BriefResponse } from "@/types/domain";
import { apiPost } from "@/lib/clientApi";

export type BriefState =
  | { status: "loading" }
  | { status: "error"; error: ApiError }
  | { status: "ready"; data: BriefResponse };

/**
 * Loads the brief for one farmer in one memory mode. Results are cached per mode so flipping the
 * Memory toggle back and forth is instant; `refresh` forces a new generation.
 */
export function useBrief(farmerId: string, memoryEnabled: boolean) {
  const cache = useRef(new Map<string, BriefResponse>());
  const [state, setState] = useState<BriefState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);
  const forceRef = useRef(false);

  useEffect(() => {
    const key = `${farmerId}|${memoryEnabled}`;
    const cached = cache.current.get(key);
    if (cached && !forceRef.current) {
      setState({ status: "ready", data: cached });
      return;
    }
    forceRef.current = false;
    const controller = new AbortController();
    setState({ status: "loading" });
    apiPost<BriefResponse>("/api/brief", { farmerId, memoryEnabled }, controller.signal)
      .then((res) => {
        if (res.ok) {
          cache.current.set(key, res.data);
          setState({ status: "ready", data: res.data });
        } else {
          setState({ status: "error", error: res.error });
        }
      })
      .catch(() => {
        // aborted because the farmer or mode changed; the next effect run takes over
      });
    return () => controller.abort();
  }, [farmerId, memoryEnabled, nonce]);

  const refresh = useCallback(() => {
    forceRef.current = true;
    setNonce((n) => n + 1);
  }, []);

  return { state, refresh };
}
