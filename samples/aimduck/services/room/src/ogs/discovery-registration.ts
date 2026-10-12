// SPDX-License-Identifier: Apache-2.0

import { request as httpsRequest, type RequestOptions } from "node:https";
import { log } from "@aimduck/shared/logging";

export type RoomRegistrationConfig = {
  discoveryUrl: string;
  roomId: string;
  displayName: string;
  host: string;
  port: number;
  publicHost: string;
  publicPort: number;
  capacity: 8;
  currentPlayers(): number;
  connectedPlayerIds(): string[];
  heartbeatSeconds: number;
  certificate: Buffer;
  privateKey: Buffer;
  ca: Buffer;
};

export async function startRoomRegistration(config: RoomRegistrationConfig): Promise<{
  close(): Promise<void>;
}> {
  const discovery = new URL(config.discoveryUrl);
  if (discovery.protocol !== "https:") {
    throw new TypeError("Room registration requires HTTPS with mutual TLS.");
  }

  await postJson(
    new URL("/v1/discovery/register", discovery),
    {
      room_id: config.roomId,
      display_name: config.displayName,
      host: config.publicHost,
      port: config.publicPort,
      max_players: config.capacity,
      current_players: config.currentPlayers(),
      tags: ["aimduck"],
    },
    config,
  );

  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const scheduleHeartbeat = () => {
    if (stopped) {
      return;
    }
    timer = setTimeout(() => {
      void sendHeartbeat().finally(scheduleHeartbeat);
    }, config.heartbeatSeconds * 1_000);
    timer.unref();
  };

  const sendHeartbeat = async (state: "active" | "drain" = "active") => {
    try {
      await postJson(
        new URL("/v1/discovery/heartbeat", discovery),
        {
          room_id: config.roomId,
          current_players: config.currentPlayers(),
          connected_player_ids: config.connectedPlayerIds(),
          state,
        },
        config,
      );
    } catch (error) {
      log("error", "room_discovery_heartbeat_failed", {
        roomId: config.roomId,
        error: error instanceof Error ? error.name : "UnknownError",
      });
    }
  };

  scheduleHeartbeat();
  return {
    async close() {
      stopped = true;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      await sendHeartbeat("drain");
    },
  };
}

function postJson(
  url: URL,
  value: Record<string, unknown>,
  credentials: Pick<RoomRegistrationConfig, "certificate" | "privateKey" | "ca">,
): Promise<void> {
  const body = Buffer.from(JSON.stringify(value));
  const options: RequestOptions = {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port,
    path: `${url.pathname}${url.search}`,
    method: "POST",
    ca: credentials.ca,
    cert: credentials.certificate,
    key: credentials.privateKey,
    rejectUnauthorized: true,
    headers: {
      "content-type": "application/json",
      "content-length": body.byteLength,
    },
  };

  return new Promise<void>((resolve, reject) => {
    const request = httpsRequest(options, (response) => {
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.byteLength;
        if (size > 16 * 1024) {
          response.destroy(new RangeError("Discovery response exceeded the size limit."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        if (
          response.statusCode === undefined ||
          response.statusCode < 200 ||
          response.statusCode >= 300
        ) {
          reject(new Error(`Discovery returned HTTP ${response.statusCode ?? "unknown"}.`));
          return;
        }
        resolve();
      });
      response.on("error", reject);
    });
    request.on("error", reject);
    request.end(body);
  });
}
