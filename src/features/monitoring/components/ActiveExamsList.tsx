import { getExamStatusDisplay } from "@/features/exam/types";
import { formatDateTime } from "@/features/examCore/types";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { CalendarClock, MonitorPlay, NotebookPen } from "lucide-react";
import { Link } from "react-router";

import { useMonitorableExamsQuery, type MonitoredExamSummary } from "../api/useMonitorableExams";

const PLACEHOLDER = 'rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-medium text-slate-500'

/**
 * Kỳ thi tập trung lên trước, bài kiểm tra trên lớp xuống sau.
 *
 * <p>Hai loại này không cùng mức khẩn: kỳ thi tập trung là sự kiện toàn trường có hội đồng, bài trên
 * lớp là bài của một giáo viên.
 *
 * <p>Trong cùng một loại thì ca ĐANG chạy đứng trên ca sắp chạy -- danh sách này giờ gồm cả hai, và
 * thứ cần xử lý ngay không được nằm dưới thứ còn nửa tiếng nữa mới bắt đầu.
 */
function byMonitoringPriority(left: MonitoredExamSummary, right: MonitoredExamSummary): number {
    const kindDelta = Number(left.kind === 'CLASS_TEST') - Number(right.kind === 'CLASS_TEST')
    if (kindDelta !== 0) {
        return kindDelta
    }
    const liveDelta = Number(right.liveScheduleCount > 0) - Number(left.liveScheduleCount > 0)
    if (liveDelta !== 0) {
        return liveDelta
    }
    return (left.name ?? '').localeCompare(right.name ?? '', 'vi')
}

export function ActiveExamsList() {
    // Truy vấn RIÊNG của giám sát, không phải `exams` của màn quản lý kỳ thi.
    //
    // `exams` giới hạn theo thành viên hội đồng, mà hội đồng thì không bắt buộc -- giám thị của một
    // kỳ thi do nhà trường tự dựng sẽ không thấy phòng mình phải gác. Nới `exams` để chữa việc đó
    // lại mở luôn dashboard kỳ thi cho giám thị, nên quyền giám sát tách hẳn sang đây.
    //
    // Đi kèm: phạm vi "đang/sắp diễn ra" giờ do server lọc. Bản cũ lấy một trang 50 rồi lọc ở trình
    // duyệt, nên một phòng thi có thể biến mất khỏi màn giám sát chỉ vì trang đầu đã kín.
    const { data, isError, isLoading } = useMonitorableExamsQuery()

    const exams = [...(data ?? [])].sort(byMonitoringPriority)

    if (isLoading) {
        return <p className={PLACEHOLDER}>Đang tải danh sách đang diễn ra…</p>
    }
    if (isError) {
        return (
            <p className="rounded-lg border border-red-200 bg-red-50 p-10 text-center text-sm font-semibold text-red-700">
                Không tải được danh sách kỳ thi.
            </p>
        )
    }
    if (exams.length === 0) {
        return <p className={PLACEHOLDER}>Hiện chưa có kỳ thi hoặc bài kiểm tra nào đang diễn ra hoặc sắp bắt đầu.</p>
    }
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {exams.map((exam) => {
            const status = getExamStatusDisplay(exam.status ?? '')
            const isClassTest = exam.kind === 'CLASS_TEST'
            const isLive = exam.liveScheduleCount > 0
            return (
            <Link
                className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-cyan-300 hover:shadow-sm"
                key={exam.examId}
                to={`exams/${exam.examId}`}
            >
                <div className="flex items-center justify-between gap-2">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                    {isClassTest ? (
                        <NotebookPen aria-hidden="true" className="size-5" />
                    ) : (
                        <MonitorPlay aria-hidden="true" className="size-5" />
                    )}
                </span>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {/*
                      Nhãn loại đứng cạnh nhãn trạng thái vì cả hai đều là thứ giám thị cần biết TRƯỚC
                      khi bấm vào: một kỳ thi tập trung và một bài kiểm tra trên lớp đòi mức chú ý
                      khác nhau, và từ đây trở đi hai luồng nhìn hệt nhau.
                    */}
                    <StatusBadge
                        label={isClassTest ? 'Bài trên lớp' : 'Kỳ thi tập trung'}
                        tone={isClassTest ? 'violet' : 'info'}
                    />
                    <StatusBadge label={status.label} tone={status.tone} />
                </div>
                </div>
                <p className="mt-4 truncate text-base font-black text-slate-950">{exam.name}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{exam.code}</p>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
                {formatDateTime(exam.windowStart)} – {formatDateTime(exam.windowEnd)}
                </p>
                {/*
                  Nói thẳng ca đã chạy chưa. Danh sách này giờ có cả kỳ thi sắp bắt đầu, và một thẻ
                  trông y hệt thẻ đang phát là lời mời bấm vào một phòng chưa có ai -- giám thị sẽ
                  kết luận là hệ thống hỏng chứ không phải là chưa tới giờ.
                */}
                <p className={`mt-2 text-xs font-bold ${isLive ? 'text-red-600' : 'text-slate-500'}`}>
                    {isLive ? `${exam.liveScheduleCount} ca đang diễn ra` : 'Sắp bắt đầu'}
                </p>
            </Link>
            )
        })}
        </div>
    )
}
