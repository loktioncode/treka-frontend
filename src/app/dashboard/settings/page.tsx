"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

/**
 * Settings redirects to Profile > Notification Settings.
 * Notification settings are kept under Profile only.
 */
export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (user.role === "admin") {
      router.replace("/dashboard/profile?tab=notification-settings");
    } else {
      router.replace("/dashboard/profile");
    }
  }, [user, router]);

  return null;
}
