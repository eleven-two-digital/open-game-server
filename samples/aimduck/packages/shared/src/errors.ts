// SPDX-License-Identifier: Apache-2.0

export class TicketVerificationError extends Error {
  constructor(
    readonly code: "invalid_ticket" | "ticket_expired" | "identity_mismatch" | "room_mismatch",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "TicketVerificationError";
  }
}
