"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2, ArrowRight } from "lucide-react";
import { CaduceusMark } from "@/components/brand";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await login(username, password);
    if (result) {
      router.push("/");
    } else {
      setError("Nama pengguna atau kata sandi salah");
    }
    setLoading(false);
  };

  const field =
    "w-full rounded-md border border-line bg-surf-1 px-3.5 py-2.5 text-[14px] text-tx-1 outline-none transition-colors focus:border-tx-2";

  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-[1.15fr_1fr]">
      {/* Sisi kiri — sampul. Di HP menyusut jadi kepala di atas form. */}
      <section className="relative flex flex-col justify-between border-b border-line p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-14">
        <div className="kicker flex items-center gap-2">
          <span className="mark mark-ok size-[6px] text-ok" /> Panel baca-saja
        </div>
        <div className="py-10 lg:py-0">
          <CaduceusMark className="size-14 text-brass lg:size-20" />
          <h1 className="display mt-6 text-[64px] text-tx-1 sm:text-[88px] lg:text-[112px]">Caduceus</h1>
          <p className="display mt-3 max-w-md text-[22px] italic text-tx-2 sm:text-[26px]">
            Memori &amp; kendali misi untuk Hermes — milik Fakhri.
          </p>
        </div>
        <p className="kicker hidden lg:block">Vania · db_vania · pgvector</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <p className="kicker">Masuk</p>
          <h2 className="display mt-2 text-[34px] text-tx-1">Selamat datang kembali.</h2>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="u" className="kicker mb-2 block">Nama pengguna</label>
              <input
                id="u"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={field}
                autoComplete="username"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="p" className="kicker mb-2 block">Kata sandi</label>
              <input
                id="p"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={field}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="flex items-center gap-2 text-[13px] text-bad">
                <span className="mark mark-bad size-2" /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-between rounded-md bg-tx-1 px-4 py-3 text-[14px] font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <span>Masuk</span>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          </form>

          <p className="mt-8 border-t border-line pt-4 text-[12px] text-tx-3">
            Satu pengguna. Sesi berlaku 7 hari.
          </p>
        </div>
      </section>
    </div>
  );
}
