export type Message = {
  id?: string;
  message: string;
  pubkey: string;
  timestamp?: number;
};

export type User = {
  id: string;
  pubkey: string;
  nsec: string;
};

export type UserData = {
  id: string;
  avatar: string;
  name: string;
};
