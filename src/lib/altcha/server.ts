/**
 * ALTCHA server config: challenge creation and solution verification (altcha-lib).
 */

const isDevelopment = process.env.NODE_ENV === "development";

/** When true, register/sign-in skip verifySolution (dev only). Challenge still needs ALTCHA_HMAC_KEY. */
export const shouldBypassAltchaVerificationInDev = (): boolean =>
  isDevelopment && process.env.ALTCHA_DEV_BYPASS === "1";

export const getAltchaHmacKey = (): string | null =>
  process.env.ALTCHA_HMAC_KEY?.trim() || null;

export const isCredentialAltchaReady = (): boolean => {
  if (getAltchaHmacKey()) return true;
  return shouldBypassAltchaVerificationInDev();
};
