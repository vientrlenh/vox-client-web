import { Navigate } from "react-router";
import { useAppSelector } from "../store/hooks";
import { SystemAdminLayout } from "./SystemAdminLayout";
import { SchoolAdminLayout } from "./SchoolAdminLayout";
import { TeacherLayout } from "./TeacherLayout";
import { StudentLayout } from "./StudentLayout";

export function RoleLayout() {
    const user = useAppSelector((state) => state.auth.user)

    if (!user) {
        return <Navigate replace to="/login"/>
    }

    if (user.roles.includes('SYSTEM_ADMIN')) {
        return <SystemAdminLayout/>
    }

    if (user.roles.includes('SCHOOL_ADMIN')) {
        return <SchoolAdminLayout/>
    }

    if (user.roles.includes('TEACHER')) {
        return <TeacherLayout/>
    }
    if (user.roles.includes('STUDENT')) {
        return <StudentLayout/>
    }
    return <Navigate replace to="/login"/>
}
