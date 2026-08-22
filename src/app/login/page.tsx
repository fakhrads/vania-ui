"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Brain, Loader2 } from "lucide-react";

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="panel w-full max-w-sm rounded-[20px] p-8 shadow-e3">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="raised flex size-12 items-center justify-center rounded-2xl text-accent-solid">
            <Brain className="size-[22px]" />
          </div>
          <h1 className="mt-4 text-[17px] font-semibold tracking-[-0.02em] text-tx-1">
            Fakhri&apos;s Agentic Memory
          </h1>
          <p className="mt-1 text-xs text-tx-3">panel pemantauan baca-saja</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="u" className="mb-1.5 block text-[11px] text-tx-2">Nama pengguna</label>
            <input
              id="u"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="well w-full rounded-xl px-4 py-3 text-[13.5px] text-tx-1 outline-none"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="p" className="mb-1.5 block text-[11px] text-tx-2">Kata sandi</label>
            <input
              id="p"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="well w-full rounded-xl px-4 py-3 text-[13.5px] text-tx-1 outline-none"
            />
          </div>

          {error && <p className="text-sm text-bad">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="raised-2 flex w-full items-center justify-center rounded-xl py-3 text-[13.5px] font-medium text-tx-1 disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Masuk"}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-tx-3">
          Satu pengguna. Sesi berlaku 7 hari.
        </p>
      </div>
    </div>
  );
}
