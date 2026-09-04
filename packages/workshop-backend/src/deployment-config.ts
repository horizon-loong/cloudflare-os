// Builds the public ServerConfig the client fetches at boot. Aggregates sign-in (auth/, env-driven),
// AI Gateway billing (ai-gateway-billing/), and the admin-configured branding (admin-config.ts).
// Contains no secrets.

import { AuthVendorInfo, ServerConfig } from "@gadgets/workshop-shared/api";
import { createWorkshopLogger } from "./observability";
import { getAuthGatekeeperAllowlist, isPasswordAuthEnabled } from "./auth/config.js";
import { isCloudflareLimitsEnabled } from "./ai-gateway-billing/config.js";
import { getAuthVendorBinding } from "./auth/auth-vendors.js";
import { readAdminConfig } from "./admin-config.js";
import { siteLogoImage } from "./site-logo.js";

const logger = createWorkshopLogger("workshop.deployment.config");

/**
 * Resolve the auth-capable, allowlisted gatekeeper vendors offered as sign-in methods, querying
 * each gatekeeper's describe() for display info. Skips vendors with no binding, that don't advertise
 * providesAuth, or that error.
 */
export async function getAuthVendors(env: Cloudflare.Env): Promise<AuthVendorInfo[]> {
  // describe() is a cross-Worker RPC and getServerConfig() runs on every (re)connect, so query the
  // allowlisted vendors in parallel rather than serially. Order is preserved (Promise.all), so the
  // sign-in button order still follows the allowlist.
  const results = await Promise.all(getAuthGatekeeperAllowlist(env).map(
      async (vendorId): Promise<AuthVendorInfo | null> => {
    const binding = getAuthVendorBinding(env, vendorId);
    if (!binding) return null;
    try {
      const desc = await binding.describe();
      if (!desc.providesAuth) return null;
      return { vendorId, displayName: desc.displayName, logo: desc.logo, color: desc.color };
    } catch (err) {
      logger.error("failed to describe auth gatekeeper", {
        event: "auth.gatekeeper.describe.failed", vendorId, error: err,
      });
      return null;
    }
  }));
  return results.filter((v): v is AuthVendorInfo => v !== null);
}

export async function getServerConfig(env: Cloudflare.Env): Promise<ServerConfig> {
  console.error("[cfg] start");
  let t0 = Date.now();
  let [config, authVendors] = await Promise.all([
    readAdminConfig(env).then(v => { console.error(`[cfg] readAdminConfig done in ${Date.now() - t0}ms`); return v; }),
    getAuthVendors(env).then(v => { console.error(`[cfg] getAuthVendors done in ${Date.now() - t0}ms`); return v; }),
  ]);
  return {
    authVendors,
    passwordAuthEnabled: isPasswordAuthEnabled(env),
    cloudflareLimitsEnabled: isCloudflareLimitsEnabled(env),
    signupsEnabled: config.signupsEnabled,
    siteName: config.siteName,
    siteLogo: siteLogoImage(config.siteLogoConfigured),
    announcement: config.announcement,
    banner: config.banner.text,
    bannerColor: config.banner.color,
    accentColor: config.accentColor,
  };
}
