import { SiteFooter } from '@/shared/ui/SiteFooter'

/**
 * Trang chính sách bảo mật công khai, dùng làm URL khai báo trong Google Play Console.
 *
 * Google yêu cầu URL này (1) truy cập được mà KHÔNG cần đăng nhập, (2) mô tả đúng những gì app
 * thật sự thu thập, và (3) khớp với phần "Data safety" khai trong Console. Nội dung dưới đây
 * bám sát quyền app Android đang xin (INTERNET, POST_NOTIFICATIONS, RECORD_AUDIO) và các SDK
 * thật trong pubspec (google_sign_in, firebase_core/messaging/app_installations, record) --
 * đừng thêm mục chỉ vì "cho đầy đủ", khai thừa cũng bị từ chối như khai thiếu.
 */

const LAST_UPDATED = '14/08/2026'

/** Đổi khi có thay đổi thật; Google đối chiếu ngày này với lần cập nhật app. */
const CONTACT_EMAIL = 'minhthuan102030@gmail.com'

type SectionProps = {
  id: string
  title: string
  children: React.ReactNode
}

function Section({ id, title, children }: SectionProps) {
  return (
    <section className="scroll-mt-24" id={id}>
      <h2 className="text-xl font-black text-slate-950 sm:text-2xl">{title}</h2>
      <div className="mt-3 grid gap-3 text-sm leading-7 text-slate-700">{children}</div>
    </section>
  )
}

function DataRow({
  purpose,
  data,
  shared,
}: {
  data: string
  purpose: string
  shared: string
}) {
  return (
    <tr className="border-t border-slate-200 align-top">
      <td className="px-4 py-3 text-sm font-bold text-slate-950">{data}</td>
      <td className="px-4 py-3 text-sm text-slate-700">{purpose}</td>
      <td className="px-4 py-3 text-sm text-slate-700">{shared}</td>
    </tr>
  )
}

const TOC = [
  { id: 'thu-thap', label: '1. Dữ liệu chúng tôi thu thập' },
  { id: 'khong-thu-thap', label: '2. Dữ liệu chúng tôi KHÔNG thu thập' },
  { id: 'ghi-am', label: '3. Ghi âm và quyền micro' },
  { id: 'ben-thu-ba', label: '4. Chia sẻ với bên thứ ba' },
  { id: 'luu-tru', label: '5. Lưu trữ và thời gian giữ' },
  { id: 'tre-em', label: '6. Dữ liệu của học sinh chưa thành niên' },
  { id: 'quyen', label: '7. Quyền của bạn' },
  { id: 'bao-mat', label: '8. Bảo mật' },
  { id: 'thay-doi', label: '9. Thay đổi chính sách' },
  { id: 'lien-he', label: '10. Liên hệ' },
]

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">
            Chính sách bảo mật
          </h1>
          <p className="mt-3 text-sm font-semibold text-slate-600">
            Áp dụng cho ứng dụng di động Vox, ứng dụng web voxenta.net và ứng dụng thi trên máy
            tính Windows.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Cập nhật lần cuối: {LAST_UPDATED}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Mục lục" className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Mục lục</h2>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {TOC.map((item) => (
              <li key={item.id}>
                <a className="text-sm font-semibold text-indigo-700 hover:underline" href={`#${item.id}`}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 grid gap-10">
          <p className="text-sm leading-7 text-slate-700">
            Vox là nền tảng luyện tập và đánh giá kỹ năng nói tiếng Anh dành cho trường học. Tài
            liệu này giải thích chúng tôi thu thập dữ liệu gì, dùng để làm gì, chia sẻ với ai, và
            bạn có những quyền nào. Chúng tôi chỉ thu thập dữ liệu cần thiết để sản phẩm hoạt
            động và <strong>không bán dữ liệu cá nhân cho bất kỳ bên nào</strong>.
          </p>

          <Section id="thu-thap" title="1. Dữ liệu chúng tôi thu thập">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-160 border-collapse text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Loại dữ liệu</th>
                    <th className="px-4 py-3">Mục đích</th>
                    <th className="px-4 py-3">Có chia sẻ?</th>
                  </tr>
                </thead>
                <tbody>
                  <DataRow
                    data="Thông tin tài khoản: họ tên, địa chỉ email, trường, lớp, vai trò"
                    purpose="Tạo và xác thực tài khoản, gán bạn vào đúng lớp và kỳ thi"
                    shared="Không, ngoài giáo viên và quản trị viên trường của bạn"
                  />
                  <DataRow
                    data="Bản ghi âm giọng nói khi làm bài thi hoặc luyện tập"
                    purpose="Chấm điểm phát âm, độ trôi chảy, nội dung câu trả lời"
                    shared="Có — xem mục 4"
                  />
                  <DataRow
                    data="Bản chép lời (transcript) từ bản ghi âm"
                    purpose="Đánh giá ngữ pháp, từ vựng, mức độ liên quan tới câu hỏi"
                    shared="Có — xem mục 4"
                  />
                  <DataRow
                    data="Kết quả học tập: điểm, nhận xét, lịch sử luyện tập, chủ đề đã chọn"
                    purpose="Hiển thị kết quả cho bạn và giáo viên, cá nhân hoá bài luyện tập"
                    shared="Không, ngoài giáo viên và quản trị viên trường của bạn"
                  />
                  <DataRow
                    data="Mã thiết bị nhận thông báo (Firebase Installations ID)"
                    purpose="Gửi thông báo đẩy về lịch thi và kết quả"
                    shared="Google (Firebase Cloud Messaging)"
                  />
                  <DataRow
                    data="Nhật ký kỹ thuật: thời điểm truy cập, mã lỗi, chất lượng kết nối"
                    purpose="Khắc phục sự cố và bảo đảm bài thi không bị gián đoạn"
                    shared="Không"
                  />
                </tbody>
              </table>
            </div>
            <p>
              Nếu bạn đăng nhập bằng Google, chúng tôi nhận từ Google <strong>tên và địa chỉ
              email</strong> của bạn. Chúng tôi không nhận mật khẩu Google và không truy cập bất
              kỳ dữ liệu nào khác trong tài khoản Google của bạn.
            </p>
          </Section>

          <Section id="khong-thu-thap" title="2. Dữ liệu chúng tôi KHÔNG thu thập">
            <p>Ứng dụng di động Vox <strong>không</strong> thu thập những dữ liệu sau:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Vị trí địa lý</li>
              <li>Danh bạ, tin nhắn, lịch sử cuộc gọi</li>
              <li>Ảnh, video hoặc tệp trong bộ nhớ thiết bị</li>
              <li>Hình ảnh từ camera</li>
              <li>Thông tin thanh toán của cá nhân học sinh</li>
              <li>Dữ liệu dùng cho quảng cáo hoặc theo dõi hành vi trên các ứng dụng khác</li>
            </ul>
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <strong>Riêng kỳ thi chính thức trên máy tính Windows:</strong> phần mềm thi có sử
              dụng camera và hình ảnh màn hình để giám sát chống gian lận, và ghi nhận khi thí
              sinh rời khỏi cửa sổ làm bài. Việc này chỉ diễn ra trong thời gian làm bài thi, chỉ
              trên phần mềm máy tính, và bạn sẽ được thông báo trước khi bắt đầu.{' '}
              <strong>Ứng dụng di động không có chức năng này.</strong>
            </p>
          </Section>

          <Section id="ghi-am" title="3. Ghi âm và quyền micro">
            <p>
              Ứng dụng cần quyền <strong>Micro (RECORD_AUDIO)</strong> vì đây là chức năng cốt lõi:
              bạn nói, hệ thống chấm điểm phần nói đó. Không có quyền này thì ứng dụng không dùng
              được.
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Micro <strong>chỉ bật trong phiên thi hoặc phiên luyện tập</strong> mà bạn chủ động bắt đầu.</li>
              <li>Ứng dụng <strong>không ghi âm nền</strong> và không ghi âm khi bạn đang ở màn hình khác.</li>
              <li>Bạn có thể thu hồi quyền micro bất kỳ lúc nào trong phần Cài đặt của điện thoại.</li>
            </ul>
            <p>
              Quyền <strong>Thông báo (POST_NOTIFICATIONS)</strong> chỉ dùng để báo lịch thi và
              kết quả. Từ chối quyền này ứng dụng vẫn hoạt động bình thường.
            </p>
          </Section>

          <Section id="ben-thu-ba" title="4. Chia sẻ với bên thứ ba">
            <p>
              Để chấm được bài nói, bản ghi âm và bản chép lời của bạn được gửi tới các nhà cung
              cấp dịch vụ trí tuệ nhân tạo dưới đây. Họ xử lý dữ liệu <strong>thay mặt chúng
              tôi</strong> theo hợp đồng, và chỉ để trả kết quả về cho chúng tôi:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li><strong>Microsoft Azure (Speech Services)</strong> — nhận dạng giọng nói, chấm phát âm, hội thoại thời gian thực</li>
              <li><strong>OpenAI</strong> — phân tích nội dung câu trả lời và sinh câu hỏi luyện tập</li>
              <li><strong>Anthropic</strong> — đối chiếu kết quả đánh giá để tăng độ chính xác</li>
              <li><strong>Amazon Web Services</strong> — lưu trữ dữ liệu và vận hành hệ thống</li>
              <li><strong>Google (Firebase)</strong> — gửi thông báo đẩy</li>
            </ul>
            <p>
              Ngoài các trường hợp trên, chúng tôi chỉ tiết lộ dữ liệu khi có yêu cầu hợp pháp của
              cơ quan nhà nước có thẩm quyền. <strong>Chúng tôi không bán, không cho thuê, không
              trao đổi dữ liệu cá nhân của bạn vì mục đích thương mại.</strong>
            </p>
          </Section>

          <Section id="luu-tru" title="5. Lưu trữ và thời gian giữ">
            <p>
              Dữ liệu được lưu trên hạ tầng Amazon Web Services tại{' '}
              <strong>khu vực Singapore (ap-southeast-1)</strong>. Các nhà cung cấp AI nêu ở mục 4
              có thể xử lý dữ liệu tại máy chủ đặt ngoài Việt Nam.
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li><strong>Bản ghi âm và bản chép lời bài thi:</strong> giữ trong thời gian nhà trường quy định để phục vụ phúc khảo, sau đó xoá.</li>
              <li><strong>Dữ liệu luyện tập cá nhân:</strong> giữ trong thời gian tài khoản còn hoạt động.</li>
              <li><strong>Thông tin tài khoản:</strong> xoá khi tài khoản bị xoá hoặc khi nhà trường kết thúc hợp đồng sử dụng.</li>
            </ul>
          </Section>

          <Section id="tre-em" title="6. Dữ liệu của học sinh chưa thành niên">
            <p>
              Vox được cung cấp <strong>thông qua nhà trường</strong>, không mở đăng ký tự do cho
              trẻ em. Tài khoản học sinh do nhà trường tạo và quản lý trong phạm vi hoạt động giáo
              dục.
            </p>
            <p>
              Với học sinh chưa đủ tuổi tự đồng ý theo quy định pháp luật, nhà trường có trách
              nhiệm thu thập sự đồng ý của cha mẹ hoặc người giám hộ trước khi cấp tài khoản. Cha
              mẹ hoặc người giám hộ có quyền yêu cầu xem, sửa hoặc xoá dữ liệu của con em mình
              thông qua nhà trường hoặc liên hệ trực tiếp với chúng tôi.
            </p>
            <p>
              Chúng tôi <strong>không dùng dữ liệu của học sinh để quảng cáo</strong>, không xây
              dựng hồ sơ tiếp thị và không chuyển dữ liệu cho bên quảng cáo.
            </p>
          </Section>

          <Section id="quyen" title="7. Quyền của bạn">
            <ul className="ml-5 list-disc space-y-1">
              <li><strong>Xem</strong> dữ liệu cá nhân chúng tôi đang giữ về bạn</li>
              <li><strong>Sửa</strong> thông tin không chính xác</li>
              <li><strong>Xoá</strong> tài khoản và dữ liệu liên quan</li>
              <li><strong>Rút lại</strong> quyền micro hoặc thông báo bất kỳ lúc nào trong Cài đặt thiết bị</li>
              <li><strong>Khiếu nại</strong> nếu cho rằng dữ liệu của bạn bị xử lý sai</li>
            </ul>
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <strong>Yêu cầu xoá tài khoản:</strong> gửi email tới{' '}
              <a className="font-bold text-indigo-700 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>{' '}
              từ chính địa chỉ email đã đăng ký, tiêu đề ghi rõ &quot;Yêu cầu xoá tài khoản&quot;.
              Chúng tôi xử lý trong vòng 30 ngày. Lưu ý: nếu bạn là học sinh đang trong kỳ thi, một
              số kết quả có thể phải giữ lại theo quy định lưu trữ hồ sơ của nhà trường.
            </p>
          </Section>

          <Section id="bao-mat" title="8. Bảo mật">
            <ul className="ml-5 list-disc space-y-1">
              <li>Toàn bộ dữ liệu truyền giữa thiết bị và máy chủ được mã hoá bằng HTTPS/TLS.</li>
              <li>Mật khẩu được lưu dưới dạng băm, không lưu dạng văn bản thuần.</li>
              <li>Chỉ giáo viên và quản trị viên của chính trường bạn mới xem được kết quả của bạn.</li>
            </ul>
            <p>
              Không có hệ thống nào an toàn tuyệt đối. Nếu xảy ra sự cố lộ lọt dữ liệu, chúng tôi
              sẽ thông báo cho nhà trường và người dùng bị ảnh hưởng theo quy định pháp luật.
            </p>
          </Section>

          <Section id="thay-doi" title="9. Thay đổi chính sách">
            <p>
              Khi có thay đổi, chúng tôi cập nhật trang này và sửa ngày &quot;Cập nhật lần
              cuối&quot; ở đầu trang. Với thay đổi lớn ảnh hưởng tới quyền của bạn, chúng tôi sẽ
              thông báo qua ứng dụng hoặc email trước khi áp dụng.
            </p>
          </Section>

          <Section id="lien-he" title="10. Liên hệ">
            <p>
              Mọi câu hỏi về chính sách này hoặc về dữ liệu cá nhân của bạn, vui lòng liên hệ:
            </p>
            <p>
              Email:{' '}
              <a className="font-bold text-indigo-700 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
            </p>
          </Section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
