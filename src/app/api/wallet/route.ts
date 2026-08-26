import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";
import { createPublicClient, http, formatUnits, parseAbi } from "viem";
import { polygon, arbitrum, base } from "viem/chains";

export const dynamic = "force-dynamic";

const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

const DEFAULT_WALLET = "0x1825d52de63AeeDd3E3E582f192f3Cbe9914BD44";
const WALLET_ADDRESS = ((process.env.BASE_AGENT_WALLET_ADDRESS || DEFAULT_WALLET).trim()) as `0x${string}`;
const COLD_WALLET = (process.env.BASE_COLD_WALLET_RECIPIENT || "").trim();

// Polygon Native Client
const polygonClient = createPublicClient({
  chain: polygon,
  transport: http(process.env.POLYGON_RPC_URL || "https://polygon-rpc.com"),
});
const POLYGON_USDC = "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359" as `0x${string}`;

// Arbitrum One Client
const arbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: http(process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc"),
});
const ARBITRUM_USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831" as `0x${string}`;

/**
 * GET /api/wallet
 * Returns real-time on-chain balance on Polygon & Arbitrum, wallet address, configuration, and recent ledger txs.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const [polMaticRaw, polUsdcRaw, arbEthRaw, arbUsdcRaw, txsRes] = await Promise.all([
      polygonClient.getBalance({ address: WALLET_ADDRESS }).catch(() => BigInt(0)),
      polygonClient.readContract({
        address: POLYGON_USDC,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [WALLET_ADDRESS],
      }).catch(() => BigInt(0)),
      arbitrumClient.getBalance({ address: WALLET_ADDRESS }).catch(() => BigInt(0)),
      arbitrumClient.readContract({
        address: ARBITRUM_USDC,
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

    return NextResponse.json({
      networks: [
        {
          name: "Polygon PoS",
          chainId: 137,
          gasToken: { symbol: "POL/MATIC", formatted: formatUnits(polMaticRaw, 18) },
          usdc: { symbol: "USDC", formatted: formatUnits(polUsdcRaw, 6), contract: POLYGON_USDC },
          explorerUrl: `https://polygonscan.com/address/${WALLET_ADDRESS}`,
        },
        {
          name: "Arbitrum One",
          chainId: 42161,
          gasToken: { symbol: "ETH", formatted: formatUnits(arbEthRaw, 18) },
          usdc: { symbol: "USDC", formatted: formatUnits(arbUsdcRaw, 6), contract: ARBITRUM_USDC },
          explorerUrl: `https://arbiscan.io/address/${WALLET_ADDRESS}`,
        }
      ],
      walletAddress: WALLET_ADDRESS,
      coldWalletRecipient: COLD_WALLET || null,
      transactions: txsRes.rows,
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
