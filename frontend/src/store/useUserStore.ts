import { create } from "zustand";

interface UserState {
  gtkBalance: bigint;
  ticketBalance: bigint;
  updateGtkBalance: (balance: bigint) => void;
  updateTicketBalance: (tickets: bigint) => void;
}

export const useUserStore = create<UserState>((set) => ({
  gtkBalance: 0n,
  ticketBalance: 0n,
  updateGtkBalance: (balance) => set({ gtkBalance: balance }),
  updateTicketBalance: (tickets) => set({ ticketBalance: tickets }),
}));

