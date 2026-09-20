import { atom } from "recoil";

// NOTE: Avoid top-level await in atoms to keep the build target compatible.
// These atoms use reasonable defaults. Callers should fetch live data from
// the API and update atoms at runtime where needed.

export const handleInstitutionName = atom({
  key: "name",
  default: "",
});

export const handleInstitutionLogo = atom({
  key: "logo",
  default: "",
});

export const sessionYear = atom({
  key: "session",
  default: ["2026"],
});

export const standardList = atom<string[]>({
  key: "standard",
  default: [],
});

export const installmentArr = atom<string[]>({
  key: "installments",
  default: ['1st', '2nd', '3rd', '4th', '5th'],
});

