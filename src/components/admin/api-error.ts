export const UI_MAINTENANCE_LOCKED = "UI_MAINTENANCE_LOCKED" as const;

type AdminApiErrorPayload = {
  code?: string;
  error?: string;
  ok?: boolean;
};

type AdminLocale = "th" | "en";

export function getUiMaintenanceLockedMessage(locale: AdminLocale) {
  return locale === "th"
    ? "หน้านี้ปิดปรับปรุงชั่วคราว จึงยังไม่สามารถแก้ไขข้อมูลได้"
    : "This page is temporarily under maintenance, so data updates are locked.";
}

export function getUiMaintenanceLockedMessageDual() {
  return "หน้านี้ปิดปรับปรุงชั่วคราว จึงยังไม่สามารถแก้ไขข้อมูลได้ / This page is temporarily under maintenance, so data updates are locked.";
}

export function parseAdminApiError(
  payload: AdminApiErrorPayload | null | undefined,
  fallbackMessage: string,
  locale?: AdminLocale,
) {
  if (payload?.code === UI_MAINTENANCE_LOCKED) {
    const maintenanceMessage = locale
      ? getUiMaintenanceLockedMessage(locale)
      : getUiMaintenanceLockedMessageDual();
    return {
      code: UI_MAINTENANCE_LOCKED,
      message: payload.error?.trim() || maintenanceMessage,
      isMaintenanceLocked: true,
    };
  }

  return {
    code: payload?.code ?? null,
    message: payload?.error?.trim() || fallbackMessage,
    isMaintenanceLocked: false,
  };
}

export function assertApiSuccess(input: {
  response: Response;
  payload?: AdminApiErrorPayload | null;
  fallbackMessage: string;
  locale?: AdminLocale;
  requireOkField?: boolean;
}) {
  const payload = input.payload ?? null;
  const failedByStatus = !input.response.ok;
  const failedByOkField = input.requireOkField ? payload?.ok !== true : payload?.ok === false;

  if (!failedByStatus && !failedByOkField) {
    return;
  }

  const parsed = parseAdminApiError(payload, input.fallbackMessage, input.locale);
  throw new Error(parsed.message);
}
