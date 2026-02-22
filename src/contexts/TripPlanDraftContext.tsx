"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { Waypoint } from "@/types/api";

export interface TripPlanDraft {
  formData: {
    name: string;
    description: string;
    waypoints: Waypoint[];
    load_weight_kg?: number;
    asset_id?: string;
    is_active: boolean;
  };
  startAddress: { name: string; lat: number; lon: number } | null;
  startSearch: string;
  destinationAddress: { name: string; lat: number; lon: number } | null;
  destSearch: string;
  intermediateWaypoints: Waypoint[];
  showAddWaypoints: boolean;
  citySearch: string;
  startCity: { lat: number; lon: number; name: string } | null;
  savedAt: number;
}

interface TripPlanDraftContextType {
  draft: TripPlanDraft | null;
  saveDraft: (draft: TripPlanDraft) => void;
  clearDraft: () => void;
  hasDraft: boolean;
}

const TripPlanDraftContext = createContext<TripPlanDraftContextType | undefined>(undefined);

export function TripPlanDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<TripPlanDraft | null>(null);

  const saveDraft = useCallback((d: TripPlanDraft) => {
    setDraft({ ...d, savedAt: Date.now() });
  }, []);

  const clearDraft = useCallback(() => {
    setDraft(null);
  }, []);

  return (
    <TripPlanDraftContext.Provider
      value={{
        draft,
        saveDraft,
        clearDraft,
        hasDraft: draft !== null,
      }}
    >
      {children}
    </TripPlanDraftContext.Provider>
  );
}

export function useTripPlanDraft() {
  const context = useContext(TripPlanDraftContext);
  if (context === undefined) {
    throw new Error("useTripPlanDraft must be used within a TripPlanDraftProvider");
  }
  return context;
}
