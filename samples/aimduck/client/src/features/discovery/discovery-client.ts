// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import type { DiscoveryListing, RoomResolution } from "@aimduck/shared";

const listingResponseSchema = z.object({
  rooms: z.array(
    z.object({
      masked_token: z.string().min(1),
      display_name: z.string().min(1),
      current_players: z.number().int().min(0).max(8),
      max_players: z.literal(8),
      state: z.enum(["active", "drain"]),
      tags: z.array(z.string()),
    }),
  ),
});

const resolutionResponseSchema = z.object({
  status: z.literal("resolved"),
  room_id: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65_535),
  protocol: z.literal("wss"),
  path: z.literal("/v1/ws"),
  join_ticket: z.string().min(1),
  ttl_seconds: z.number().int().positive(),
});

const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean().optional(),
  }),
});

export class DiscoveryApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "DiscoveryApiError";
  }
}

export class DiscoveryClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "https:") {
      throw new TypeError("Discovery requests must use HTTPS.");
    }
  }

  async listRooms(accessToken: string, signal?: AbortSignal): Promise<DiscoveryListing[]> {
    const response = await this.request(`/v1/rooms?game_mode=aimduck`, accessToken, {
      method: "GET",
      ...(signal === undefined ? {} : { signal }),
    });
    const payload = listingResponseSchema.safeParse(await response.json());
    if (!payload.success) {
      throw new DiscoveryApiError(
        "invalid_response",
        "Discovery returned an invalid room listing.",
        true,
        response.status,
      );
    }
    return payload.data.rooms.map((room) => ({
      maskedToken: room.masked_token,
      displayName: room.display_name,
      currentPlayers: room.current_players,
      maxPlayers: room.max_players,
      state: room.state,
      tags: room.tags,
    }));
  }

  async resolveRoom(accessToken: string, maskedToken: string): Promise<RoomResolution> {
    const response = await this.request("/v1/rooms/resolve", accessToken, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ masked_token: maskedToken }),
    });
    const payload = resolutionResponseSchema.safeParse(await response.json());
    if (!payload.success) {
      throw new DiscoveryApiError(
        "invalid_response",
        "Discovery returned an invalid room resolution.",
        true,
        response.status,
      );
    }
    return {
      roomId: payload.data.room_id,
      host: payload.data.host,
      port: payload.data.port,
      protocol: payload.data.protocol,
      path: payload.data.path,
      joinTicket: payload.data.join_ticket,
      expiresAt: Date.now() + payload.data.ttl_seconds * 1_000,
    };
  }

  private async request(path: string, accessToken: string, init: RequestInit): Promise<Response> {
    if (accessToken.length === 0) {
      throw new DiscoveryApiError("unauthorized", "Sign in before contacting Discovery.", false);
    }
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${accessToken}`);
    try {
      const response = await this.fetcher(new URL(path, this.baseUrl), {
        ...init,
        headers,
      });
      if (response.ok) {
        return response;
      }
      const errorBody: unknown = await response.json();
      const parsed = errorResponseSchema.safeParse(errorBody);
      if (parsed.success) {
        throw new DiscoveryApiError(
          parsed.data.error.code,
          parsed.data.error.message,
          parsed.data.error.retryable ?? response.status >= 500,
          response.status,
        );
      }
      throw new DiscoveryApiError(
        "request_rejected",
        `Discovery rejected the request (HTTP ${response.status}).`,
        response.status >= 500,
        response.status,
      );
    } catch (error) {
      if (error instanceof DiscoveryApiError) {
        throw error;
      }
      if (error instanceof TypeError) {
        throw new DiscoveryApiError(
          "network_unavailable",
          "Cannot reach Discovery. Check that the local services are running and the development CA is trusted.",
          true,
          undefined,
          { cause: error },
        );
      }
      throw error;
    }
  }
}

export const discoveryClient = new DiscoveryClient(
  import.meta.env.VITE_DISCOVERY_URL ?? "https://localhost:8080",
);
