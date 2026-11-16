# CẬP NHẬT TVD 1.5.0 LÊN GITHUB VÀ APPS SCRIPT

## A. Cập nhật website GitHub Pages
1. Giải nén `TVD_Thi_Online_GitHub_v1.5.0.zip`.
2. Mở repository `NguyenAnhTuanTVD`.
3. Chọn **Add file → Upload files**.
4. Mở thư mục `TVD_Thi_Online_1.5.0` vừa giải nén, kéo các tệp trong thư mục lên thư mục gốc repository (không kéo nguyên thư mục con).
5. Ghi đè tệp cùng tên: `index.html`, `app.js`, `styles.css`, `README.md`, `.nojekyll`, `VERSION.txt`; có thể tải thêm các tệp mẫu và CHANGELOG.
6. Nhấn **Commit changes**. GitHub Pages tự triển khai lại. Sau khi hoàn tất, mở website và nhấn `Ctrl + F5`.

## B. Cập nhật máy chủ Apps Script (bắt buộc để lưu ảnh cho học sinh)
1. Mở dự án Google Apps Script đang dùng với TVD.
2. Mở `Code.gs` trong gói 1.5.0, sao chép toàn bộ và thay mã cũ.
3. Giữ nguyên hai giá trị riêng của hệ thống hiện tại: `SPREADSHEET_ID` và `TEACHER_TOKEN`. Không lấy giá trị mẫu trong ZIP để ghi đè mã thật.
4. Nhấn **Save**.
5. Chọn **Deploy → Manage deployments → Edit**.
6. Ở Version, chọn **New version**, rồi **Deploy**. Giữ URL `/exec` hiện tại.
7. Khi Google hỏi quyền, chấp thuận quyền Google Sheets và Google Drive. Nếu dự án có khai báo `oauthScopes` thủ công trong manifest, cần có `https://www.googleapis.com/auth/spreadsheets` và `https://www.googleapis.com/auth/drive`.
8. Với ảnh cho học sinh ngoài tổ chức xem, tài khoản triển khai phải cho phép chia sẻ tệp Drive bằng **Anyone with the link – Viewer**. Nếu quản trị viên Workspace cấm chia sẻ kiểu này, ảnh sẽ không hiển thị cho học sinh bên ngoài miền trường.

## C. Kiểm tra sau cập nhật
- Giáo viên đăng nhập lại website bằng URL Apps Script hiện tại.
- Nhập một DOCX có ảnh, công thức và bảng câu hỏi; kiểm tra xem trước.
- Thử một đề có `PHẦN I`, `PHẦN II`, `PHẦN III`; kiểm tra đáp án cuối đề.
- Thử PHẦN II có các ý `a)`–`d)` nhưng chưa có đáp án; kiểm tra vẫn nhận dạng thành đúng/sai nhiều ý.
- Dán một ảnh bằng `Ctrl + V` vào ô nội dung câu hỏi.
- Lưu đề, mở link học sinh bằng điện thoại khác và xác nhận ảnh hiển thị; nộp thử và kiểm tra kết quả.

## D. Giới hạn cần biết
- Nhận dạng đáp án là theo cấu trúc/heuristic; giáo viên phải đối chiếu đáp án được ghép tự động trước khi phát hành.
- PDF scan không có lớp chữ chưa có OCR; ảnh trang PDF được giữ như ảnh tham khảo, không tách chính xác từng hình khỏi trang.
- Công thức Word dạng OMML/MathType OLE không phải lúc nào chuyển được sang LaTeX. Nếu Word lưu công thức dưới dạng ảnh và bộ đọc trích xuất được thì ảnh được giữ; trường hợp khác cần nhập LaTeX hoặc chụp/chuyển công thức thành ảnh.
- Chức năng nhập tệp đọc được cấu trúc phổ biến, không đảm bảo xử lý mọi bố cục hai cột, bảng lồng, đề có nhiều mã đề trong cùng tệp hoặc tài liệu bị lỗi định dạng.
