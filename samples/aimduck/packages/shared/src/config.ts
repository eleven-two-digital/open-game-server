// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

const portSchema = z.coerce.number().int().min(1).max(65_535);
const localCertificatePath = z.string().min(1);

export const discoveryConfigSchema = z.object({
  host: z.string().min(1),
  port: portSchema,
  issuer: z.string().url(),
  audience: z.string().min(1),
  jwksUri: z.string().url(),
  allowedOrigins: z.array(z.string().url()).min(1),
  leaseTtlSeconds: z.number().int().min(5).max(300),
  ticketSecretPath: localCertificatePath,
  tlsCertificatePath: localCertificatePath,
  tlsKeyPath: localCertificatePath,
  mtlsCaPath: localCertificatePath,
});

export const roomConfigSchema = z
  .object({
    roomId: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/),
    host: z.string().min(1),
    port: portSchema,
    publicHost: z.string().min(1),
    publicPort: portSchema,
    discoveryUrl: z.string().url(),
    issuer: z.string().url(),
    jwksUri: z.string().url(),
    audience: z.string().min(1),
    allowedOrigins: z.array(z.string().url()).min(1),
    capacity: z.literal(8),
    heartbeatSeconds: z.number().int().min(1).max(60),
    leaseTtlSeconds: z.number().int().min(5).max(300),
    ticketSecretPath: localCertificatePath,
    tlsCertificatePath: localCertificatePath,
    tlsKeyPath: localCertificatePath,
    mtlsCaPath: localCertificatePath,
    mtlsCertificatePath: localCertificatePath,
    mtlsKeyPath: localCertificatePath,
  })
  .refine(
    ({ heartbeatSeconds, leaseTtlSeconds }) => heartbeatSeconds < leaseTtlSeconds,
    "Room heartbeat interval must be less than the Discovery lease TTL.",
  );

export type DiscoveryConfig = z.infer<typeof discoveryConfigSchema>;
export type RoomConfig = z.infer<typeof roomConfigSchema>;

export function parseDiscoveryConfig(input: unknown): DiscoveryConfig {
  return discoveryConfigSchema.parse(input);
}

export function parseRoomConfig(input: unknown): RoomConfig {
  return roomConfigSchema.parse(input);
}
