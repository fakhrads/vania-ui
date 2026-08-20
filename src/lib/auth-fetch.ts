/**
 * Fetch wrapper yang auto-attach JWT token dari localStorage.
 */
export async function authFetch(url: string, options?: RequestInit) {
  const token = typeof window !== "undefined" ? localStorage.getItem("vn_token") : null;
  const headers = new Headers(options?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("vn_token");
    window.location.href = "/login";
  }
  return res;
}
