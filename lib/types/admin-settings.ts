export type SessionPolicy = "7d" | "30d" | "never";
export type DefaultLanguage = "th" | "en";
export type UiMode = "auto" | "windows" | "mobile";

export type AdminSettings = {
  displayName: string;
  email: string;
  language: DefaultLanguage;
  storeName: string;
  supportPhone: string;
  currency: string;
  twoFa: boolean;
  sessionPolicy: SessionPolicy;
  emailNotify: boolean;
  pushNotify: boolean;
  orderNotify: boolean;
  uiMode: UiMode;
};

export function getDefaultAdminSettings(): AdminSettings {
  return {
    displayName: "Kittisap Admin",
    email: "admin@kittisap.com",
    language: "th",
    storeName: "Kittisap Store",
    supportPhone: "+66 80-000-0000",
    currency: "THB",
    twoFa: true,
    sessionPolicy: "7d",
    emailNotify: true,
    pushNotify: false,
    orderNotify: true,
    uiMode: "auto",
  };
}

export type AdminSettingField =
  | "displayName"
  | "email"
  | "language"
  | "storeName"
  | "supportPhone"
  | "currency"
  | "twoFa"
  | "sessionPolicy"
  | "emailNotify"
  | "pushNotify"
  | "orderNotify"
  | "uiMode";
