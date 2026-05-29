# vox — Design System

> Tài liệu này định nghĩa các quy tắc thiết kế dùng nhất quán xuyên suốt toàn bộ dự án: từ landing page, dashboard, đến các màn hình ứng dụng.

---

## 1. Thương hiệu

| | |
|---|---|
| Tên sản phẩm | `vox` (luôn viết thường) |
| Tagline | Đánh giá kỹ năng nói thông minh hơn |
| Tinh thần | Hiện đại · Tin cậy · Học thuật · Thân thiện · Công nghệ |

---

## 2. Bảng màu

### Màu chính

| Token | Hex | Dùng cho |
|-------|-----|----------|
| `primary` | `#4F46E5` | Nút chính, điểm nhấn, icon, đường viền nổi bật |
| `secondary` | `#06B6D4` | Trạng thái hoạt động, biểu đồ, hiệu ứng động |
| `accent` | `#8B5CF6` | Gradient, badge cao cấp, hiệu ứng AI |

### Màu nền

| Token | Hex | Dùng cho |
|-------|-----|----------|
| `background` | `#F8FAFC` | Nền tổng thể của tất cả màn hình sáng |
| `surface` | `#FFFFFF` | Card, modal, popover, sidebar |
| `dark` | `#0F172A` | Màn hình tối, hero section, navbar tối |

### Màu chữ & hệ thống

| Token | Hex | Dùng cho |
|-------|-----|----------|
| `text` | `#0F172A` | Nội dung chính, tiêu đề |
| `muted` | `#64748B` | Mô tả phụ, nhãn, placeholder |
| `border` | `#E2E8F0` | Viền card, divider, input |
| `success` | `#10B981` | Hoàn thành, thông báo tốt |
| `warning` | `#F59E0B` | Cảnh báo, trạng thái chờ |
| `danger` | `#EF4444` | Lỗi, xác nhận xóa |

### Token đầy đủ cho codebase

```js
// tailwind.config.js hoặc design-tokens.js
colors: {
  primary:    "#4F46E5",
  secondary:  "#06B6D4",
  accent:     "#8B5CF6",
  background: "#F8FAFC",
  surface:    "#FFFFFF",
  dark:       "#0F172A",
  text:       "#0F172A",
  muted:      "#64748B",
  border:     "#E2E8F0",
  success:    "#10B981",
  warning:    "#F59E0B",
  danger:     "#EF4444",
}
```

---

## 3. Typography

**Font chính:** `Be Vietnam Pro` — hiển thị tốt tiếng Việt, thân thiện, hiện đại.  
**Font thay thế:** `Inter` — dùng khi ưu tiên tốc độ load hoặc môi trường quốc tế.

```html
<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700&display=swap" rel="stylesheet">
```

### Type scale

| Cấp | Size | Weight | Line-height | Dùng cho |
|-----|------|--------|-------------|----------|
| `display` | `40px` | `700` | `1.2` | Hero heading |
| `h1` | `32px` | `700` | `1.25` | Page title |
| `h2` | `24px` | `700` | `1.3` | Section title |
| `h3` | `18px` | `500` | `1.4` | Card title, group header |
| `body` | `16px` | `400` | `1.7` | Nội dung chính |
| `small` | `14px` | `400` | `1.6` | Mô tả phụ |
| `caption` | `12px` | `400` | `1.5` | Nhãn, tag, meta |

---

## 4. Spacing

Dùng bội số của `4px`. Các giá trị phổ biến:

| Token | Value | Dùng cho |
|-------|-------|----------|
| `xs` | `4px` | Gap icon–text, padding pill |
| `sm` | `8px` | Gap nội bộ component |
| `md` | `16px` | Padding card nhỏ, gap giữa item |
| `lg` | `24px` | Padding card lớn, gap giữa section |
| `xl` | `40px` | Margin giữa các section |
| `2xl` | `64px` | Padding section trên mobile |
| `3xl` | `96px` | Padding section trên desktop |

---

## 5. Border Radius

| Token | Value | Dùng cho |
|-------|-------|----------|
| `sm` | `6px` | Badge, tag nhỏ |
| `md` | `10px` | Input, button |
| `lg` | `14px` | Card, modal |
| `xl` | `20px` | Card nổi bật, feature block |
| `full` | `9999px` | Pill button, avatar, chip |

---

## 6. Thành phần UI

### Nút bấm

**Primary** — dùng cho hành động chính trên mỗi màn hình
```css
background: linear-gradient(135deg, #4F46E5, #06B6D4);
color: #ffffff;
border-radius: 9999px;
padding: 10px 24px;
font-size: 15px;
font-weight: 500;
```

**Secondary** — hành động phụ, ít ưu tiên hơn
```css
background: #ffffff;
border: 1px solid #E2E8F0;
color: #4F46E5;
border-radius: 9999px;
padding: 10px 24px;
font-size: 15px;
font-weight: 500;
```

**Ghost** — dùng trong vùng tối hoặc nav
```css
background: transparent;
border: 1px solid rgba(255,255,255,0.2);
color: #ffffff;
border-radius: 9999px;
padding: 10px 24px;
```

### Card

**Card mặc định**
```css
background: #ffffff;
border: 1px solid #E2E8F0;
border-radius: 14px;
padding: 20px 24px;
```

**Card nổi bật** (feature, pricing)
```css
background: #ffffff;
border: 1.5px solid #4F46E5;
border-radius: 20px;
padding: 28px 32px;
```

### Form input

```css
background: #ffffff;
border: 1px solid #E2E8F0;
border-radius: 10px;
padding: 10px 14px;
font-size: 15px;
color: #0F172A;
/* focus */
border-color: #4F46E5;
outline: none;
box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
```

### Badge / Tag

```css
/* Mặc định */
background: #F1F5F9;
color: #475569;
border-radius: 9999px;
padding: 3px 10px;
font-size: 12px;
font-weight: 500;

/* Primary */
background: #EEF2FF;
color: #4F46E5;
```

---

## 7. Biểu tượng

Dùng **Tabler Icons** — outline, stroke `1.5`, kích thước `20px` mặc định.

```html
<!-- CDN -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">

<!-- Dùng -->
<i class="ti ti-microphone"></i>
```

### Kích thước chuẩn

| Ngữ cảnh | Size |
|----------|------|
| Inline trong text | `16px` |
| Nút, input | `18px` |
| Card icon | `20–24px` |
| Feature icon | `28–32px` |
| Hero / empty state | `40–48px` |

---

## 8. Phong cách giao diện

### Nguyên tắc chung

- **Sạch** — nhiều whitespace, không nhồi nhét thông tin
- **Nhất quán** — cùng spacing, radius, màu xuyên suốt
- **Phân cấp rõ** — tiêu đề nổi, mô tả mờ, CTA nổi bật
- **Không dùng shadow nặng** — thay bằng border `1px` nhẹ

### Layout

- Grid cơ sở: 12 cột, gutter `24px`
- Max-width nội dung: `1200px`
- Breakpoints: `sm 640px` · `md 768px` · `lg 1024px` · `xl 1280px`
- Padding ngang trang: `16px` (mobile) · `32px` (tablet) · `64px` (desktop)

### Hiệu ứng nên dùng

- Hover: `scale(1.02)` hoặc `opacity` nhẹ trên card
- Transition: `all 0.2s ease`
- Gradient nền section: xen kẽ `#F8FAFC` và `#FFFFFF`
- Decoration: vòng tròn blur gradient ở góc, không che nội dung

### Không nên dùng

- `box-shadow` dày, nhiều lớp
- Animation quá phức tạp, gây xao nhãng
- Quá nhiều màu trong một màn hình (tối đa 3 màu nổi)
- Font size dưới `12px`

---

## 9. Giọng văn & nội dung

**Tông:** Tin cậy · Hiện đại · Ngắn gọn · Không phô trương

### Quy tắc viết

- Ưu tiên lợi ích cụ thể, không nói chung chung
- Câu ngắn, mỗi câu một ý
- Không dùng buzzword quá lớn

### Ví dụ

| Không nên | Nên dùng |
|-----------|---------|
| "Cách mạng hóa giáo dục" | "Chấm điểm nhanh hơn, minh bạch hơn" |
| "AI tốt nhất thị trường" | "Phân tích giọng nói tự động" |
| "Thay thế hoàn toàn giáo viên" | "Hỗ trợ giáo viên tiết kiệm thời gian" |
| "Hoàn hảo tuyệt đối" | "Tiêu chí đánh giá rõ ràng" |

---

## 10. Checklist trước khi ship

- [ ] Màu dùng đúng token, không hardcode hex lẻ
- [ ] Font weight chỉ dùng `400`, `500`, `700`
- [ ] Border radius nhất quán theo scale
- [ ] Mọi icon cùng bộ Tabler, cùng stroke
- [ ] Nút chính mỗi màn hình chỉ có một
- [ ] Contrast chữ/nền đạt tối thiểu WCAG AA
- [ ] Responsive kiểm tra đủ 3 breakpoint
- [ ] Không có text dưới `12px`
