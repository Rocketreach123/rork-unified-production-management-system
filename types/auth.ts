export enum UserRole {
  ADMIN = "admin",
  OPERATOR_SCREEN_PRINT = "operator_screen_print",
  PACKER_SCREEN_PRINT = "packer_screen_print",
  OPERATOR_EMBROIDERY = "operator_embroidery",
  PACKER_EMBROIDERY = "packer_embroidery",
  OPERATOR_FULFILLMENT = "operator_fulfillment",
  QC_CHECKER = "qc_checker",
  SHIPPING = "shipping",
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export const AllRoles: { label: string; value: UserRole }[] = [
  { label: "ADMIN", value: UserRole.ADMIN },
  { label: "Operator – Screen Print", value: UserRole.OPERATOR_SCREEN_PRINT },
  { label: "Packer – Screen Print", value: UserRole.PACKER_SCREEN_PRINT },
  { label: "Operator – Embroidery", value: UserRole.OPERATOR_EMBROIDERY },
  { label: "Packer – Embroidery", value: UserRole.PACKER_EMBROIDERY },
  { label: "Operator – Fulfillment", value: UserRole.OPERATOR_FULFILLMENT },
  { label: "QC Checker", value: UserRole.QC_CHECKER },
  { label: "Shipping", value: UserRole.SHIPPING },
];