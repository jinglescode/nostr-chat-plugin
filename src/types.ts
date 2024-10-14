export type Message = {
  id: string;
  message: string;
  pubkey: string;
  timestamp: number;
};

export type User = {
  pubkey: string;
  nsec: string;
};
