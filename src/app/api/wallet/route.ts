import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";
import { createPublicClient, http, formatUnits, parseAbi } from "viem";
import { base } from "viem/chains";

export const dynamic = "force-dynamic";

const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

const DEFAULT_WALLET = "0x1825d52de63AeeDd3E3E582f192f3Cbe9914BD44";
const DEFAULT_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const WALLET_ADDRESS = ((process.env.BASE_AGENT_WALLET_ADDRESS || DEFAULT_WALLET).trim()) as `0x${string}`;
const USDC_CONTRACT = ((process.env.BASE_USDC_CONTRACT || DEFAULT_USDC).trim()) as `0x${string}`;
const COLD_WALLET = (process.env.BASE_COLD_WALLET_RECIPIENT || "").trim();

const client = createPublicClient({
  chain: base,
  transport: http(BASE_RPC_URL),
});

/**
 * GET /api/wallet
 * Returns real-time on-chain balance (ETH + USDC) on Base, wallet address, configuration, and recent ledger txs.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  if (!WALLET_ADDRESS) {
    return NextResponse.json({
      error: "Wallet address not configured in environment (BASE_AGENT_WALLET_ADDRESS).",
    }, { status: 500 });
  }

  try {
    const [ethBalanceRaw, usdcBalanceRaw, txsRes] = await Promise.all([
      client.getBalance({ address: WALLET_ADDRESS }),
      client.readContract({
        address: USDC_CONTRACT,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [WALLET_ADDRESS],
      }).catch(() => BigInt(0)),
      query(`
        SELECT id, chain_id, tx_hash, direction, token_symbol, token_address,
               from_address, to_address, amount_formatted, fee_eth, status, memo, created_at
        FROM agent_wallet_transactions
        ORDER BY created_at DESC
        LIMIT 20
      `),
    ]);

    const ethBalance = formatUnits(ethBalanceRaw, 18);
    const usdcBalance = formatUnits(usdcBalanceRaw, 6);

    return NextResponse.json({
      network: "Base Mainnet (EVM)",
      chainId: 8453,
      walletAddress: WALLET_ADDRESS,
      coldWalletRecipient: COLD_WALLET || null,
      balances: {
        eth: {
          raw: ethBalanceRaw.toString(),
          formatted: ethBalance,
          symbol: "ETH",
        },
        usdc: {
          raw: usdcBalanceRaw.toString(),
          formatted: usdcBalance,
          symbol: "USDC",
          contract: USDC_CONTRACT,
        },
      },
      transactions: txsRes.rows,
      explorerUrl: `https://basescan.org/address/${WALLET_ADDRESS}`,
    });
  } catch (error: any) {
    console.error("Wallet fetch error:", error);
    return NextResponse.json({
      error: "Failed to fetch on-chain wallet data",
      message: error?.message || String(error),
      walletAddress: WALLET_ADDRESS,
    }, { status: 500 });
  }
}
