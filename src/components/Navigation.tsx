"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useClientLabels } from "@/hooks/useClientLabels";
import { SmartLink } from "@/components/SmartLink";
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  CubeIcon,
  WrenchIcon,
  ChartBarIcon,
  UserGroupIcon,
  MapIcon,
  ShieldCheckIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon, labelKey: null as string | null },
  { name: "Driver Leaderboard", href: "/dashboard/drivers/leaderboard", icon: TrophyIcon, labelKey: null },
  { name: "Assets", href: "/dashboard/assets", icon: CubeIcon, labelKey: "asset" as const },
  { name: "Analytics", href: "/dashboard/analytics", icon: ChartBarIcon, labelKey: null },
  { name: "Live Map", href: "/dashboard/map", icon: MapIcon, labelKey: null },
  { name: "Trip Planning", href: "/dashboard/trip-plans", icon: MapIcon, labelKey: null },
  { name: "Geofences", href: "/dashboard/geofences", icon: ShieldCheckIcon, labelKey: null },
  { name: "Clients", href: "/dashboard/clients", icon: UserGroupIcon, labelKey: null },
];

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { assetLabel, componentLabel } = useClientLabels();

  const isActive = (path: string) => pathname === path;

  const getDisplayName = (item: (typeof navigationItems)[0]) => {
    if (item.labelKey === "asset") return assetLabel;
    if (item.labelKey === "component") return componentLabel;
    return item.name;
  };

  return (
    <>
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <SmartLink
                  href="/dashboard"
                  className="text-2xl font-bold text-blue-900 cursor-pointer"
                >
                  TREKAMAN
                </SmartLink>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SmartLink
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-1 pt-1 text-sm font-medium cursor-pointer ${isActive(item.href)
                          ? "border-b-2 border-teal-500 text-gray-900"
                          : "border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                      variant="nav"
                    >
                      <Icon className="h-5 w-5 mr-1" />
                      {getDisplayName(item)}
                    </SmartLink>
                  );
                })}
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <div className="flex items-center">
                <span className="text-gray-700 mr-4">
                  Welcome, {user?.email}
                </span>
                <button
                  onClick={logout}
                  className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </div>
            </div>
            <div className="-mr-2 flex items-center sm:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 cursor-pointer"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`${mobileMenuOpen ? "block" : "hidden"} sm:hidden`}>
          <div className="space-y-1 pb-3 pt-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <SmartLink
                  key={item.name}
                  href={item.href}
                  className={`block py-2 pl-3 pr-4 text-base font-medium cursor-pointer ${isActive(item.href)
                      ? "bg-teal-50 border-l-4 border-teal-500 text-teal-700"
                      : "border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  onClick={() => setMobileMenuOpen(false)}
                  variant="default"
                >
                  <div className="flex items-center">
                    <Icon className="h-5 w-5 mr-2" />
                    {getDisplayName(item)}
                  </div>
                </SmartLink>
              );
            })}
          </div>
          <div className="border-t border-gray-200 pb-3 pt-4">
            <div className="flex items-center px-4">
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">
                  {user?.email}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="block w-full px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
