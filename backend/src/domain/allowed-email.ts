export interface AllowedEmail {
  id: string;
  email: string;
  addedBy: string | null;
  registeredAt: Date | null;
  createdAt: Date;
}
