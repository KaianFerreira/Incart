export const CATEGORY_VALUES = [
  "LATICINIOS",
  "BEBIDAS",
  "HORTIFRUTI",
  "CARNES",
  "PADARIA",
  "HIGIENE",
  "LIMPEZA",
  "CONGELADOS",
  "MERCEARIA",
  "OUTROS",
] as const

export type Category = (typeof CATEGORY_VALUES)[number]
