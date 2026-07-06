import { useQuery } from "@tanstack/react-query";
import { useMonitorToken } from "./useMonitorToken";
import { fetchActiveRooms } from "./streamClient";

export function useActiveRooms() {
    const { data: token } = useMonitorToken()

    return useQuery({
        queryKey: ['activeRooms', token?.token ?? null], 
        queryFn: () => fetchActiveRooms(token!.token),
        enabled: Boolean(token?.token), 
        refetchInterval: 8_000,
        refetchOnWindowFocus: false,
    })
}