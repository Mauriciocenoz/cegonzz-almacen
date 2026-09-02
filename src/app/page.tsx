"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      setError("PIN incorrecto");
      return;
    }
    const data = await res.json();
    localStorage.setItem("operador", JSON.stringify(data));
    router.push("/captura");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
      <form
        onSubmit={handleLogin}
        className="bg-white rounded-2xl shadow p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <h1 className="text-xl font-medium text-center">Cegonzz Cold Storage</h1>
        <p className="text-sm text-neutral-500 text-center">Ingresa tu PIN de operador</p>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          className="border rounded-lg px-4 py-3 text-center text-2xl tracking-widest"
          autoFocus
        />
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        <button
          type="submit"
          className="bg-neutral-900 text-white rounded-lg py-3 font-medium"
        >
          Entrar
        </button>
        <p className="text-xs text-neutral-400 text-center">PIN de prueba: 1234</p>
      </form>
    </main>
  );
}
