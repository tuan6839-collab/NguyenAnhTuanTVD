/*********************** TVD – GOOGLE APPS SCRIPT API ************************
 * 1) Tao mot Google Sheet rieng cho he thong.
 * 2) Dien SPREADSHEET_ID va TEACHER_TOKEN ben duoi.
 * 3) Deploy > New deployment > Web app, Execute as: Me.
 * 4) Giao dien doc du lieu bang JSONP va gui thao tac ghi bang POST text/plain.
 ******************************************************************************/
const TVD_CONFIG = {
  SPREADSHEET_ID: 'DAN_ID_GOOGLE_SHEET_VAO_DAY',
  TEACHER_TOKEN: 'THAY_BANG_MOT_MA_BI_MAT_DAI_IT_NHAT_24_KY_TU',
  MAX_REQUEST_BYTES: 500000,
  MAX_QUESTIONS: 200,
  MAX_DURATION_MINUTES: 300,
  MAX_BANK_IMPORT: 150
};

const TVD_HEADERS = {
  Exams: ['id', 'json'],
  Results: ['id', 'examId', 'studentKey', 'json'],
  Attempts: ['attemptId', 'examId', 'studentKey', 'startedAt', 'expiresAt', 'name', 'className', 'studentId', 'status'],
  Bank: ['id', 'questionKey', 'json', 'createdAt', 'updatedAt']
};

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = String(params.action || '');
  try {
    let result;
    switch (action) {
      case 'health':
        result = { ok: true, app: 'TVD', version: '1.2', time: new Date().toISOString() };
        break;
      case 'get':
        result = getPublicExam_(params.id);
        break;
      case 'start':
        result = startAttempt_(params);
        break;
      case 'receipt':
        result = { received: !!findResultById_(params.id) };
        break;
      case 'list':
        requireTeacher_(params.token);
        result = listExamSummaries_();
        break;
      case 'teacherGet':
        requireTeacher_(params.token);
        result = getExam_(params.id);
        break;
      case 'results':
        requireTeacher_(params.token);
        result = getResults_(params.examId);
        break;
      case 'bankList':
        requireTeacher_(params.token);
        result = listBankQuestions_();
        break;
      default:
        throw new Error('Lệnh GET không hợp lệ.');
    }
    return jsonpResponse_(params.callback, result);
  } catch (err) {
    return jsonpResponse_(params.callback, { error: safeMessage_(err) });
  }
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
    if (!raw) throw new Error('Không nhận được dữ liệu gửi lên.');
    if (raw.length > TVD_CONFIG.MAX_REQUEST_BYTES) throw new Error('Dữ liệu gửi lên vượt quá giới hạn cho phép.');
    const request = JSON.parse(raw);
    const action = String(request.action || '');
    const data = request.data || {};
    let result;
    switch (action) {
      case 'save':
        requireTeacher_(request.token);
        saveExam_(data);
        result = { ok: true };
        break;
      case 'delete':
        requireTeacher_(request.token);
        deleteExam_(data.id);
        result = { ok: true };
        break;
      case 'bankImport':
        requireTeacher_(request.token);
        result = importBankQuestions_(data.questions || []);
        break;
      case 'bankDelete':
        requireTeacher_(request.token);
        deleteBankQuestion_(data.id);
        result = { ok: true };
        break;
      case 'submit':
        result = submitResult_(data);
        break;
      default:
        throw new Error('Lệnh POST không hợp lệ.');
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: safeMessage_(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function jsonpResponse_(callback, data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  if (callback) {
    const cb = String(callback);
    if (!/^__tvd_jsonp_[a-z0-9_]+$/i.test(cb)) throw new Error('Tên callback không hợp lệ.');
    return ContentService.createTextOutput(cb + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function safeMessage_(err) {
  return String((err && err.message) || err || 'Có lỗi máy chủ.').slice(0, 500);
}

function requireTeacher_(token) {
  if (!TVD_CONFIG.TEACHER_TOKEN || TVD_CONFIG.TEACHER_TOKEN.indexOf('THAY_BANG_') === 0) {
    throw new Error('Quản trị viên chưa cấu hình mã truy cập giáo viên trong Code.gs.');
  }
  if (!token || String(token) !== TVD_CONFIG.TEACHER_TOKEN) throw new Error('Mã truy cập giáo viên không đúng.');
}

function spreadsheet_() {
  if (!TVD_CONFIG.SPREADSHEET_ID || TVD_CONFIG.SPREADSHEET_ID.indexOf('DAN_ID_') === 0) {
    throw new Error('Chưa cấu hình SPREADSHEET_ID trong Code.gs.');
  }
  return SpreadsheetApp.openById(TVD_CONFIG.SPREADSHEET_ID);
}

function sheet_(name) {
  const ss = spreadsheet_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(TVD_HEADERS[name]);
    sh.setFrozenRows(1);
  } else if (sh.getLastRow() === 0) {
    sh.appendRow(TVD_HEADERS[name]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function rows_(name) {
  const sh = sheet_(name);
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, TVD_HEADERS[name].length).getValues();
}

function listAllExams_() {
  return rows_('Exams').map(row => {
    try { return JSON.parse(row[1]); } catch (_) { return null; }
  }).filter(Boolean);
}

function getExam_(id) {
  if (!id) return null;
  return listAllExams_().find(ex => ex.id === String(id)) || null;
}

function listExamSummaries_() {
  return listAllExams_().map(ex => ({
    id: ex.id,
    title: ex.title,
    className: ex.className,
    duration: ex.duration,
    status: ex.status,
    created: ex.created,
    updatedAt: ex.updatedAt,
    startAt: ex.startAt,
    endAt: ex.endAt,
    questionCount: (ex.questions || []).length
  })).sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
}

function getPublicExam_(id) {
  const ex = getExam_(id);
  if (!ex) return null;
  examIsOpen_(ex);
  return {
    id: ex.id,
    title: ex.title,
    className: ex.className,
    duration: ex.duration,
    status: ex.status,
    startAt: ex.startAt,
    endAt: ex.endAt,
    questions: (ex.questions || []).map(q => ({
      id: q.id,
      text: q.text,
      type: q.type,
      point: q.point,
      options: q.options || {}
      // Tuyet doi khong gui answer, tolerance hoac explain cho trinh duyet hoc sinh.
    }))
  };
}

function validateExam_(ex) {
  if (!ex || !ex.id || !String(ex.title || '').trim() || !String(ex.className || '').trim()) {
    throw new Error('Thiếu mã đề, tên đợt kiểm tra hoặc lớp.');
  }
  const duration = Number(ex.duration);
  if (!(duration >= 1 && duration <= TVD_CONFIG.MAX_DURATION_MINUTES)) throw new Error('Thời lượng phải từ 1 đến 300 phút.');
  if (!Array.isArray(ex.questions) || ex.questions.length < 1 || ex.questions.length > TVD_CONFIG.MAX_QUESTIONS) {
    throw new Error('Số câu hỏi phải từ 1 đến ' + TVD_CONFIG.MAX_QUESTIONS + '.');
  }
  if (ex.startAt && ex.endAt && new Date(ex.startAt).getTime() >= new Date(ex.endAt).getTime()) {
    throw new Error('Thời điểm kết thúc phải sau thời điểm bắt đầu.');
  }
  let total = 0;
  ex.questions.forEach((q, index) => {
    const n = index + 1;
    if (!q.id || !String(q.text || '').trim() || !String(q.answer ?? '').trim()) throw new Error('Câu ' + n + ' thiếu nội dung hoặc đáp án.');
    const point = Number(q.point);
    if (!(point > 0 && point <= 100)) throw new Error('Điểm câu ' + n + ' không hợp lệ.');
    total += point;
    if (q.type === 'mcq') {
      const options = q.options || {};
      if (!['A', 'B', 'C', 'D'].every(k => String(options[k] || '').trim())) throw new Error('Câu ' + n + ' phải có đủ 4 phương án.');
      if (!['A', 'B', 'C', 'D'].includes(String(q.answer).toUpperCase())) throw new Error('Đáp án câu ' + n + ' phải là A, B, C hoặc D.');
    } else if (q.type === 'truefalse') {
      if (!['Đ', 'S'].includes(normalizeTF_(q.answer))) throw new Error('Đáp án câu ' + n + ' phải là Đ hoặc S.');
    } else if (q.type === 'short') {
      if (Number(q.tolerance || 0) < 0) throw new Error('Dung sai câu ' + n + ' không được âm.');
    } else {
      throw new Error('Dạng câu hỏi câu ' + n + ' không được hỗ trợ.');
    }
  });
  if (!(total > 0)) throw new Error('Tổng điểm đề thi không hợp lệ.');
}

function saveExam_(ex) {
  validateExam_(ex);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_('Exams');
    const rows = rows_('Exams');
    const index = rows.findIndex(row => String(row[0]) === String(ex.id));
    const safe = {
      id: String(ex.id), title: String(ex.title).trim(), className: String(ex.className).trim(),
      duration: Number(ex.duration), startAt: ex.startAt || '', endAt: ex.endAt || '',
      status: ex.status === 'closed' ? 'closed' : 'open', questions: ex.questions,
      created: ex.created || new Date().toISOString(), updatedAt: new Date().toISOString(), teacher: String(ex.teacher || '')
    };
    if (index >= 0) {
      const oldExam = JSON.parse(rows[index][1]);
      const hasStarted = rows_('Attempts').some(row => String(row[1]) === String(ex.id));
      const hasSubmitted = rows_('Results').some(row => String(row[1]) === String(ex.id));
      if (hasStarted || hasSubmitted) {
        const protectedFields = ['title', 'className', 'duration', 'startAt', 'endAt', 'questions'];
        const changed = protectedFields.some(key => JSON.stringify(oldExam[key] ?? null) !== JSON.stringify(safe[key] ?? null));
        if (changed) throw new Error('Đã có học sinh bắt đầu lượt thi. Không thể sửa nội dung đề, lớp hoặc thời gian; hãy tạo đợt kiểm tra mới. Giáo viên vẫn có thể đóng hoặc mở lại đợt.');
      }
    }
    const serialized = JSON.stringify(safe);
    if (serialized.length > 45000) throw new Error('Đề thi quá lớn để lưu an toàn trong một ô Google Sheets. Hãy rút gọn nội dung hoặc chia thành các đợt kiểm tra nhỏ hơn.');
    if (index >= 0) sh.getRange(index + 2, 2).setValue(serialized);
    else sh.appendRow([safe.id, serialized]);
  } finally {
    lock.releaseLock();
  }
}


function bankQuestionKey_(q) {
  const source = normalize_(q.text) + '|' + String(q.type || 'short');
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, source, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function validateBankQuestion_(q, index) {
  const n = index + 1;
  if (!q || !String(q.text || '').trim()) throw new Error('Câu ' + n + ' thiếu nội dung.');
  if (!(Number(q.point) > 0 && Number(q.point) <= 100)) throw new Error('Điểm câu ' + n + ' phải lớn hơn 0 và không quá 100.');
  if (q.type === 'mcq') {
    const options = q.options || {};
    if (!['A','B','C','D'].every(k => String(options[k] || '').trim())) throw new Error('Câu ' + n + ' thiếu một trong bốn phương án A/B/C/D.');
    if (String(q.answer || '').trim() && !['A','B','C','D'].includes(String(q.answer).toUpperCase())) throw new Error('Đáp án câu ' + n + ' phải là A/B/C/D.')
  } else if (q.type === 'truefalse') {
    if (String(q.answer || '').trim() && !['Đ','S'].includes(normalizeTF_(q.answer))) throw new Error('Đáp án câu ' + n + ' phải là Đ hoặc S.');
  } else if (q.type === 'short') {
    if (Number(q.tolerance || 0) < 0) throw new Error('Dung sai câu ' + n + ' không được âm.');
  } else throw new Error('Dạng câu hỏi câu ' + n + ' không hợp lệ.');
}

function listBankQuestions_() {
  return rows_('Bank').map(row => { try { return JSON.parse(row[2]); } catch (_) { return null; } })
    .filter(Boolean).sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

function importBankQuestions_(questions) {
  if (!Array.isArray(questions) || !questions.length) throw new Error('Tệp không có câu hỏi hợp lệ để nhập.');
  if (questions.length > TVD_CONFIG.MAX_BANK_IMPORT) throw new Error('Mỗi lần chỉ nhập tối đa ' + TVD_CONFIG.MAX_BANK_IMPORT + ' câu hỏi. Hãy chia tệp thành nhiều lần nhập.');
  questions.forEach(validateBankQuestion_);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_('Bank');
    const existing = rows_('Bank');
    let added = 0, updated = 0;
    questions.forEach(q => {
      const key = bankQuestionKey_(q);
      const index = existing.findIndex(row => String(row[1]) === key);
      const now = new Date().toISOString();
      if (index >= 0) {
        const old = JSON.parse(existing[index][2]);
        const item = Object.assign({}, q, { id: old.id, createdAt: old.createdAt || now, updatedAt: now });
        const json = JSON.stringify(item);
        if (json.length > 30000) throw new Error('Một câu hỏi vượt quá giới hạn lưu trữ 30.000 ký tự.');
        sh.getRange(index + 2, 3).setValue(json);
        sh.getRange(index + 2, 5).setValue(now);
        existing[index][2] = json;
        updated++;
      } else {
        const item = Object.assign({}, q, { id: q.id || Utilities.getUuid(), createdAt: now, updatedAt: now });
        const json = JSON.stringify(item);
        if (json.length > 30000) throw new Error('Một câu hỏi vượt quá giới hạn lưu trữ 30.000 ký tự.');
        sh.appendRow([item.id, key, json, now, now]);
        existing.push([item.id, key, json, now, now]);
        added++;
      }
    });
    return { ok: true, added: added, updated: updated, total: existing.length };
  } finally { lock.releaseLock(); }
}

function deleteBankQuestion_(id) {
  if (!id) throw new Error('Thiếu mã câu hỏi.');
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { deleteRowsByColumn_('Bank', 1, String(id)); } finally { lock.releaseLock(); }
}

function deleteExam_(id) {
  if (!id) throw new Error('Thiếu mã đợt kiểm tra.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    deleteRowsByColumn_('Exams', 1, String(id));
    deleteRowsByColumn_('Results', 2, String(id));
    deleteRowsByColumn_('Attempts', 2, String(id));
  } finally { lock.releaseLock(); }
}

function deleteRowsByColumn_(sheetName, column, value) {
  const sh = sheet_(sheetName);
  for (let row = sh.getLastRow(); row >= 2; row--) {
    if (String(sh.getRange(row, column).getValue()) === String(value)) sh.deleteRow(row);
  }
}

function examIsOpen_(ex) {
  const now = Date.now();
  if (ex.status === 'closed') throw new Error('Đợt kiểm tra đã đóng.');
  if (ex.startAt && now < new Date(ex.startAt).getTime()) throw new Error('Chưa đến thời gian mở bài kiểm tra.');
  if (ex.endAt && now > new Date(ex.endAt).getTime()) throw new Error('Đã hết thời gian nhận bài.');
}

function studentKey_(student) {
  const id = String(student.studentId || '').trim().toLocaleLowerCase();
  const name = normalize_(student.name);
  const cls = normalize_(student.className);
  const source = id ? 'id:' + id : 'name:' + name + '|class:' + cls;
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, source, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function normalize_(value) { return String(value == null ? '' : value).trim().replace(/\s+/g, ' ').toLocaleLowerCase(); }
function normalizeTF_(value) {
  const v = normalize_(value);
  return ['đ', 'd', 'đúng', 'true'].includes(v) ? 'Đ' : (['s', 'sai', 'false'].includes(v) ? 'S' : '');
}

function startAttempt_(params) {
  const examId = String(params.examId || '');
  const student = { name: String(params.name || '').trim(), className: String(params.className || '').trim(), studentId: String(params.studentId || '').trim() };
  if (!student.name || !student.className) throw new Error('Học sinh cần nhập họ tên và lớp.');
  if (student.name.length > 120 || student.className.length > 60 || student.studentId.length > 80) throw new Error('Thông tin học sinh quá dài.');
  const ex = getExam_(examId);
  if (!ex) throw new Error('Không tìm thấy đợt kiểm tra.');
  examIsOpen_(ex);
  const key = studentKey_(student);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const results = rows_('Results');
    if (results.some(row => String(row[1]) === examId && String(row[2]) === key)) throw new Error('Học sinh này đã nộp bài cho đợt kiểm tra.');
    const sh = sheet_('Attempts');
    const attempts = rows_('Attempts');
    const studentAttempts = attempts.filter(row => String(row[1]) === examId && String(row[2]) === key);
    const existing = studentAttempts.find(row => String(row[8]) === 'STARTED');
    const now = Date.now();
    if (existing && new Date(existing[4]).getTime() > now) {
      return { attemptId: String(existing[0]), startedAt: String(existing[3]), expiresAt: String(existing[4]) };
    }
    if (existing) {
      const rowIndex = attempts.indexOf(existing) + 2;
      sh.getRange(rowIndex, 9).setValue('EXPIRED');
      throw new Error('Lượt làm bài đã hết hạn và không thể bắt đầu lại.');
    }
    if (studentAttempts.length) throw new Error('Học sinh đã sử dụng lượt làm bài của đợt kiểm tra này.');
    const startedAt = new Date(now).toISOString();
    const expiresAt = new Date(now + Number(ex.duration) * 60000).toISOString();
    const attemptId = Utilities.getUuid();
    sh.appendRow([attemptId, examId, key, startedAt, expiresAt, student.name, student.className, student.studentId, 'STARTED']);
    return { attemptId, startedAt, expiresAt };
  } finally { lock.releaseLock(); }
}

function resultsForExam_(examId) {
  return rows_('Results').filter(row => String(row[1]) === String(examId));
}

function submitResult_(payload) {
  const examId = String(payload.examId || '');
  const attemptId = String(payload.attemptId || '');
  const student = payload.student || {};
  if (!examId || !attemptId || !payload.id) throw new Error('Thiếu thông tin mã bài thi hoặc mã lượt làm bài.');
  const ex = getExam_(examId);
  if (!ex) throw new Error('Không tìm thấy đề thi.');
  const key = studentKey_(student);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const existingByReceipt = findResultById_(payload.id);
    if (existingByReceipt) return { ok: true, received: true };
    const attemptRows = rows_('Attempts');
    const attemptIndex = attemptRows.findIndex(row => String(row[0]) === attemptId && String(row[1]) === examId && String(row[2]) === key);
    if (attemptIndex < 0) throw new Error('Lượt làm bài không hợp lệ hoặc đã hết hạn.');
    const attempt = attemptRows[attemptIndex];
    if (String(attempt[8]) !== 'STARTED') throw new Error('Lượt làm bài đã kết thúc.');
    if (Date.now() > new Date(attempt[4]).getTime() + 15000) throw new Error('Đã quá thời gian làm bài.');
    examIsOpen_(ex);
    if (resultsForExam_(examId).some(row => String(row[2]) === key)) throw new Error('Học sinh này đã nộp bài cho đợt kiểm tra.');
    const answers = payload.answers || {};
    let rawScore = 0;
    let total = 0;
    const details = [];
    (ex.questions || []).forEach(q => {
      const answer = String(answers[q.id] == null ? '' : answers[q.id]).trim();
      const point = Number(q.point) || 0;
      total += point;
      const correct = answerIsCorrect_(q, answer);
      if (correct) rawScore += point;
      details.push({ questionId: q.id, answer: answer, correct: correct });
    });
    const score = total ? Math.round((rawScore / total) * 1000) / 100 : 0;
    const result = {
      id: String(payload.id), examId: examId, examTitle: ex.title,
      name: String(attempt[5]), className: String(attempt[6]),
      studentId: String(attempt[7] || ''), score: score,
      rawScore: rawScore, total: total, details: details,
      submittedAt: new Date().toISOString(), studentKey: key
    };
    const resultJson = JSON.stringify(result);
    if (resultJson.length > 45000) throw new Error('Bài làm có dữ liệu vượt quá dung lượng lưu trữ cho phép. Hãy báo giáo viên.');
    sheet_('Results').appendRow([result.id, examId, key, resultJson]);
    sheet_('Attempts').getRange(attemptIndex + 2, 9).setValue('SUBMITTED');
    return { ok: true, received: true };
  } finally { lock.releaseLock(); }
}

function answerIsCorrect_(q, answer) {
  const expected = String(q.answer == null ? '' : q.answer).trim();
  if (q.type === 'mcq') return normalize_(answer) === normalize_(expected);
  if (q.type === 'truefalse') return normalizeTF_(answer) === normalizeTF_(expected);
  if (q.type === 'short') {
    const a = Number(String(answer).replace(',', '.'));
    const b = Number(String(expected).replace(',', '.'));
    if (answer !== '' && expected !== '' && isFinite(a) && isFinite(b)) {
      return Math.abs(a - b) <= Math.max(0, Number(q.tolerance) || 0);
    }
    return normalize_(answer) === normalize_(expected);
  }
  return false;
}

function findResultById_(id) {
  if (!id) return null;
  const row = rows_('Results').find(r => String(r[0]) === String(id));
  if (!row) return null;
  try { return JSON.parse(row[3]); } catch (_) { return null; }
}

function getResults_(examId) {
  if (!examId) return [];
  return resultsForExam_(examId).map(row => {
    try { return JSON.parse(row[3]); } catch (_) { return null; }
  }).filter(Boolean).sort((a, b) => String(a.submittedAt).localeCompare(String(b.submittedAt)));
}
