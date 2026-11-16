# TVD – HỆ THỐNG THI ONLINE

Bộ mã nguồn triển khai ứng dụng thi trực tuyến trên GitHub Pages, dùng Google Apps Script làm API và Google Sheets làm nơi lưu đề thi, lượt làm bài, kết quả.

## 1. Tệp trong bộ cài

| Tệp | Công dụng |
|---|---|
| `index.html` | Khung trang web |
| `styles.css` | Giao diện máy tính, điện thoại và máy tính bảng |
| `app.js` | Đăng nhập giáo viên, tạo đề, làm bài, chấm điểm, xuất bảng điểm |
| `Code.gs` | API phía máy chủ Google Apps Script |
| `README.md` | Hướng dẫn cài đặt và vận hành |
| `.nojekyll` | Giúp GitHub Pages phục vụ tệp tĩnh ổn định |
| `Mau_Ngan_Hang_Cau_Hoi_TVD.csv` | Mẫu nhập câu hỏi bằng Excel/CSV |
| `Mau_Ngan_Hang_Cau_Hoi_TVD.json` | Mẫu nhập câu hỏi bằng JSON |
| `CHANGELOG_1.2.0.md` | Nhật ký nâng cấp |

## 2. Chức năng

### Giáo viên
- Đăng nhập bằng tên và mã truy cập được cấu hình trong Apps Script.
- Tạo, sửa, mở/đóng và xóa từng đợt kiểm tra.
- Thiết lập tên đợt, lớp, thời lượng, giờ mở và giờ đóng.
- Tạo câu hỏi thủ công hoặc nhập ngân hàng câu hỏi từ DOCX, PDF có văn bản, XLSX/XLS, CSV, JSON và TXT; xem trước và tự cập nhật câu trùng.
- Chọn câu hỏi đã lưu trong ngân hàng để tái sử dụng ở nhiều đợt kiểm tra.
- Thiết lập điểm từng câu; câu trả lời ngắn hỗ trợ dung sai số.
- Sao chép đường link có kèm cấu hình máy chủ để gửi qua Zalo.
- Xem kết quả theo từng đợt; tải danh sách CSV có BOM, mở trực tiếp bằng Microsoft Excel.

### Học sinh
- Mở link trên điện thoại, máy tính hoặc máy tính bảng.
- Nhập họ tên, lớp và mã học sinh (khuyến nghị).
- Máy chủ cấp lượt thi và thời hạn làm bài; đồng hồ đếm ngược dựa trên thời gian máy chủ.
- Nộp bài thủ công hoặc tự động khi hết giờ.
- Học sinh không nhận đáp án chuẩn và không được hiển thị điểm ngay sau khi nộp.

### Máy chủ
- Lưu đợt kiểm tra, lượt thi và bài nộp tập trung trong Google Sheets.
- Chấm điểm tại Apps Script, không tin điểm do trình duyệt học sinh gửi lên.
- Không trả đáp án chuẩn trong API công khai dành cho học sinh.
- Kiểm tra thời gian mở/đóng, hạn làm bài và lượt nộp trùng theo mã học sinh; nếu không nhập mã học sinh, hệ thống đối chiếu họ tên + lớp. Mỗi học sinh chỉ được cấp một lượt bắt đầu trong một đợt; nếu hết giờ mà chưa nộp, lượt đó không thể tự khởi động lại.

## 3. Đưa mã nguồn lên GitHub Pages

1. Đăng nhập GitHub và tạo repository mới, ví dụ `tvd-thi-online`.
2. Giải nén gói ZIP trên máy tính; các tệp `index.html`, `app.js`, `styles.css`, `Code.gs`, `README.md`, `.nojekyll` và `VERSION.txt` sẽ nằm ở thư mục vừa giải nén.
3. Mở repository vừa tạo, chọn **Add file → Upload files**.
4. Tải tất cả các tệp vừa giải nén lên **thư mục gốc repository**. Không chỉ tải tệp ZIP lên.
5. Nhấn **Commit changes**.
6. Mở **Settings → Pages**.
7. Ở **Build and deployment**, chọn **Deploy from a branch**.
8. Chọn branch `main`, folder `/ (root)`, rồi nhấn **Save**.
9. Chờ GitHub Pages xuất hiện địa chỉ website dạng `https://TEN-TAI-KHOAN.github.io/tvd-thi-online/`.
10. Mở địa chỉ đó để kiểm tra trang đăng nhập.

Nếu website báo không tìm thấy trang, kiểm tra `index.html`, `app.js`, `styles.css` có nằm cùng ở thư mục gốc hay không. Không đổi tên các tệp.

## 4. Tạo Google Sheets làm cơ sở dữ liệu

1. Đăng nhập tài khoản Google dự kiến dùng để quản lý dữ liệu.
2. Tạo một Google Spreadsheet mới, ví dụ `CSDL TVD Thi Online`.
3. Sao chép ID của bảng tính trong địa chỉ trình duyệt. ID là phần nằm giữa `/d/` và `/edit`.

Ví dụ địa chỉ:

`https://docs.google.com/spreadsheets/d/1AbC...XyZ/edit`

ID là `1AbC...XyZ`.

Không cần tự tạo các trang tính. Apps Script tự tạo ba trang `Exams`, `Attempts`, `Results` ở lần chạy đầu.

## 5. Cài Apps Script làm máy chủ

1. Mở Google Spreadsheet vừa tạo.
2. Chọn **Extensions → Apps Script**.
3. Trong trình soạn thảo Apps Script, mở tệp `Code.gs` mặc định, xóa mã cũ.
4. Mở tệp `Code.gs` trong bộ cài trên máy tính, sao chép toàn bộ nội dung và dán vào Apps Script.
5. Ở phần đầu mã, sửa hai dòng:

```javascript
SPREADSHEET_ID: 'DAN_ID_GOOGLE_SHEET_VAO_DAY',
TEACHER_TOKEN: 'THAY_BANG_MOT_MA_BI_MAT_DAI_IT_NHAT_24_KY_TU',
```

- Thay `SPREADSHEET_ID` bằng ID Google Sheets ở bước 4.
- Thay `TEACHER_TOKEN` bằng một mật khẩu truy cập riêng, dài và khó đoán. Có thể dùng tối thiểu 24 ký tự gồm chữ hoa, chữ thường và số.
- Không chia sẻ mã này trong nhóm Zalo học sinh hoặc đưa vào mã nguồn GitHub. Chỉ sửa mã trong Apps Script; giữ bản `Code.gs` trên GitHub ở trạng thái chưa điền bí mật.

6. Nhấn **Save**.
7. Chọn **Deploy → New deployment**.
8. Nhấn biểu tượng bánh răng **Select type** và chọn **Web app**.
9. Chọn:
   - **Execute as:** Me.
   - **Who has access:** Anyone, nếu tài khoản/trường cho phép.
10. Nhấn **Deploy** và chấp thuận quyền truy cập Google Sheets theo hướng dẫn.
11. Sao chép **Web app URL** kết thúc bằng `/exec`.

**Quan trọng:** ứng dụng học sinh cần truy cập API mà không phải đăng nhập Google. Nếu tài khoản Google Workspace của trường không cho chọn quyền `Anyone`, cần nhờ quản trị viên cho phép hoặc dùng tài khoản triển khai phù hợp. Không chọn chế độ chỉ mình người triển khai được truy cập vì học sinh sẽ không nộp bài được.

## 6. Kết nối GitHub Pages với máy chủ

1. Mở website GitHub Pages đã tạo.
2. Tại màn hình đăng nhập, nhập tên giáo viên.
3. Nhập đúng `TEACHER_TOKEN` đã đặt trong `Code.gs`.
4. Dán Web app URL `/exec` vào ô URL máy chủ.
5. Nhấn **Đăng nhập hệ thống**.
6. Nếu đăng nhập thành công và thấy trang Tổng quan, kết nối đã hoạt động.

URL máy chủ được lưu trong trình duyệt giáo viên. Mã truy cập không được lưu lâu dài; khi đăng xuất hoặc mở phiên trình duyệt mới, giáo viên nhập lại mã.

## 7. Quy trình tạo và tổ chức một đợt kiểm tra

1. Chọn **Tạo đề kiểm tra**.
2. Điền tên đợt, lớp, thời lượng, thời điểm bắt đầu/kết thúc và trạng thái.
3. Thêm câu hỏi, chọn dạng câu hỏi, nhập nội dung, phương án, đáp án và điểm.
4. Với câu trắc nghiệm, đáp án nhập A, B, C hoặc D.
5. Với câu đúng/sai, đáp án nhập Đ hoặc S.
6. Với câu trả lời ngắn, nhập đáp án chuẩn; nếu là số gần đúng, khai báo dung sai phù hợp (ví dụ `0.01`).
7. Nhấn **Lưu đợt kiểm tra**.
8. Vào **Đợt kiểm tra**, nhấn **Link** để sao chép link và thông tin gửi học sinh.
9. Gửi nội dung đã sao chép vào nhóm Zalo lớp. Link đã kèm URL máy chủ nên học sinh không phải tự cài đặt gì.
10. Giáo viên có thể đóng đợt kiểm tra khi kết thúc.

## 8. Xem và tải bảng điểm

1. Chọn **Kết quả học sinh**.
2. Chọn đợt kiểm tra cần xem.
3. Kiểm tra họ tên, lớp, mã học sinh, điểm và thời gian nộp.
4. Nhấn **Tải bảng điểm CSV**.
5. Mở tệp CSV bằng Excel. Nếu Excel hỏi định dạng, chọn UTF-8 hoặc mở bằng **Data → From Text/CSV** và chọn UTF-8.

## 9. Cập nhật khi sửa mã nguồn

- Khi sửa giao diện trên GitHub, chỉ cần commit các tệp mới; GitHub Pages sẽ tự triển khai lại.
- Khi sửa `Code.gs`, mở Apps Script, dán mã mới, Save, rồi vào **Deploy → Manage deployments → Edit**. Chọn **New version** và Deploy. Nếu tạo deployment mới, phải cập nhật URL API trong ứng dụng giáo viên.
- Nếu thay mã truy cập, giáo viên phải đăng nhập lại bằng mã mới.

## 10. Kiểm thử trước khi dùng kiểm tra thật

Nên tạo một đợt thử nghiệm với 3 câu (mỗi dạng một câu), sau đó:

1. Dùng tài khoản giáo viên tạo đề và lưu.
2. Sao chép link, mở bằng cửa sổ ẩn danh hoặc điện thoại khác.
3. Nộp thử bằng một mã học sinh kiểm thử.
4. Kiểm tra bài nộp đã xuất hiện trong trang `Results` của Google Sheets.
5. Kiểm tra giáo viên xem được điểm và tải được CSV.
6. Thử nộp lần thứ hai cùng mã học sinh để xác nhận hệ thống từ chối bài trùng.
7. Thử đóng đợt rồi mở link học sinh để xác nhận hệ thống từ chối làm bài.

Chỉ tổ chức bài kiểm tra thật sau khi hoàn tất các bước kiểm tra trên.

## 11. Nhập đề / câu hỏi từ tệp – Ngân hàng câu hỏi (phiên bản 1.2.0)

Trong giao diện giáo viên, mở **Ngân hàng câu hỏi** → chọn tệp → **Đọc tệp và xem trước** → kiểm tra số câu hợp lệ / lỗi → **Cập nhật ngân hàng**. Câu hỏi được lưu trên Google Sheets, trong sheet `Bank` (sheet được tạo tự động khi nhập lần đầu).

### Định dạng hỗ trợ
- `.xlsx`, `.xls`: đọc các sheet có bảng cột tiêu đề.
- `.csv`: đọc bảng có dòng tiêu đề.
- `.json`: mảng câu hỏi hoặc `{ "questions": [...] }`.
- `.docx`: trích xuất văn bản; cần viết theo mẫu `Câu 1. ...`, dòng `A. ...` đến `D. ...`, `Đáp án: B`, `Điểm: 1`, `Lời giải: ...`.
- `.pdf`: chỉ trích xuất được PDF có lớp văn bản; PDF scan/ảnh không có OCR trong bản này.
- `.txt`: cùng cú pháp câu hỏi như DOCX.

### Mẫu bảng Excel / CSV
Tệp mẫu tải trực tiếp trong ứng dụng hoặc dùng các cột sau:

| Câu hỏi | Dạng | Điểm | A | B | C | D | Đáp án | Dung sai | Lời giải |
|---|---|---:|---|---|---|---|---|---:|---|
| Giá trị của 2+3 bằng bao nhiêu? | mcq | 1 | 4 | 5 | 6 | 7 | B | 0 | Vì 2+3=5 |
| Số 0 là số dương. | truefalse | 1 | | | | | S | 0 | Số 0 không phải số dương |
| Tính 3^2. | short | 1 | | | | | 9 | 0.01 | 3^2=9 |

Giá trị ở cột **Dạng**: `mcq`, `truefalse`, `short` (hoặc tên dạng tiếng Việt tương ứng). Với câu trắc nghiệm cần đủ phương án A/B/C/D và đáp án là một trong A/B/C/D. Với đúng/sai nhập đáp án `Đ` hoặc `S`. Trả lời ngắn có thể khai báo dung sai số.

### Cú pháp Word / TXT / PDF có văn bản

```text
Câu 1. Giá trị của 2+3 bằng bao nhiêu?
A. 4
B. 5
C. 6
D. 7
Đáp án: B
Điểm: 1
Lời giải: Vì 2+3=5.

Câu 2. Số 0 là số dương.
Đáp án: S
Điểm: 1
```

### Quy tắc tự động cập nhật
Hệ thống coi hai câu là trùng nếu **nội dung câu hỏi sau chuẩn hóa khoảng trắng/chữ hoa-thường và dạng câu hỏi** giống nhau. Khi trùng, thông tin phương án, đáp án, điểm, dung sai và lời giải được cập nhật theo tệp mới; nếu chưa có thì thêm câu mới. Tính năng không tự suy luận đáp án từ một đề Word/PDF không có đáp án; các câu đủ nội dung nhưng thiếu đáp án vẫn được lưu ở trạng thái cần bổ sung. Khi đưa vào đề kiểm tra, giáo viên phải điền đáp án trước khi lưu đợt thi.

### Lưu ý với công thức Toán học
- Tệp Word `.docx` và PDF có văn bản được trích xuất dưới dạng văn bản thường. Công thức MathType, hình vẽ, bảng biến thiên, ký hiệu đặc biệt hoặc nội dung đặt trong ảnh có thể không được trích xuất đúng.
- Luôn xem trước và đối chiếu lại công thức, đáp án, điểm trước khi đưa câu hỏi vào đề chính thức.
- Trình đọc XLSX/DOCX/PDF tải thư viện mã nguồn mở từ CDN khi mở tính năng nhập tệp, vì vậy cần kết nối Internet.

### Cập nhật lên GitHub sau khi thay bộ mã
1. Giải nén gói TVD phiên bản mới.
2. Trong GitHub repository chọn **Add file → Upload files**.
3. Tải các tệp mới đè lên `index.html`, `app.js`, `styles.css`, `Code.gs`, `README.md`, `VERSION.txt`, `.nojekyll`.
4. Commit changes. Mở lại website và nhấn Ctrl+F5 để tải bản mới.
5. **Quan trọng:** mở Apps Script, thay toàn bộ mã cũ bằng `Code.gs` mới trong gói, Save → Deploy → Manage deployments → Edit (biểu tượng bút chì) → chọn New version → Deploy. Giữ nguyên URL `/exec`; không tạo deployment URL mới nếu không cần.
6. Mở TVD, đăng xuất/đăng nhập lại, vào Ngân hàng câu hỏi để nhập tệp. Sheet `Bank` sẽ tự được tạo khi import câu đầu tiên.


## 12. Giới hạn và khuyến nghị vận hành

Đây là bản triển khai thực tế quy mô nhỏ/nhóm lớp dựa trên GitHub Pages + Google Apps Script + Google Sheets, chưa phải nền tảng thi quy mô lớn có chứng nhận an toàn thông tin.

- Phiên bản hiện tại dùng **một mã truy cập chung cho giáo viên**; chưa có tài khoản riêng từng giáo viên, phân quyền tổ chuyên môn hoặc nhật ký quản trị chi tiết.
- Mã truy cập được gửi tới API khi giáo viên đọc danh sách/điểm. Không chia sẻ URL phiên giáo viên hoặc mã truy cập. Nếu nghi ngờ lộ mã, hãy đổi `TEACHER_TOKEN` và triển khai phiên bản mới.
- Học sinh không cần đăng nhập; nếu không có mã học sinh, hệ thống chống nộp trùng dựa trên họ tên + lớp nên có thể bị ảnh hưởng bởi cách viết tên khác nhau. Nên yêu cầu học sinh nhập mã học sinh thống nhất.
- Chấm điểm tự động hiện hỗ trợ ba dạng nêu trên. Với câu trả lời ngắn dạng số, dung sai được tính theo giá trị số; biểu thức đại số tương đương, phân số khác cách viết hoặc lời giải tự luận cần chấm thủ công/chức năng nâng cấp.
- CSV mở được bằng Excel nhưng không phải tệp `.xlsx` gốc.
- Sau khi có lượt thi đầu tiên, nội dung câu hỏi, lớp, thời lượng và lịch mở/đóng của đợt được khóa để tránh thay đổi đáp án giữa kỳ thi; giáo viên vẫn có thể đóng/mở đợt. Muốn đổi nội dung, hãy tạo đợt mới.
- Google Apps Script và Sheets có hạn mức theo tài khoản và giới hạn hiệu năng; cần kiểm thử số lượng học sinh đồng thời. Với kỳ thi toàn trường hoặc nhiều trường, nên chuyển sang backend chuyên dụng như Firebase/Supabase hoặc máy chủ riêng có đăng nhập, phân quyền, sao lưu và giám sát.
- Chưa có chống gian lận nâng cao như khóa trình duyệt, giám sát webcam, đảo câu/phương án, phát hiện chuyển tab, chặn chụp màn hình hoặc xác minh danh tính.
- Cần sao lưu Google Sheet định kỳ; không xóa trang `Exams`, `Attempts`, `Results` khi hệ thống đang vận hành.
- Không lưu thông tin nhạy cảm không cần thiết của học sinh.

## 13. Xử lý một số lỗi thường gặp

**A. Giáo viên đăng nhập báo mã truy cập sai**
- Kiểm tra lại `TEACHER_TOKEN` trong `Code.gs`.
- Sau khi sửa mã, Save và Deploy bản New version.
- Nhập mã mới tại màn hình đăng nhập.

**B. Báo không truy cập được máy chủ**
- Kiểm tra URL đúng là Web app URL kết thúc bằng `/exec`.
- Kiểm tra Apps Script đã Deploy và quyền truy cập cho phép người học truy cập.
- Mở URL `/exec?action=health` trong trình duyệt; nếu triển khai đúng sẽ nhận phản hồi JSON về trạng thái TVD.

**C. Học sinh mở link nhưng không thấy đề**
- Giáo viên cần tạo link bằng nút **Link** trong ứng dụng sau khi đã kết nối máy chủ.
- Không tự xóa tham số `exam` hoặc `api` ở cuối link.
- Kiểm tra đợt kiểm tra chưa đóng và thời điểm mở/đóng chính xác.

**D. Giáo viên không thấy điểm**
- Kiểm tra trang `Results` trong Google Sheets có dòng mới hay không.
- Đảm bảo giáo viên đăng nhập đúng mã truy cập.
- Đợi một lúc rồi tải lại mục Kết quả học sinh.

**E. Sửa Apps Script nhưng ứng dụng vẫn chạy mã cũ**
- Vào **Deploy → Manage deployments → Edit → New version → Deploy**.
- Không chỉ nhấn Save trong trình soạn thảo; phải cập nhật deployment đang sử dụng.
