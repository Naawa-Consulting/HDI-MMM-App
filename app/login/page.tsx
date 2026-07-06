"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(`Error: ${error.message}`);
        setLoading(false);
        return;
      }

      // Hard redirect ensures session cookie is sent on the next server request
      window.location.href = "/dashboard";
    } catch (err) {
      setError(`No se pudo conectar con el servidor. Verifica tu conexion.`);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top green bar */}
      <div className="h-1.5 bg-[#006729]" />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.hdi.com.mx/wp-content/uploads/2021/12/2009-hdi-seguros-001.png"
              alt="HDI Seguros"
              className="h-14 w-auto object-contain mx-auto mb-4"
            />
            <p className="text-gray-500 text-sm">Marketing Mix Model</p>
          </div>

          {/* Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-7 shadow-sm">
            <h1 className="text-gray-900 text-lg font-semibold mb-6">
              Iniciar sesión
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5
                             text-gray-900 placeholder-gray-400 text-sm bg-white
                             focus:outline-none focus:border-[#006729] focus:ring-2
                             focus:ring-[#006729]/15 transition-colors"
                  placeholder="nombre@empresa.com"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5
                             text-gray-900 placeholder-gray-400 text-sm bg-white
                             focus:outline-none focus:border-[#006729] focus:ring-2
                             focus:ring-[#006729]/15 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-[#E60018] text-sm bg-red-50 border border-red-200
                               rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#006729] hover:bg-[#005522] disabled:opacity-50
                           text-white font-medium py-2.5 rounded-lg text-sm
                           transition-colors focus:outline-none focus:ring-2
                           focus:ring-[#006729]/40 mt-2"
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
          </div>

          <p className="text-gray-400 text-xs text-center mt-5">
            Para obtener acceso contacta al administrador del sistema.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">
          Powered by Herrero, 2025-2026
        </p>
      </footer>
    </div>
  );
}
