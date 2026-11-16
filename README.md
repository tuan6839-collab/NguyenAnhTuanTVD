# Math.T — Hệ thống thi online dành cho giáo viên thời đại số

Ứng dụng web tĩnh (HTML5 + Tailwind CSS + Vanilla JS + KaTeX + Chart.js) mô phỏng trọn vẹn nền tảng tổ chức thi trực tuyến, quản lý lớp học và bộ công cụ Toán học THPT **Math.T**.

## Tính năng chính
1. **Trang chủ (Landing Page):** Giới thiệu hệ thống, lối tắt chơi trực tiếp trên máy chiếu, vào thi nhanh bằng mã đề.
2. **Đăng nhập & Thi ngay:** Chuyển đổi linh hoạt giữa cổng Giáo viên và cổng Thi ngay của Học sinh.
3. **Bảng điều khiển Giáo viên (Dashboard):**
   - Thống kê tổng quan 7 ngày qua, biểu đồ lượt thi 30 ngày, danh sách học sinh nộp bài gần đây và cảnh báo vi phạm.
   - **Đề của tôi & Tạo đề mới:** Hỗ trợ nhập công thức Toán học chuẩn LaTeX (`$...$`), xuất bản mã đề tức thì.
   - **Phòng thi trực tuyến (Học sinh):** Đồng hồ đếm ngược, bảng danh sách câu hỏi, tự động chấm điểm khi nộp bài và giám sát chống gian lận (phát hiện chuyển tab).
   - **Trộn đề tự động:** Hoán vị câu hỏi và đáp án thành nhiều mã đề kèm bảng đáp án tổng hợp, tải về file `.txt`.
   - **Convert iMath-Tex to Word:** Xem trước công thức Toán học và xuất trực tiếp ra file Word (`.doc`).
   - **Hình không gian 3D:** Mô phỏng xoay 360° hình chóp, hình lăng trụ, hình lập phương trực tiếp trên Canvas.

## Hướng dẫn đưa lên GitHub Pages để chạy trực tuyến
1. Tạo một repository mới trên GitHub (ví dụ: `math-t-online`).
2. Giải nén file `Math_T_GitHub_App.zip` và tải toàn bộ các file (`index.html`, `style.css`, `app.js`, `README.md`) lên thư mục gốc của repository.
3. Vào **Settings** → **Pages** → tại mục **Branch**, chọn `main` và thư mục `/ (root)` → nhấn **Save**.
4. Sau khoảng 1 phút, ứng dụng sẽ hoạt động trực tuyến tại địa chỉ `https://<ten-tai-khoan>.github.io/math-t-online/`.
