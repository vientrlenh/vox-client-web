import { useExamsQuery } from "@/features/exam/api/useExamQueries";
import { getExamStatusDisplay } from "@/features/exam/types";
import { formatDateTime, type ExamDto } from "@/features/examCore/types";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { CalendarClock, MonitorPlay, NotebookPen } from "lucide-react";
import { Link } from "react-router";

const PLACEHOLDER = 'rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-medium text-slate-500'

function isExamActiveNow(exam: ExamDto): boolean {
    if (exam.status !== 'IN_PROGRESS') return false
    const now = Date.now()
    if (exam.openAt && now < new Date(exam.openAt).getTime()) return false
    if (exam.closeAt && now >= new Date(exam.closeAt).getTime()) return false
    return true
}

/**
 * Kỳ thi tập trung lên trước, bài kiểm tra trên lớp xuống sau.
 *
 * <p>Hai loại này không cùng mức khẩn: kỳ thi tập trung là sự kiện toàn trường có hội đồng, bài trên
 * lớp là bài của một giáo viên. Để nguyên thứ tự backend trả về thì một kỳ thi đang diễn ra có thể
 * bị đẩy xuống dưới mấy bài kiểm tra chỉ vì chúng được tạo sau.
 */
function byMonitoringPriority(left: ExamDto, right: ExamDto): number {
    const kindDelta = Number(left.kind === 'CLASS_TEST') - Number(right.kind === 'CLASS_TEST')
    return kindDelta !== 0 ? kindDelta : left.name.localeCompare(right.name, 'vi')
}

export function ActiveExamsList() {
    const { data, isLoading, isError } = useExamsQuery({
        // kind: null = lấy CẢ bài kiểm tra trên lớp. Bài trên lớp cũng có ca thi, cũng có giám thị, và
        // form tạo bài mặc định bật giám sát đầy đủ - bỏ chúng khỏi đây nghĩa là giáo viên chịu mọi
        // ràng buộc của giám sát (ghi hình, cảnh báo AI, chặn học sinh không có camera) mà không xem
        // được gì trong lúc học sinh đang làm bài.
        kind: null,
        page: 1,
        // Trang này lọc "đang diễn ra" ở CLIENT sau khi lấy một trang, nên trang phải rộng hơn số kỳ
        // thi thực sự đang chạy. Gộp thêm bài trên lớp làm nguồn dày lên nhiều (mỗi lớp một bài), nên
        // 20 là quá hẹp - một ca thi có thể biến mất khỏi danh sách chỉ vì trang đầu đã kín.
        size: 50,
        status: 'IN_PROGRESS'
    })

    const exams = (data?.content ?? []).filter(isExamActiveNow).sort(byMonitoringPriority)

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
        return <p className={PLACEHOLDER}>Hiện chưa có kỳ thi hoặc bài kiểm tra nào đang diễn ra.</p>
    }
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {exams.map((exam: ExamDto) => {
            const status = getExamStatusDisplay(exam.status)
            const isClassTest = exam.kind === 'CLASS_TEST'
            return (
            <Link
                className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-cyan-300 hover:shadow-sm"
                key={exam.id}
                to={`exams/${exam.id}`}
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
                {formatDateTime(exam.openAt)} – {formatDateTime(exam.closeAt)}
                </p>
            </Link>
            )
        })}
        </div>
    )
}
