import { useExamsQuery } from "@/features/exam/api/useExamQueries";
import { getExamStatusDisplay } from "@/features/exam/types";
import { formatDateTime, type ExamDto } from "@/features/examCore/types";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { CalendarClock, MonitorPlay } from "lucide-react";
import { Link } from "react-router";

const PLACEHOLDER = 'rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-medium text-slate-500'

function isExamActiveNow(exam: ExamDto): boolean {
    if (exam.status !== 'IN_PROGRESS') return false
    const now = Date.now()
    if (exam.openAt && now < new Date(exam.openAt).getTime()) return false
    if (exam.closeAt && now >= new Date(exam.closeAt).getTime()) return false
    return true
}

export function ActiveExamsList() {
    const { data, isLoading, isError } = useExamsQuery({
        status: 'IN_PROGRESS',
        page: 1,
        size: 20
    })

    const exams = (data?.content ?? []).filter(isExamActiveNow)

    if (isLoading) {
        return <p className={PLACEHOLDER}>Đang tải kỳ thi đang diễn ra…</p>
    }
    if (isError) {
        return (
            <p className="rounded-lg border border-red-200 bg-red-50 p-10 text-center text-sm font-semibold text-red-700">
                Không tải được danh sách kỳ thi.
            </p>
        )
    }
    console.log(exams.length == 0)
    if (exams.length === 0) {
        return <p className={PLACEHOLDER}>Hiện chưa có kỳ thi nào đang diễn ra.</p>
    }
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {exams.map((exam: ExamDto) => {
            const status = getExamStatusDisplay(exam.status)
            return (
            <Link
                className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-cyan-300 hover:shadow-sm"
                key={exam.id}
                to={`exams/${exam.id}`}
            >
                <div className="flex items-center justify-between">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                    <MonitorPlay aria-hidden="true" className="size-5" />
                </span>
                <StatusBadge label={status.label} tone={status.tone} />
                </div>
                <p className="mt-4 truncate text-base font-black text-slate-950">{exam.name}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{exam.code}</p>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
                {formatDateTime(exam.openAt)} – {formatDateTime(exam.closeAt)}
                </p>
            </Link>
            )
        })}
        </div>
    )
}
