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
      const data = await res.json().catch(() => ({}));
      setError(res.status === 401 ? "PIN incorrecto" : data.error || "Error al conectar. Intenta de nuevo.");
      return;
    }
    const data = await res.json();
    localStorage.setItem("operador", JSON.stringify(data));
    if (data.rol === "mesa_control") {
      router.push("/mesa-control");
    } else {
      router.push("/captura");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
      <form
        onSubmit={handleLogin}
        className="bg-white rounded-2xl shadow p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <h1 className="text-xl font-semibold text-center text-neutral-900">Cegonzz Cold Storage</h1>
        <p className="text-sm text-neutral-700 text-center">Ingresa tu PIN de operador</p>
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
        <p className="text-xs text-neutral-600 text-center">
          PIN operador: 1234 · PIN Mesa de Control: 5678
        </p>
      </form>
    </main>
  );
}
