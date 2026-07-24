import { useEffect, useMemo, useState } from "react";

import {
  HttpWorkspaceApiClient,
  WorkspaceApiError,
  type WorkspaceApiClient,
  type WorkspaceSystemStatus,
  type WorkspaceUpdatePage
} from "../api/workspace-client.js";

export type WorkspacePollingPhase =
  | "demo"
  | "loading"
  | "live"
  | "partial"
  | "stale"
  | "error";

export interface WorkspacePollingState {
  readonly cursor?: string;
  readonly error?: string;
  readonly lastSuccessfulPollAt?: number;
  readonly page?: WorkspaceUpdatePage;
  readonly phase: WorkspacePollingPhase;
  readonly source: "api" | "fixture";
}

export interface WorkspacePollingOptions {
  readonly apiBaseUrl: string;
  readonly client?: WorkspaceApiClient;
  readonly enabled: boolean;
  readonly initialSystemStatus?: WorkspaceSystemStatus;
  readonly jitterRatio?: number;
  readonly maximumBackoffMilliseconds?: number;
  readonly pollingIntervalMilliseconds?: number;
  readonly projectId: string;
  readonly random?: () => number;
  readonly workspaceId: string;
}

const DEFAULT_POLL_INTERVAL = 5_000;
const DEFAULT_MAXIMUM_BACKOFF = 30_000;
const DEFAULT_JITTER_RATIO = 0.2;

export function useWorkspacePolling(options: WorkspacePollingOptions): WorkspacePollingState {
  const client = useMemo(
    () => options.client ?? new HttpWorkspaceApiClient(options.apiBaseUrl),
    [options.apiBaseUrl, options.client]
  );
  const fixturePage = useMemo<WorkspaceUpdatePage | undefined>(
    () =>
      options.initialSystemStatus === undefined
        ? undefined
        : {
            cursor: "fixture",
            partial: true,
            systemStatus: options.initialSystemStatus,
            updates: []
          },
    [options.initialSystemStatus]
  );
  const [state, setState] = useState<WorkspacePollingState>(() => ({
    ...(fixturePage === undefined ? {} : { page: fixturePage }),
    phase: options.enabled ? "loading" : "demo",
    source: "fixture"
  }));

  useEffect(() => {
    if (!options.enabled) {
      setState({
        ...(fixturePage === undefined ? {} : { page: fixturePage }),
        phase: "demo",
        source: "fixture"
      });
      return;
    }

    const controller = new AbortController();
    let cursor: string | undefined;
    let etag: string | undefined;
    let failures = 0;
    let timer: number | undefined;
    let hasApiData = false;
    const pollingInterval = options.pollingIntervalMilliseconds ?? DEFAULT_POLL_INTERVAL;
    const maximumBackoff =
      options.maximumBackoffMilliseconds ?? DEFAULT_MAXIMUM_BACKOFF;
    const jitterRatio = options.jitterRatio ?? DEFAULT_JITTER_RATIO;
    const random = options.random ?? Math.random;

    const schedule = (delay: number): void => {
      timer = window.setTimeout(() => {
        void poll();
      }, delay);
    };

    const poll = async (): Promise<void> => {
      try {
        const result = await client.poll({
          ...(cursor === undefined ? {} : { cursor }),
          ...(etag === undefined ? {} : { etag }),
          projectId: options.projectId,
          signal: controller.signal,
          workspaceId: options.workspaceId
        });
        if (controller.signal.aborted) {
          return;
        }
        failures = 0;
        if (result.etag !== undefined) {
          etag = result.etag;
        }
        if (result.kind === "updated") {
          cursor = result.page.cursor;
          hasApiData = true;
          setState({
            cursor,
            lastSuccessfulPollAt: Date.now(),
            page: result.page,
            phase: result.page.partial ? "partial" : "live",
            source: "api"
          });
        } else if (hasApiData) {
          setState((current) => ({
            ...current,
            lastSuccessfulPollAt: Date.now(),
            phase: current.page?.partial === true ? "partial" : "live"
          }));
        }
        schedule(pollingInterval);
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof WorkspaceApiError && error.code === "aborted")
        ) {
          return;
        }
        failures += 1;
        const retryable = !(error instanceof WorkspaceApiError) || error.retryable;
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Workspace polling failed.",
          phase: hasApiData ? "stale" : "error"
        }));
        schedule(
          retryable
            ? computeBackoffDelay(
                failures - 1,
                pollingInterval,
                maximumBackoff,
                jitterRatio,
                random()
              )
            : maximumBackoff
        );
      }
    };

    void poll();
    return () => {
      controller.abort();
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [
    client,
    fixturePage,
    options.enabled,
    options.jitterRatio,
    options.maximumBackoffMilliseconds,
    options.pollingIntervalMilliseconds,
    options.projectId,
    options.random,
    options.workspaceId
  ]);

  return state;
}

export function computeBackoffDelay(
  failureIndex: number,
  baseMilliseconds: number,
  maximumMilliseconds: number,
  jitterRatio: number,
  randomValue: number
): number {
  const safeBase = Math.max(1, baseMilliseconds);
  const safeMaximum = Math.max(safeBase, maximumMilliseconds);
  const exponent = Math.max(0, Math.min(16, Math.floor(failureIndex)));
  const exponential = Math.min(safeMaximum, safeBase * 2 ** exponent);
  const safeJitter = Math.max(0, Math.min(1, jitterRatio));
  const normalizedRandom = Math.max(0, Math.min(1, randomValue));
  const multiplier = 1 - safeJitter + 2 * safeJitter * normalizedRandom;
  return Math.max(1, Math.min(safeMaximum, Math.round(exponential * multiplier)));
}
