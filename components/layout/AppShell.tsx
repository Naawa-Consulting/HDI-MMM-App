"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, static on desktop */}
      <div
        className={`
          fixed inset-y-0 left-0 z-30 transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0 print:hidden
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden print:hidden flex items-center gap-3 h-14 px-4 border-b border-gray-200 bg-white shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.hdi.com.mx/wp-content/uploads/2021/12/2009-hdi-seguros-001.png"
            alt="HDI Seguros"
            className="h-7 w-auto object-contain"
          />
        </header>

        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1">
            {children}
          </div>
          <footer className="border-t border-gray-200 px-6 py-3 mt-8">
            <p className="text-xs text-gray-400 text-center">
              Powered by Herrero x naawa, 2025-2026
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
