"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel, Pill, StatusDot, useLive } from "@/components/monitor";
import { cn } from "@/lib/utils";
import {
  WalletCards, ExternalLink, Copy, Check, ArrowDownLeft, ArrowUpRight,
  ShieldCheck, RefreshCw, Layers, Coins, Landmark
} from "lucide-react";

type NetworkInfo = {
  name: string;
  chainId: number;
  gasToken: { symbol: string; formatted: string };
  usdc: { symbol: string; formatted: string; contract: string };
  explorerUrl: string;
};

type WalletData = {
  networks: NetworkInfo[];
  walletAddress: string;
  coldWalletRecipient: string | null;
  transactions: {
    id: number;
    tx_hash: string;
    direction: string;
    token_symbol: string;
    from_address: string;
    to_address: string;
    amount_formatted: string;
    fee_eth: string | null;
    status: string;
    memo: string | null;
    created_at: string;
  }[];
};

export default function WalletPage() {
  const { data, err, at, refresh } = useLive<WalletData>("/api/wallet", 6000);
  const [copied, setCopied] = useState(false);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Guard>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar />

        <main className="flex-1 overflow-y-auto px-6 pb-28 pt-8 lg:px-10 lg:pb-8">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[25px] font-semibold tracking-[-0.025em] text-tx-1">
                Autonomous Agent Wallet
              </h1>
              <p className="mt-1 text-sm text-tx-3">
                Multi-Chain EVM (Polygon PoS &amp; Arbitrum One) · Hot Wallet &amp; Micropayments
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refresh}
                className="panel flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium text-tx-2 hover:text-tx-1 transition-all"
              >
                <RefreshCw className="size-3.5" />
                Refresh On-Chain
              </button>
            </div>
          </header>

          {err && (
            <Panel className="mb-6 border border-bad/30 bg-bad-tint/30 p-4 text-sm text-bad">
              Gagal memuat on-chain data: {err}
            </Panel>
          )}

          {/* Wallet Address & Network Header */}
          <Panel level={2} className="mb-6 overflow-hidden p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-tx-3">
                  <span className="flex size-2 rounded-full bg-ok animate-pulse" />
                  <span>Jaringan Terhubung: <strong className="text-tx-1">Polygon PoS &amp; Arbitrum One</strong></span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="font-mono text-base font-semibold text-tx-1 sm:text-lg">
                    {data?.walletAddress || "Memuat address…"}
                  </span>
                  {data?.walletAddress && (
                    <button
                      onClick={() => copyAddress(data.walletAddress)}
                      title="Salin Address"
                      className="rounded-lg p-1.5 text-tx-3 transition-colors hover:bg-sunken hover:text-tx-1"
                    >
                      {copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {data?.networks?.map((net) => (
                  <a
                    key={net.chainId}
                    href={net.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="raised flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium text-tx-1 transition-colors hover:bg-sunken"
                  >
                    {net.name} <ExternalLink className="size-3.5" />
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border/40 pt-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent-tint text-accent">
                  <ShieldCheck className="size-5" />
                </div>
                <div className="text-xs">
                  <span className="text-tx-3">Mode Hot Wallet:</span>
                  <p className="font-medium text-tx-1">Signer Otonom Agent &amp; Subagent</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-ok-tint text-ok">
                  <Landmark className="size-5" />
                </div>
                <div className="text-xs">
                  <span className="text-tx-3">Cold Wallet Auto-Sweep:</span>
                  <p className="font-medium text-tx-1 truncate max-w-[220px]">
                    {data?.coldWalletRecipient ? data.coldWalletRecipient : "Belum diisi (Stand-by)"}
                  </p>
                </div>
              </div>
            </div>
          </Panel>

          {/* Multi-Chain Balance Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {data?.networks ? (
              data.networks.map((net) => (
                <Panel key={net.chainId} className="p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex size-2 rounded-full bg-accent" />
                      <strong className="text-sm font-semibold text-tx-1">{net.name}</strong>
                    </div>
                    <Pill tone="ok">Active L2</Pill>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="well rounded-xl p-3.5">
                      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-tx-3 font-medium">
                        <Coins className="size-3.5 text-emerald-400" /> USDC Balance
                      </div>
                      <div className="mt-2 font-mono text-2xl font-semibold text-tx-1">
                        {Number(net.usdc.formatted).toFixed(2)}
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">Settlement Token</span>
                    </div>

                    <div className="well rounded-xl p-3.5">
                      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-tx-3 font-medium">
                        <Layers className="size-3.5 text-sky-400" /> Gas Reserve
                      </div>
                      <div className="mt-2 font-mono text-2xl font-semibold text-tx-1">
                        {Number(net.gasToken.formatted).toFixed(4)}
                      </div>
                      <span className="text-[10px] text-sky-400 font-mono">{net.gasToken.symbol}</span>
                    </div>
                  </div>
                </Panel>
              ))
            ) : (
              [1, 2].map((i) => (
                <Panel key={i} className="h-44 animate-pulse p-6 opacity-40" />
              ))
            )}
          </div>

          {/* Transactions / Ledger Table */}
          <Panel className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-tx-1">Ledger Transaksi Otonom</h2>
                <p className="text-xs text-tx-3">Riwayat transfer, sweep profit, dan pemasukan subagent</p>
              </div>
            </div>

            {data?.transactions && data.transactions.length > 0 ? (
              <div className="divide-y divide-border/40">
                {data.transactions.map((tx) => (
                  <div key={tx.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex size-8 items-center justify-center rounded-lg",
                        tx.direction === "inbound" ? "bg-ok-tint text-ok" : "bg-accent-tint text-accent"
                      )}>
                        {tx.direction === "inbound" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                      </div>
                      <div>
                        <div className="font-medium text-tx-1 capitalize">{tx.direction} ({tx.token_symbol})</div>
                        <div className="text-[11px] text-tx-3">{tx.memo || "Autonomous Microtransaction"}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={cn("font-mono font-medium", tx.direction === "inbound" ? "text-ok" : "text-tx-1")}>
                        {tx.direction === "inbound" ? "+" : "-"}{tx.amount_formatted} {tx.token_symbol}
                      </div>
                      <div className="text-[10.5px] text-tx-3">
                        {new Date(tx.created_at).toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="well flex h-32 flex-col items-center justify-center rounded-xl text-center text-xs text-tx-3">
                <WalletCards className="size-6 text-tx-3/50 mb-1" />
                <span>Belum ada transaksi on-chain yang tercatat.</span>
                <span className="text-[10px] text-tx-3/70 mt-0.5">Semua pemasukan otomatis tercatat di ledger ini.</span>
              </div>
            )}
          </Panel>
        </main>
      </div>
    </Guard>
  );
}
