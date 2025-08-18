export enum UserRole {
  ADMIN = "admin",
  SCREEN_ROOM = "screen_room",
  SCREEN_PRINT = "screen_print",
  EMBROIDERY = "embroidery",
  FULFILLMENT = "fulfillment",
  QC = "qc",
  SHIPPING = "shipping",
  PREPRODUCTION = "preproduction",
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}