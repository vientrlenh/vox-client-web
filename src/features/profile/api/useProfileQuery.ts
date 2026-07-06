import type { User } from "@/features/school/types";
import { graphQLRequest } from "@/shared/api";
import { useQuery } from "@tanstack/react-query";

export type Profile = User

export const profileQueryKeys = {
    all: ['profile'] as const, 
    me: () => [...profileQueryKeys.all, 'me'] as const
}

const GET_PROFILE_QUERY = `
    query Profile {
        profile {
            id 
            email
            phone
            fullName
            gender
            dateOfBirth
            address
            avatarUrl
            createdAt
            updatedAt
        }
    }
`

async function fetchProfile(): Promise<User | null> {
    const data = await graphQLRequest<{ profile: User | null }>(GET_PROFILE_QUERY)
    return data.profile
}

export function useProfileQuery() {
    return useQuery({
        queryKey: profileQueryKeys.me(), 
        queryFn: fetchProfile, 
        staleTime: 5 * 60 * 1000,
    })
}