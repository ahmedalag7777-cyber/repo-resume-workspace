export type InferenceProvider = "deterministic" | "browser-model" | "local-ollama" | "free-hosted" | "paid-hosted";

/** No external inference adapter is enabled until consent and a verified free runtime exist. */
export function providerPermission(provider: InferenceProvider) {
  if (provider === "deterministic") return { allowed: true, reason: "حسابات محلية حتمية دون إرسال البيانات إلى نموذج خارجي" };
  if (provider === "paid-hosted") return { allowed: false, reason: "الاستدلال المدفوع محظور ولا يوجد تحويل تلقائي إليه" };
  return { allowed: false, reason: "غير مفعّل: يحتاج موفراً مجانياً متحققاً وموافقة صريحة قبل نقل البيانات" };
}

export function selectFreeRuntime(requested: InferenceProvider = "deterministic") {
  const permission = providerPermission(requested);
  return { provider: "deterministic" as const, requested, fallback: !permission.allowed, reason: permission.reason, networkInference: false, cost: 0 };
}