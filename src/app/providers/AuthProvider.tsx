import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type PropsWithChildren } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { subscribeToAuthBroadcast } from "@/features/auth/session/authChannel";
import { clearAuthTokens, decodeAccessToken, isAccessTokenExpired, saveAuthTokens } from "@/features/auth/session/authSession";
import { refreshSessionOnce } from "@/features/auth/session/sessionRefresh";
import { clearAuthState, setAuthenticatedUser } from "../store/authSlice";
import { PageLoader } from "@/shared/ui/PageLoader";

/**
 * Khôi phục phiên từ cookie refresh_token đúng một lần mỗi lần nạp trang, rồi giữ cho mọi tab
 * đang mở nói cùng một trạng thái đăng nhập.
 *
 * Kể từ khi authSlice cho cả trạng thái "không có access token" vào 'loading', phần khôi phục
 * chạy cho MỌI lần mở trang chứ không riêng người có token hết hạn -- đó chính là điểm mấu chốt:
 * chỉ server mới biết cookie còn sống hay không. Thất bại là chuyện bình thường (khách vãng lai,
 * cookie đã hết hạn, phiên đã bị thu hồi bởi /logout) nên nhánh catch không báo lỗi gì ra ngoài,
 * chỉ hạ xuống anonymous.
 *
 * Chặn render bằng PageLoader trong lúc chờ là CỐ Ý: thả children ra sớm thì một người vào thẳng
 * đường dẫn có RequireAuth sẽ bị đá sang /login rồi vài trăm mili giây sau mới thành đã đăng nhập
 * -- nháy màn hình và mất luôn đường dẫn họ định vào.
 */
export function AuthProvider({children}: PropsWithChildren) {
    const dispatch = useAppDispatch()
    const status = useAppSelector((state) => state.auth.status)
    const userId = useAppSelector((state) => state.auth.user?.userId ?? null)
    const queryClient = useQueryClient()
    const hasBootstrapped = useRef(false)
    const lastIdentity = useRef<string | null>(userId)

    useEffect(() => {
        if (status !== "loading" || hasBootstrapped.current) {
            return
        }
        hasBootstrapped.current = true

        refreshSessionOnce()
            .then((accessToken) => {
                const user = decodeAccessToken(accessToken)

                if (!user || isAccessTokenExpired(user)) {
                    clearAuthTokens()
                    dispatch(clearAuthState())
                    return
                }

                saveAuthTokens({ accessToken })
                dispatch(setAuthenticatedUser(user))

            })
            .catch(() => {
                clearAuthTokens()
                dispatch(clearAuthState())
            })
    }, [status, dispatch])

    /**
     * Đổi người đăng nhập thì VỨT sạch cache của React Query.
     *
     * `queryClient` là một singleton dựng lúc nạp module, còn đăng xuất rồi đăng nhập lại chỉ là
     * điều hướng trong SPA -- không có lần tải trang nào để dọn nó. Trước đây `useLogout` xoá
     * token, xoá state Redux và báo cho tab khác, nhưng KHÔNG đụng tới cache, nên mọi thứ người
     * trước đã tải vẫn nằm nguyên đó và được phục vụ cho người kế tiếp.
     *
     * Đó chính là lý do thanh tài khoản hiện TÊN người cũ kèm VAI TRÒ người mới: vai trò đọc từ
     * JWT nên mới theo từng lần đăng nhập, còn tên đọc từ `useProfileQuery` -- khoá `['profile',
     * 'me']` không mang userId, lại thêm `staleTime` 5 phút, nên React Query trả thẳng bản cũ và
     * còn không thèm gọi lại. Cùng cơ chế đó áp cho MỌI truy vấn khác đã nằm trong cache: dữ liệu
     * trường, bảng điều khiển, sao kê ví, kết quả thi. Kể cả khi `staleTime` đã hết, React Query
     * vẫn vẽ bản cũ ra trước rồi mới nạp lại ngầm -- nên vẫn luôn có ít nhất một khung hình dữ
     * liệu của người trước.
     *
     * Đặt ở đây chứ không ở `useLogout` vì đây là chỗ DUY NHẤT nhìn thấy mọi lần đổi danh tính:
     * đăng xuất, đăng nhập, tin từ tab khác, và cả nhánh khôi phục phiên hỏng. Bám vào userId chứ
     * không vào status vì `authenticated -> authenticated` với hai người khác nhau là đúng cái ca
     * nguy hiểm nhất mà status không phân biệt được.
     *
     * Lần chạy đầu KHÔNG xoá: ref khởi tạo bằng chính danh tính của lần render đầu tiên. Lúc mở
     * trang mà phiên còn sống thì cache vốn đã trống, xoá chỉ vứt đi những gì vừa nạp xong.
     */
    useEffect(() => {
        if (lastIdentity.current === userId) {
            return
        }
        lastIdentity.current = userId
        queryClient.clear()
    }, [queryClient, userId])

    /**
     * Áp trạng thái do tab khác thông báo.
     *
     * TUYỆT ĐỐI không phát lại tin ở đây. Kênh không giao tin cho chính đối tượng đã gửi, nhưng
     * nếu nhánh này vừa nhận vừa phát thì hai tab sẽ dội tin qua lại vô tận.
     *
     * Không điều hướng, cũng cố ý: hạ user xuống null là đủ để RequireAuth/RequireRole tự đưa
     * người dùng ra /login ở lần render kế tiếp, còn tab đang ở trang công khai thì được yên.
     */
    useEffect(() => {
        return subscribeToAuthBroadcast((message) => {
            if (message.type === 'anonymous') {
                clearAuthTokens()
                dispatch(clearAuthState())
                return
            }

            const user = decodeAccessToken(message.accessToken)

            if (!user || isAccessTokenExpired(user)) {
                return
            }

            saveAuthTokens({ accessToken: message.accessToken })
            dispatch(setAuthenticatedUser(user))
        })
    }, [dispatch])

    if (status === 'loading') {
        return <PageLoader/>
    }
    return <>{children}</>
}
