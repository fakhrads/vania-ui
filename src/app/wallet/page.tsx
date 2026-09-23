"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel, Pill, StatusDot, useLive } from "@/components/monitor";
import { cn } from "@/lib/utils";
import { RefreshCw, Copy, Check, ExternalLink, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";

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

        <main className="min-w-0 flex-1 px-5 pb-28 pt-7 sm:px-8 lg:px-12 lg:pb-12 lg:pt-10">
          <PageHeader
            title="Agent wallet"
            actions={
              <button
                onClick={refresh}
                className="flex items-center gap-2 rounded-md border border-line bg-surf-1 px-3 py-1.5 text-[12.5px] text-tx-1 transition-colors hover:border-tx-3"
              >
                <RefreshCw className="size-3.5 text-tx-3" /> Segarkan on-chain
              </button>
            }
          >
            EVM multi-chain (Polygon PoS &amp; Arbitrum One) · hot wallet &amp; micropayment.
          </PageHeader>

          {err && (
            <div className="mb-6 flex items-center gap-2 rounded-md border border-bad/40 bg-bad-tint px-3.5 py-2.5 text-[13px] text-bad">
              <StatusDot tone="bad" size={8} /> Gagal memuat data on-chain: {err}
            </div>
          )}

          {/* Alamat — dicetak besar, karena itu identitas dompetnya. */}
          <Panel className="mb-6 overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-4 p-6">
              <div className="min-w-0 space-y-2">
                <p className="kicker flex items-center gap-2">
                  <StatusDot tone="ok" live size={7} /> Terhubung · Polygon PoS &amp; Arbitrum One
                </p>
                <div className="flex items-center gap-2">
                  <span className="num break-all text-[17px] font-medium text-tx-1 sm:text-[22px]">
                    {data?.walletAddress || "Memuat alamat…"}
                  </span>
                  {data?.walletAddress && (
                    <button
                      onClick={() => copyAddress(data.walletAddress)}
                      title="Salin alamat"
                      aria-label="Salin alamat"
                      className="shrink-0 rounded-md p-1.5 text-tx-3 transition-colors hover:bg-sunken hover:text-tx-1"
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
                    className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[12.5px] text-tx-1 transition-colors hover:border-tx-3"
                  >
                    {net.name} <ExternalLink className="size-3.5 text-tx-3" />
                  </a>
                ))}
              </div>
            </div>
            <dl className="grid grid-cols-1 border-t border-line-soft sm:grid-cols-2 sm:divide-x sm:divide-line-soft">
              <div className="px-6 py-4">
                <dt className="kicker">Mode hot wallet</dt>
                <dd className="mt-1 text-[13px] text-tx-1">Signer otonom agent &amp; subagent</dd>
              </div>
              <div className="border-t border-line-soft px-6 py-4 sm:border-t-0">
                <dt className="kicker">Auto-sweep cold wallet</dt>
                <dd className="num mt-1 truncate text-[13px] text-tx-1">
                  {data?.coldWalletRecipient ? data.coldWalletRecipient : "Belum diisi (stand-by)"}
                </dd>
              </div>
            </dl>
          </Panel>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {data?.networks ? (
              data.networks.map((net) => (
                <Panel key={net.chainId} className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line px-5 py-3">
                    <span className="text-[13.5px] font-semibold text-tx-1">{net.name}</span>
                    <Pill tone="ok">aktif · L2</Pill>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-line-soft">
                    <div className="px-5 py-4">
                      <p className="kicker">USDC</p>
                      <p className="num mt-2 text-[30px] font-medium leading-none text-tx-1">
                        {Number(net.usdc.formatted).toFixed(2)}
                      </p>
                      <p className="mt-1.5 text-[11.5px] text-tx-3">token settlement</p>
                    </div>
                    <div className="px-5 py-4">
                      <p className="kicker">Cadangan gas</p>
                      <p className="num mt-2 text-[30px] font-medium leading-none text-tx-1">
                        {Number(net.gasToken.formatted).toFixed(4)}
                      </p>
                      <p className="num mt-1.5 text-[11.5px] text-tx-3">{net.gasToken.symbol}</p>
                    </div>
                  </div>
                </Panel>
              ))
            ) : (
              [1, 2].map((i) => <Panel key={i} className="h-40 animate-pulse opacity-50" />)
            )}
          </div>

          <Panel className="overflow-hidden">
            <div className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-3">
              <h2 className="text-[13.5px] font-semibold text-tx-1">Buku besar transaksi</h2>
              <span className="kicker">transfer · sweep · pemasukan</span>
            </div>

            {data?.transactions && data.transactions.length > 0 ? (
              <div className="divide-y divide-line-soft">
                {data.transactions.map((tx) => {
                  const masuk = tx.direction === "inbound";
                  return (
                    <div key={tx.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[13px]">
                      <div className="flex items-center gap-3">
                        {masuk ? (
                          <ArrowDownLeft className="size-4 text-ok" />
                        ) : (
                          <ArrowUpRight className="size-4 text-tx-2" />
                        )}
                        <div>
                          <p className="text-tx-1">{masuk ? "Masuk" : "Keluar"} · {tx.token_symbol}</p>
                          <p className="text-[11.5px] text-tx-3">{tx.memo || "Mikrotransaksi otonom"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("num font-medium", masuk ? "text-ok" : "text-tx-1")}>
                          {masuk ? "+" : "−"}{tx.amount_formatted} {tx.token_symbol}
                        </p>
                        <p className="num text-[11px] text-tx-3">{new Date(tx.created_at).toLocaleString("id-ID")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-[13px] text-tx-3">
                Belum ada transaksi on-chain yang tercatat.
              </div>
            )}
          </Panel>
        </main>
      </div>
    </Guard>
  );
}
