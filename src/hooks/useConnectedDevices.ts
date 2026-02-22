import { useQuery } from "@tanstack/react-query";
import { telemetryAPI } from "@/services/api";

export function useConnectedDevices(enabled: boolean = true) {
  return useQuery({
    queryKey: ["telemetry-devices"],
    queryFn: () => telemetryAPI.getDevices(),
    enabled,
    staleTime: 1000 * 60 * 1, // 1 minute
    refetchInterval: 1000 * 60 * 1,
  });
}
