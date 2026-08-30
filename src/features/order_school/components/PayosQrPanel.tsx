import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy } from 'lucide-react'
import type { BankTransferDetails } from '@/shared/payment/types'
import { formatVnd } from '../format'

type PayosQrPanelProps = {
  checkoutUrl: string | null
  qrCode: string
  transfer: BankTransferDetails | null
}

type CopyRowProps = {
  emphasis?: boolean
  label: string
  mono?: boolean
  value: string
}

function CopyRow({ emphasis = false, label, mono = false, value }: CopyRowProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard bị chặn (http, quyền bị từ chối). Không sao — số vẫn hiện đầy đủ để gõ tay,
      // và báo lỗi ở đây chỉ làm người dùng hoang mang giữa lúc đang trả tiền.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-b-0">
      <span className={`text-[12.5px] ${emphasis ? 'font-bold text-amber-800' : 'text-slate-500'}`}>{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={[
            mono ? 'font-mono' : '',
            emphasis ? 'text-[15px] font-semibold text-amber-800' : 'text-[13px] font-semibold text-blue-950',
            'tabular-nums',
          ].join(' ')}
        >
          {value}
        </span>
        <button
          aria-label={`Sao chép ${label.toLowerCase()}`}
          className={`inline-flex size-6.5 shrink-0 items-center justify-center rounded-[7px] border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
            emphasis
              ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-indigo-700'
          }`}
          onClick={() => void handleCopy()}
          type="button"
        >
          {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
        </button>
      </div>
    </div>
  )
}

/**
 * Mã VietQR hiện ngay trong ứng dụng, kèm đường chuyển khoản tay.
 *
 * <p>Phần chuyển khoản tay KHÔNG phải cho có: một mã không quét được là chuyện thường (camera kém,
 * app cũ, ảnh chụp màn hình), và lúc đó bộ số này là thứ duy nhất cứu được giao dịch.
 *
 * <p>Nội dung chuyển khoản được tách riêng và làm nổi bật vì nó là khoá khớp tiền với đơn — gõ sai
 * thì tiền vẫn về tài khoản nhưng không đơn nào nhận, và hệ thống không có luồng hoàn tiền nào.
 */
export function PayosQrPanel({ checkoutUrl, qrCode, transfer }: PayosQrPanelProps) {
  return (
    <div className="mt-5 grid gap-6 border-t border-slate-200 pt-5 lg:grid-cols-[auto_minmax(0,1fr)]">
      <div className="flex flex-col items-center gap-2.5">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <QRCodeSVG level="M" marginSize={0} size={188} value={qrCode} />
        </div>
        <p className="max-w-52 text-center text-xs leading-relaxed text-slate-500">
          Mở app ngân hàng, chọn <strong className="font-semibold text-slate-700">Quét QR</strong> rồi quét mã này.
        </p>
      </div>

      {transfer ? (
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[13.5px] font-bold text-blue-950">Hoặc chuyển khoản thủ công</h3>
            <span className="text-[11.5px] text-slate-400">Dùng khi app không quét được</span>
          </div>

          <div className="mt-2.5">
            {transfer.accountName ? <CopyRow label="Chủ tài khoản" value={transfer.accountName} /> : null}
            {transfer.accountNumber ? (
              <CopyRow label="Số tài khoản" mono value={transfer.accountNumber} />
            ) : null}
            {transfer.amountVnd != null ? (
              <CopyRow label="Số tiền" value={formatVnd(transfer.amountVnd)} />
            ) : null}
          </div>

          {transfer.transferContent ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
              <CopyRow emphasis label="Nội dung chuyển khoản" mono value={transfer.transferContent} />
              <p className="mt-2 text-[11.5px] leading-relaxed text-amber-700">
                Giữ NGUYÊN nội dung này. Đây là thứ duy nhất khớp khoản tiền với đơn của trường — gõ sai thì tiền về
                nhưng đơn vẫn treo, phải đối soát tay.
              </p>
            </div>
          ) : null}

          {checkoutUrl ? (
            <a
              className="mt-3 inline-block text-[12.5px] font-semibold text-indigo-600 transition hover:text-indigo-800"
              href={checkoutUrl}
              rel="noreferrer"
              target="_blank"
            >
              Mở trang thanh toán của PayOS →
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
