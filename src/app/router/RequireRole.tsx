import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { clearAuthState } from '@/app/store/authSlice'
import {
  clearAuthTokens,
  isAccessTokenExpired,
} from '@/features/auth/session/authSession'
import type { RoleCode } from '@/features/auth/types'

type RequireRoleProps = {
  role: RoleCode
}

export function RequireRole({ role }: RequireRoleProps) {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const user = useAppSelector((state) => state.auth.user)
  const isExpired = user ? isAccessTokenExpired(user) : false
  const isForbidden = user ? !user.roles.includes(role) : false

  useEffect(() => {
    if (isExpired || isForbidden) {
      clearAuthTokens()
      dispatch(clearAuthState())
    }
  }, [dispatch, isExpired, isForbidden])

  if (!user || isExpired || isForbidden) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}
