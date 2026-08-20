"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      setError("Username atau password salah");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
        <CardContent className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20 mb-3">
              <Brain className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-xl font-bold">Vania Memory</h1>
            <p className="text-sm text-zinc-500 mt-1">Login untuk akses memori</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
                autoFocus
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
