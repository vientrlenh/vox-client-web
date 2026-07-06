import { useEffect, useRef, type PropsWithChildren } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { refreshAuthTokens } from "@/features/auth/api/refreshAuthTokens";
import { clearAuthTokens, decodeAccessToken, isAccessTokenExpired, saveAuthTokens } from "@/features/auth/session/authSession";
import { clearAuthState, setAuthenticatedUser } from "../store/authSlice";
import { PageLoader } from "@/shared/ui/PageLoader";

export function AuthProvider({children}: PropsWithChildren) {
    const dispatch = useAppDispatch()
    const status = useAppSelector((state) => state.auth.status)
    const hasBootstrapped = useRef(false)

    useEffect(() => {
        if (status !== "loading" || hasBootstrapped.current) {
            return
        }
        hasBootstrapped.current = true

        refreshAuthTokens()
            .then((token) => {
                const user = decodeAccessToken(token.accessToken)

                if (!user || isAccessTokenExpired(user)) {
                    clearAuthTokens()
                    dispatch(clearAuthState())
                    return
                }

                saveAuthTokens(token)
                dispatch(setAuthenticatedUser(user))
                
            })
            .catch(() => {
                clearAuthTokens()
                dispatch(clearAuthState())
            })
    }, [status, dispatch])

    if (status === 'loading') {
        return <PageLoader/>
    }
    return <>{children}</>
}