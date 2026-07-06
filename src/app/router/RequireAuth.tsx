import { Navigate, Outlet, useLocation } from "react-router";
import { useAppSelector } from "../store/hooks";

export function RequireAuth() {
    const location = useLocation()
    const user = useAppSelector((state) => state.auth.user)

    if (!user) {
        return <Navigate replace state={{ from: location }} to="/login"/>
    }
    return <Outlet/>
}