import {
  Activity, Brain, Mail, Eye, Search, ClipboardList, Share2, Landmark,
  Kanban, Bot, MessagesSquare, WalletCards, type LucideIcon,
} from "lucide-react";

export type NavLink = { href: string; label: string; icon: LucideIcon; index: string };
export type NavGroup = { name: string; links: NavLink[] };

/**
 * Satu sumber untuk sidebar DAN kepala halaman. Nomor urut ikut dicetak di
 * kepala halaman ("Memori / 03"), jadi kalau urutan di sini berubah, judul
 * halaman ikut benar sendiri — tidak ada angka yang ditulis tangan di page.
 */
const raw: { name: string; links: Omit<NavLink, "index">[] }[] = [
  {
    name: "Memori",
    links: [
      { href: "/", label: "Kesehatan", icon: Activity },
      { href: "/ltm", label: "Korpus", icon: Brain },
      { href: "/graph", label: "Graph", icon: Share2 },
      { href: "/observations", label: "Observasi", icon: Eye },
      { href: "/inbox", label: "Inbox", icon: Mail },
      { href: "/search", label: "Cari", icon: Search },
      { href: "/ops", label: "Audit", icon: ClipboardList },
    ],
  },
  {
    name: "Agen",
    links: [
      { href: "/sessions", label: "Sessions", icon: MessagesSquare },
      { href: "/kanban", label: "Kanban", icon: Kanban },
      { href: "/agents", label: "Subagents", icon: Bot },
      { href: "/town", label: "Kota", icon: Landmark },
    ],
  },
  {
    name: "Aset",
    links: [{ href: "/wallet", label: "Agent Wallet", icon: WalletCards }],
  },
];

let n = 0;
export const NAV: NavGroup[] = raw.map((g) => ({
  name: g.name,
  links: g.links.map((l) => ({ ...l, index: String(++n).padStart(2, "0") })),
}));

export const ALL_LINKS = NAV.flatMap((g) => g.links);

export function navMeta(pathname: string) {
  for (const g of NAV) {
    const link = g.links.find((l) => l.href === pathname);
    if (link) return { group: g.name, ...link };
  }
  return null;
}
