# TVD 1.5.0 – Nhận dạng cấu trúc đề, đáp án và hình ảnh

## Bổ sung
- Tự nhận diện PHẦN I/II/III/IV và gán loại câu hỏi mặc định theo phần.
- Phân tích đáp án dạng `Câu 1: B`, `1. B`, nhiều cặp trên cùng dòng và bảng đáp án hai dòng; ghép theo số câu và phần khi có thể.
- Nhận diện câu đúng/sai có các mệnh đề a–d, tạo loại `tf_multi`; học sinh chọn Đúng/Sai riêng từng ý và máy chủ chấm điểm từng ý theo tỷ lệ điểm của câu.
- Đọc DOCX qua HTML, bảo toàn ảnh raster nhúng dưới dạng ảnh trong nội dung.
- Khi nhập PDF, giữ ảnh chụp trang đối với trang có image operator để không mất hình/biểu đồ; ảnh trang được gắn vào câu cuối cùng nhận diện trên trang đó, giáo viên cần đối chiếu vị trí.
- Hỗ trợ Ctrl+V ảnh trực tiếp vào ô nội dung câu hỏi.
- Ảnh trong chế độ trực tuyến được nén phía trình duyệt, tải lên Google Drive bằng Apps Script và lưu URL ngắn trong đề/Ngân hàng; học sinh mở link vẫn xem được.
- Thêm thông tin phần đề vào câu hỏi và hiển thị tiêu đề phần cho học sinh.

## Cài đặt bổ sung
- Thay `app.js`, `styles.css`, `index.html`, `Code.gs` trên GitHub/Apps Script.
- Apps Script dùng thêm sheet `Media` tự tạo. Cần cho phép DriveApp và chia sẻ ảnh ở chế độ Anyone with the link. Nếu chính sách Workspace chặn chia sẻ công khai, ảnh sẽ không thể hiển thị cho học sinh ngoài tổ chức.
- Sau khi cập nhật `Code.gs`, triển khai Apps Script bằng New version.

## Giới hạn cần rà soát
- Đây là nhận dạng theo cấu trúc/regex, không phải AI hiểu mọi bố cục tài liệu. Đáp án mơ hồ, câu đánh số lại theo phần, câu nhiều cột hoặc bố cục phức tạp cần xác nhận trong phần xem trước.
- Ảnh PDF được gắn dạng ảnh trang tham khảo chứ không tách chính xác từng hình khỏi trang. Với PDF scan, vẫn cần OCR để tách câu tự động; chưa có OCR trong bản này.
- Native Word OMML/MathType OLE không phải lúc nào cũng chuyển được thành LaTeX; nếu phương trình là ảnh, sẽ giữ ảnh; nếu đối tượng không được Mammoth trích xuất, cần chuyển thành ảnh hoặc chèn lại LaTeX.
- Ảnh tải lên Drive có quyền Anyone with the link: không dùng tệp có thông tin cá nhân hoặc nội dung không được phép chia sẻ.

## Bản vá kiểm tra trước phát hành
- Sửa phân biệt phương án MCQ viết hoa A–D và mệnh đề đúng/sai viết thường a–d, kể cả khi đề chưa có đáp án kèm theo.
- Mở rộng nhận dạng tiêu đề đáp án theo phần và bảng đáp án dạng nhiều cặp trong cùng hàng.
- Lưu ảnh trang PDF khi có cả toán tử ảnh raster hoặc toán tử vẽ vector, giúp giữ đồ thị/hình hình học được vẽ trực tiếp trong PDF.
- Nén ảnh DOCX/PDF lớn trước khi đưa vào Google Drive để giảm nguy cơ vượt giới hạn payload.
- Cập nhật API health version thành 1.5.0.
