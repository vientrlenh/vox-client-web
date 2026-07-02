import { Presentation } from 'lucide-react'
import { SchoolUserListView } from '../components/SchoolUserListView'
import { useSchoolTeachersQuery } from '../api/useSchoolTeachersQuery'

export function SchoolAdminTeachersPage() {
  return (
    <SchoolUserListView
      basePath="/school-admin/teachers"
      createLabel="Tạo giáo viên"
      eyebrow="Quản lý giáo viên"
      icon={Presentation}
      lockedRole="TEACHER"
      subtitle="Tạo, cập nhật, lọc và quản lý giáo viên trong trường."
      title="Giáo viên trong nhà trường"
      useListQuery={useSchoolTeachersQuery}
    />
  )
}
