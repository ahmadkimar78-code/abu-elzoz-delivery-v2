// بيتأكد إن كل الـ secrets الأساسية موجودة عند الإقلاع بدل ما يفشل بصمت وقت التوقيع على JWT لاحقًا
const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
] as const;

const INSECURE_DEFAULTS = ["change-me-access-secret", "change-me-refresh-secret"];

export function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. Check your .env file against .env.example`
    );
  }

  if (process.env.NODE_ENV === "production") {
    const usingDefaults = INSECURE_DEFAULTS.filter(
      (val) => process.env.JWT_ACCESS_SECRET === val || process.env.JWT_REFRESH_SECRET === val
    );
    if (usingDefaults.length > 0) {
      throw new Error("Refusing to start in production with default/example JWT secrets.");
    }
  }
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  clientUrl: process.env.CLIENT_URL || "*",
  deliveryBaseFee: Number(process.env.DELIVERY_BASE_FEE) || 15,
  restaurantListCacheTtlSeconds: Number(process.env.RESTAURANT_LIST_CACHE_TTL) || 30,
};
