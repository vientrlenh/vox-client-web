import { apiClient } from "@/shared/api"
import { useMutation } from "@tanstack/react-query"

type VerifySchoolDirectoryInput = {
    id: string
}

export async function verifySchoolDirectory({id}: VerifySchoolDirectoryInput) {
    const response = await apiClient.patch(`/v1/schools/directories/${id}/verify`)
    return response.data
}

export function useVerifySchoolDirectoryMutation() {
    return useMutation({
        mutationFn: verifySchoolDirectory
    })
}