
import { useAppDispatch } from "@/app/store/hooks"
import { clearAuthTokens, decodeAccessToken, isAccessTokenExpired, saveAuthTokens } from "../session/authSession"
import { publishAuthBroadcast } from "../session/authChannel"
import { getPostLoginPath } from "../session/postLoginPath"
import { useNavigate, useSearchParams } from "react-router"
import { useEffect } from "react"
import { setAuthenticatedUser } from "@/app/store/authSlice"
import { PageLoader } from "@/shared/ui/PageLoader"

const ErrorMessage: Record<string, string> = {
    "user_not_found": "Người dùng hiện chưa tồn tại. Vui lòng gửi đơn đăng ký hoặc liên hệ bên nhà trường để được hỗ trợ", 
    "email_not_verified": "Người dùng chưa được xác thực để đăng nhập", 
    "login_failed": "Đăng nhập thất bại, vui lòng thử lại", 
    "unsupported_platform": "Nền tảng không được hỗ trợ"
}

export function OAuth2CallbackPage() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    

    useEffect(() => {
        const token = searchParams.get("token")
        if (token) {
            const user = decodeAccessToken(token);
            if (!user || isAccessTokenExpired(user)) {
                clearAuthTokens()
                navigate('/login', {
                    replace: true
                })
                return
            }
            const postLoginPath = getPostLoginPath(user.roles)
            if (!postLoginPath) {
                clearAuthTokens()
                navigate('/login', {
                    replace: true
                })
                return
            } 

            saveAuthTokens({accessToken: token })
            dispatch(setAuthenticatedUser(user))
            // Cùng lý do như ở LoginPage: tab khác có thể đang mở dưới danh tính người trước.
            publishAuthBroadcast({ accessToken: token, type: 'authenticated' })
            navigate(postLoginPath, {replace: true})
            return
        }

        const code = searchParams.get('error') ?? "UNKNOWN"
        navigate('/login', {
            replace: true, 
            state: {
                message: {
                    text: ErrorMessage[code] ?? "Đăng nhập thất bại", 
                    tone: 'error'
                }
            }
        })

    }, [searchParams, dispatch, navigate])
    
    return <PageLoader/>
}
