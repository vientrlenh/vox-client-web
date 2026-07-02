import { GraduationCap } from 'lucide-react'
import { SchoolUserListView } from '../components/SchoolUserListView'
import { useSchoolStudentsQuery } from '../api/useSchoolStudentsQuery'

export function SchoolAdminStudentsPage() {
  return (
    <SchoolUserListView
      basePath="/school-admin/students"
      createLabel="Tạo học sinh"
      eyebrow="Quản lý học sinh"
      icon={GraduationCap}
      importPath="/school-admin/students/import"
      lockedRole="STUDENT"
      subtitle="Tạo, cập nhật, lọc và quản lý học sinh trong trường."
      title="Học sinh trong nhà trường"
      useListQuery={useSchoolStudentsQuery}
    />
  )
}
