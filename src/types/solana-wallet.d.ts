// Type declarations for Solana Wallet Adapter compatibility with React 18
// This file ensures type compatibility between @solana/wallet-adapter-react and React 18

import '@solana/wallet-adapter-react';
import '@solana/wallet-adapter-react-ui';

declare module '@solana/wallet-adapter-react' {
  import { ReactNode } from 'react';
  import { Connection } from '@solana/web3.js';
  import { WalletAdapter } from '@solana/wallet-adapter-base';
  import { PublicKey } from '@solana/web3.js';

  export interface ConnectionProviderProps {
    children: ReactNode;
    endpoint: string;
  }

  export interface WalletProviderProps {
    children: ReactNode;
    wallets: WalletAdapter[];
    autoConnect?: boolean;
  }

  export interface WalletContextState {
    wallet: WalletAdapter | null;
    wallets: WalletAdapter[];
    publicKey: PublicKey | null;
    connecting: boolean;
    disconnecting: boolean;
    connected: boolean;
    select: (walletName: string) => void;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    sendTransaction: any;
    signTransaction: any;
    signAllTransactions: any;
    signMessage: any;
  }

  export function useWallet(): WalletContextState;
  export const ConnectionProvider: React.ComponentType<ConnectionProviderProps>;
  export const WalletProvider: React.ComponentType<WalletProviderProps>;
}

declare module '@solana/wallet-adapter-react-ui' {
  import { ReactNode } from 'react';

  export interface WalletModalProviderProps {
    children: ReactNode;
  }

  export const WalletModalProvider: React.ComponentType<WalletModalProviderProps>;
  export const WalletMultiButton: React.ComponentType<{ className?: string }>;
  export const WalletDisconnectButton: React.ComponentType<{ className?: string }>;
}
