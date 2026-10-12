// SPDX-License-Identifier: Apache-2.0

export {
  createIdentityTokenVerifier as createJwtVerifier,
  IdentityProviderUnavailableError,
  InvalidIdentityTokenError,
  type JwtVerifierOptions,
} from "@aimduck/shared/auth/jwt-verifier";
