"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Globe,
  MapPin,
  Activity,
  LogOut,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  children?: { label: string; href: string }[];
}

const NAV: NavItem[] = [
  {
    label: "Resumen Ejecutivo",
    href: "/dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    label: "Nacional",
    href: "/nacional",
    icon: <Globe className="w-4 h-4" />,
    children: [
      { label: "Atribución", href: "/nacional/attribution" },
      { label: "Canales & ROI", href: "/nacional/channels" },
      { label: "Optimización", href: "/nacional/optimization" },
      { label: "Curvas de Saturación", href: "/nacional/curves" },
    ],
  },
  {
    label: "CDMX",
    href: "/cdmx",
    icon: <MapPin className="w-4 h-4" />,
    children: [
      { label: "Atribución", href: "/cdmx/attribution" },
      { label: "Canales & ROI", href: "/cdmx/channels" },
      { label: "Optimización", href: "/cdmx/optimization" },
      { label: "Curvas de Saturación", href: "/cdmx/curves" },
    ],
  },
  {
    label: "Salud del Modelo",
    href: "/model-health",
    icon: <Activity className="w-4 h-4" />,
  },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string[]>(["Nacional", "CDMX"]);

  function toggleSection(label: string) {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-[#006729] flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/15 flex items-start justify-between">
        <div>
          <div className="bg-white rounded-lg px-3 py-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.hdi.com.mx/wp-content/uploads/2021/12/2009-hdi-seguros-001.png"
              alt="HDI Seguros"
              className="h-7 w-auto object-contain"
            />
          </div>
          <p className="text-white/60 text-xs mt-2 font-medium tracking-wide uppercase">
            Marketing Mix Model
          </p>
        </div>
        {/* Close button — only visible on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-white/60 hover:text-white mt-0.5"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const isExpanded = expanded.includes(item.label);

          if (!item.children) {
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-white/20 text-white font-medium"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          }

          return (
            <div key={item.label}>
              <button
                onClick={() => toggleSection(item.label)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "text-white font-medium"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                )}
              </button>

              {isExpanded && (
                <div className="ml-6 mt-0.5 space-y-0.5 border-l border-white/20 pl-3">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onClose}
                      className={cn(
                        "block px-2 py-1.5 rounded-md text-xs transition-colors",
                        pathname === child.href
                          ? "text-white bg-white/20 font-medium"
                          : "text-white/55 hover:text-white hover:bg-white/10"
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-2 py-3 border-t border-white/15">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
                     text-white/55 hover:text-white hover:bg-white/10
                     text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
