'use strict';

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const state = { user:null, token:'', api:'', exams:[], bank:[], importPreview:[], importErrors:[], pendingQuestions:null, tab:'home', editing:null, currentExam:null, student:null, attempt:null, answers:{}, timer:null, remaining:0, resultExamId:'' };
const STORE = { exams:'tvd_exams_v2', results:'tvd_results_v2', bank:'tvd_question_bank_v1', api:'tvd_api_v2', teacher:'tvd_teacher_v2' };

function escapeHtml(value='') { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function makeId(prefix='TVD') { return prefix+'-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase(); }
function notify(message, type='') { const node=$('#toast'); node.textContent=message; node.className='toast show'; if(type==='error') node.style.background='#9f2942'; else node.style.background='#1d2744'; clearTimeout(notify._timer); notify._timer=setTimeout(()=>node.className='toast',3500); }
function wait(ms) { return new Promise(resolve=>setTimeout(resolve,ms)); }
function localExams() { try{return JSON.parse(localStorage.getItem(STORE.exams)||'[]')}catch{return []} }
function saveLocalExams(items) { localStorage.setItem(STORE.exams,JSON.stringify(items)); }
function localResults() { try{return JSON.parse(localStorage.getItem(STORE.results)||'[]')}catch{return []} }
function localBank() { try{return JSON.parse(localStorage.getItem(STORE.bank)||'[]')}catch{return []} }
function saveLocalBank(items) { localStorage.setItem(STORE.bank,JSON.stringify(items)); }
function saveLocalResults(items) { localStorage.setItem(STORE.results,JSON.stringify(items)); }
function localMode() { return !state.api; }
function apiURL() { return state.api || ''; }
function isValidApiEndpoint(value) { try { const u=new URL(value); return u.protocol==='https:' && u.hostname==='script.google.com' && /^\/macros\/s\/[^/]+\/exec$/.test(u.pathname); } catch { return false; } }

function jsonp(action, params={}) {
  const endpoint=apiURL();
  if(!isValidApiEndpoint(endpoint)) return Promise.reject(new Error('URL máy chủ Apps Script không hợp lệ.'));
  return new Promise((resolve,reject)=>{
    const callback='__tvd_jsonp_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
    const script=document.createElement('script');
    const url=new URL(endpoint);
    url.searchParams.set('action',action);
    url.searchParams.set('callback',callback);
    Object.entries(params).forEach(([key,value])=>{ if(value!==undefined && value!==null) url.searchParams.set(key,String(value)); });
    let finished=false;
    const cleanup=()=>{ if(finished)return; finished=true; clearTimeout(timer); script.remove(); try{delete window[callback]}catch{window[callback]=undefined;} };
    const timer=setTimeout(()=>{cleanup();reject(new Error('Máy chủ phản hồi quá chậm. Kiểm tra lại URL Apps Script và kết nối mạng.'));},15000);
    window[callback]=(data)=>{cleanup(); if(data && data.error) reject(new Error(data.error)); else resolve(data);};
    script.onerror=()=>{cleanup();reject(new Error('Không truy cập được máy chủ Apps Script.'));};
    script.src=url.toString(); document.body.appendChild(script);
  });
}

async function postToServer(action, data={}) {
  const endpoint=apiURL();
  if(!isValidApiEndpoint(endpoint)) throw new Error('URL máy chủ Apps Script không hợp lệ.');
  // text/plain là CORS-safelisted, tránh preflight. Phản hồi opaque được xác minh bằng API đọc ở bước kế tiếp.
  await fetch(endpoint,{method:'POST',mode:'no-cors',cache:'no-store',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action,token:state.token,data})});
}

async function api(action, data={}) {
  if(localMode()) return localApi(action,data);
  const token=state.token;
  if(action==='get') return jsonp('get',{id:data.id});
  if(action==='start') return jsonp('start',{examId:data.examId,name:data.name,className:data.className,studentId:data.studentId||''});
  if(action==='receipt') return jsonp('receipt',{id:data.id});
  if(action==='list') return jsonp('list',{token});
  if(action==='teacherGet') return jsonp('teacherGet',{id:data.id,token});
  if(action==='results') return jsonp('results',{examId:data.examId,token});
  if(action==='bankList') return jsonp('bankList',{token});
  if(action==='bankImport') {
    await postToServer('bankImport',data);
    for(let i=0;i<10;i++){ await wait(500); const items=await jsonp('bankList',{token}); const wanted=(data.questions||[]).map(q=>bankQuestionKey(q)); const keys=new Set(items.map(q=>bankQuestionKey(q))); if(wanted.every(k=>keys.has(k))) return {ok:true,items}; }
    throw new Error('Chưa xác nhận được ngân hàng câu hỏi đã cập nhật. Hãy tải lại ngân hàng trước khi nhập lại.');
  }
  if(action==='bankDelete') {
    await postToServer('bankDelete',data);
    for(let i=0;i<8;i++){ await wait(450); const items=await jsonp('bankList',{token}); if(!items.some(q=>q.id===data.id)) return {ok:true}; }
    throw new Error('Chưa xác nhận được thao tác xóa câu hỏi.');
  }
  if(action==='save') {
    await postToServer('save',data);
    for(let i=0;i<8;i++){ await wait(550); const saved=await jsonp('teacherGet',{id:data.id,token}); if(saved && sameExam(saved,data)) return {ok:true}; }
    throw new Error('Chưa xác nhận được dữ liệu đã lưu. Hãy tải lại danh sách; không tạo lại đề nếu đề đã xuất hiện.');
  }
  if(action==='delete') {
    await postToServer('delete',data);
    for(let i=0;i<8;i++){ await wait(550); const items=await jsonp('list',{token}); if(!items.some(x=>x.id===data.id)) return {ok:true}; }
    throw new Error('Chưa xác nhận được thao tác xóa. Hãy tải lại danh sách.');
  }
  if(action==='submit') {
    await postToServer('submit',data);
    for(let i=0;i<12;i++){ await wait(650); try{const receipt=await jsonp('receipt',{id:data.id}); if(receipt && receipt.received) return receipt;}catch{} }
    throw new Error('Chưa nhận được xác nhận từ máy chủ. Giữ nguyên mã bài nộp và kiểm tra lại kết quả trước khi nộp lần nữa.');
  }
  throw new Error('Lệnh không được hỗ trợ.');
}

async function localApi(action,data={}) {
  const exams=localExams();
  if(action==='list') return exams.map(ex=>({id:ex.id,title:ex.title,className:ex.className,duration:ex.duration,status:ex.status,created:ex.created,questionCount:ex.questions.length,startAt:ex.startAt,endAt:ex.endAt}));
  if(action==='teacherGet') return exams.find(ex=>ex.id===data.id)||null;
  if(action==='get') { const ex=exams.find(x=>x.id===data.id); return ex?publicExam(ex):null; }
  if(action==='save') { const i=exams.findIndex(x=>x.id===data.id); if(i>=0) exams[i]=data; else exams.unshift(data); saveLocalExams(exams); return {ok:true}; }
  if(action==='delete') { saveLocalExams(exams.filter(x=>x.id!==data.id)); saveLocalResults(localResults().filter(x=>x.examId!==data.id)); return {ok:true}; }
  if(action==='results') return localResults().filter(x=>x.examId===data.examId);
  if(action==='bankList') return localBank();
  if(action==='bankImport') { const bank=localBank(); let added=0,updated=0; for(const q0 of (data.questions||[])){ const q=normalizeImportedQuestion(q0); const key=bankQuestionKey(q); const i=bank.findIndex(x=>bankQuestionKey(x)===key); if(i>=0){bank[i]={...q,id:bank[i].id,createdAt:bank[i].createdAt,updatedAt:new Date().toISOString()};updated++;} else {bank.unshift({...q,id:q.id||makeId('Q'),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});added++;} } saveLocalBank(bank); return {ok:true,added,updated,total:bank.length}; }
  if(action==='bankDelete') { saveLocalBank(localBank().filter(q=>q.id!==data.id)); return {ok:true}; }
  if(action==='start') {
    const ex=exams.find(x=>x.id===data.examId); if(!ex) throw new Error('Không tìm thấy đợt kiểm tra.');
    ensureExamOpen(ex);
    const key=studentKey(data); if(localResults().some(r=>r.examId===ex.id&&r.studentKey===key)) throw new Error('Học sinh này đã nộp bài cho đợt kiểm tra.');
    const attempt={attemptId:makeId('ATT'),examId:ex.id,startedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+ex.duration*60000).toISOString(),studentKey:key};
    return attempt;
  }
  if(action==='submit') {
    const ex=exams.find(x=>x.id===data.examId); if(!ex) throw new Error('Không tìm thấy đề.');
    if(localResults().some(r=>r.id===data.id)) return {received:true};
    const key=studentKey(data.student); if(localResults().some(r=>r.examId===ex.id&&r.studentKey===key)) throw new Error('Học sinh này đã nộp bài cho đợt kiểm tra.');
    const result=scoreSubmission(ex,data); const all=localResults(); all.push(result); saveLocalResults(all); return {received:true,score:result.score};
  }
  if(action==='receipt') return {received:localResults().some(x=>x.id===data.id)};
  throw new Error('Lệnh không được hỗ trợ.');
}
function publicExam(ex) { return {...ex,questions:ex.questions.map(q=>({id:q.id,text:q.text,type:q.type,point:q.point,options:q.options||{}}))}; }
function sameExam(a,b) { return !!a && ['id','title','className','duration','startAt','endAt','status'].every(k=>String(a[k]??'')===String(b[k]??'')) && JSON.stringify(a.questions||[])===JSON.stringify(b.questions||[]); }
function normalizeAnswer(answer) { return String(answer??'').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi-VN'); }
function studentKey(s) { const identity=String(s.studentId||'').trim().toLocaleLowerCase('vi-VN'); const name=normalizeAnswer(s.name), cls=normalizeAnswer(s.className); return identity?'id:'+identity:'name:'+name+'|class:'+cls; }
function ensureExamOpen(ex) {
  const now=Date.now();
  if(ex.status==='closed') throw new Error('Đợt kiểm tra đã đóng.');
  if(ex.startAt && now<new Date(ex.startAt).getTime()) throw new Error('Chưa đến thời gian mở bài kiểm tra.');
  if(ex.endAt && now>new Date(ex.endAt).getTime()) throw new Error('Đã hết thời gian nhận bài.');
}
function scoreSubmission(ex,p) {
  let raw=0,total=0; const details=[];
  ex.questions.forEach(q=>{ const answer=String((p.answers||{})[q.id]??'').trim(); const point=Number(q.point)||0; total+=point; const correct=answerMatches(q,answer); if(correct)raw+=point; details.push({questionId:q.id,answer,correct}); });
  return {id:p.id,examId:ex.id,examTitle:ex.title,name:p.student.name,className:p.student.className,studentId:p.student.studentId||'',score:total?Math.round(raw/total*1000)/100:0,rawScore:raw,total,details,submittedAt:new Date().toISOString(),studentKey:studentKey(p.student)};
}
function answerMatches(q,answer) {
  const expected=String(q.answer??'').trim();
  if(q.type==='short') {
    const a=Number(String(answer).replace(',','.')), b=Number(String(expected).replace(',','.'));
    if(answer!=='' && expected!=='' && Number.isFinite(a)&&Number.isFinite(b)) return Math.abs(a-b)<=Math.max(0,Number(q.tolerance)||0);
  }
  return normalizeAnswer(answer)===normalizeAnswer(expected);
}

function showLogin() {
  $('#signedUser').textContent=''; $('#logoutButton').classList.add('hidden');
  $('#app').innerHTML=`<section class="login-card"><div class="eyebrow">KHÔNG GIAN DÀNH CHO GIÁO VIÊN</div><h1>Đăng nhập TVD</h1><p>Quản lý đề thi, các đợt kiểm tra và kết quả học sinh</p><form id="loginForm"><div class="field"><label for="teacherName">Tên giáo viên</label><input id="teacherName" autocomplete="name" placeholder="Ví dụ: Nguyễn Anh Tuấn" required value="${escapeHtml(localStorage.getItem(STORE.teacher)||'')}"></div><div class="field"><label for="teacherToken">Mã truy cập giáo viên</label><input id="teacherToken" type="password" autocomplete="current-password" placeholder="Mã đã thiết lập trong Code.gs" ${apiURL()?'required':''}></div><div class="field"><label for="apiEndpoint">URL máy chủ Apps Script</label><input id="apiEndpoint" type="url" placeholder="https://script.google.com/macros/s/.../exec" value="${escapeHtml(apiURL())}"></div><div class="notice">Có thể mở chế độ dùng thử trên trình duyệt này khi để trống URL máy chủ. Muốn nhiều thiết bị cùng dùng và lưu điểm tập trung, phải triển khai Google Apps Script và Google Sheets.</div><button class="btn" id="loginSubmit" type="submit">Đăng nhập hệ thống →</button></form><p class="tiny muted" style="margin-top:15px">Không nên dùng chế độ cục bộ cho bài kiểm tra chính thức.</p></section><div class="footer">TVD · Hệ thống thi trực tuyến</div>`;
  $('#loginForm').addEventListener('submit',login);
}
async function login(event) {
  event.preventDefault();
  const name=$('#teacherName').value.trim(), token=$('#teacherToken').value.trim(), endpoint=$('#apiEndpoint').value.trim();
  if(!name){notify('Vui lòng nhập tên giáo viên.','error');return;}
  if(endpoint) {
    let u; try{u=new URL(endpoint)}catch{notify('URL Apps Script không hợp lệ.','error');return;}
    if(!isValidApiEndpoint(endpoint)){notify('Dán đúng URL Web App Apps Script dạng /macros/s/.../exec.','error');return;}
    if(!token){notify('Nhập mã truy cập giáo viên đã khai báo trong Code.gs.','error');return;}
    const button=$('#loginSubmit');button.disabled=true;button.textContent='Đang xác thực…';
    state.api=endpoint;state.token=token;
    try{state.exams=await api('list');}
    catch(err){state.api='';state.token='';button.disabled=false;button.textContent='Đăng nhập hệ thống →';notify(err.message,'error');return;}
    localStorage.setItem(STORE.api,endpoint);
  } else { state.api='';state.token='';state.exams=await api('list'); }
  state.user=name;localStorage.setItem(STORE.teacher,name);$('#signedUser').textContent=name;$('#logoutButton').classList.remove('hidden');$('#logoutButton').onclick=logout;state.tab='home';renderShell();
}
function logout() { clearInterval(state.timer);state.user=null;state.token='';sessionStorage.removeItem('tvd_token');showLogin(); }
async function refreshExams() { state.exams=await api('list'); }
function shellHTML() {
  return `<div class="hero"><div><span class="eyebrow">DÀNH CHO GIÁO VIÊN THPT</span><h1>Hệ thống thi online<br><span>chủ động – chính xác – tiện lợi</span></h1><p>Tạo đề kiểm tra, tổ chức theo từng đợt, gửi liên kết cho học sinh và quản lý kết quả tập trung.</p></div><div class="hero-art">🎓</div></div><div class="layout"><aside class="sidebar"><button class="nav-item" data-tab="home">▦　Tổng quan</button><button class="nav-item" data-tab="create">＋　Tạo đề kiểm tra</button><button class="nav-item" data-tab="exams">▤　Đợt kiểm tra</button><button class="nav-item" data-tab="bank">▧　Ngân hàng câu hỏi</button><button class="nav-item" data-tab="results">▥　Kết quả học sinh</button><button class="nav-item" data-tab="settings">⚙　Cài đặt</button></aside><section class="content" id="content"></section></div><div class="footer">TVD – Hệ thống thi trực tuyến · Phiên bản 1.2.0</div>`;
}
function renderShell() {
  $('#app').innerHTML=shellHTML();
  $$('.nav-item').forEach(button=>button.addEventListener('click',()=>go(button.dataset.tab)));
  renderTab();
}
function go(tab) { state.tab=tab;renderTab(); }
function renderTab() {
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));
  const root=$('#content');
  if(state.tab==='home') renderHome(root);
  if(state.tab==='create') renderEditor(root);
  if(state.tab==='exams') renderExams(root);
  if(state.tab==='bank') renderBank(root);
  if(state.tab==='results') renderResults(root);
  if(state.tab==='settings') renderSettings(root);
}
function statusPill(ex) { return ex.status==='closed'?'<span class="pill gray">Đã đóng</span>':'<span class="pill green">Đang mở</span>'; }
function examsTable(items) {
  if(!items.length) return '<div class="empty">Chưa có đợt kiểm tra. Hãy tạo đợt đầu tiên.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>Tên đợt kiểm tra</th><th>Lớp</th><th>Số câu</th><th>Thời lượng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${items.map(ex=>`<tr><td><strong>${escapeHtml(ex.title)}</strong><br><span class="tiny muted">${escapeHtml(ex.id)}</span></td><td>${escapeHtml(ex.className||'—')}</td><td>${Number(ex.questionCount??ex.questions?.length??0)}</td><td>${Number(ex.duration)||45} phút</td><td>${statusPill(ex)}</td><td><div class="row"><button class="btn btn-small btn-soft" data-action="share" data-id="${escapeHtml(ex.id)}">Link</button><button class="btn btn-small btn-light" data-action="results" data-id="${escapeHtml(ex.id)}">Điểm</button><button class="btn btn-small btn-light" data-action="edit" data-id="${escapeHtml(ex.id)}">Sửa</button><button class="btn btn-small btn-light" data-action="toggle" data-id="${escapeHtml(ex.id)}">${ex.status==='closed'?'Mở':'Đóng'}</button><button class="btn btn-small btn-danger" data-action="delete" data-id="${escapeHtml(ex.id)}">Xóa</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
function renderHome(root) {
  const active=state.exams.filter(x=>x.status!=='closed').length;
  const subs=localMode()?localResults().length:'—';
  root.innerHTML=`<div class="grid-stats"><div class="stat"><div class="stat-label">Tổng số đợt kiểm tra</div><div class="stat-value">${state.exams.length}</div></div><div class="stat"><div class="stat-label">Đợt đang mở</div><div class="stat-value">${active}</div></div><div class="stat"><div class="stat-label">Bài nộp lưu trên trình duyệt</div><div class="stat-value">${subs}</div></div><div class="stat"><div class="stat-label">Chế độ sử dụng</div><div class="stat-value" style="font-size:19px">${localMode()?'Dùng thử cục bộ':'Máy chủ trực tuyến'}</div></div></div><div class="panel"><div class="row between"><h2>Đợt kiểm tra gần đây</h2><button class="btn" id="createNew">＋ Tạo đợt mới</button></div>${examsTable(state.exams.slice(0,8))}</div><div class="notice ${localMode()?'':'success'}">${localMode()?'Đang ở chế độ cục bộ: dữ liệu chỉ nằm trong trình duyệt này. Hãy cài Apps Script để học sinh ở thiết bị khác truy cập và đồng bộ điểm.':'Đã kết nối máy chủ. Đề thi và bài nộp được lưu trong Google Sheets.'}</div>`;
  $('#createNew').onclick=()=>{state.editing=null;go('create');};
  attachExamActions(root);
}
function renderExams(root) {
  root.innerHTML=`<div class="panel"><div class="row between"><h2>Quản lý các đợt kiểm tra</h2><button class="btn" id="newExam">＋ Tạo đợt mới</button></div>${examsTable(state.exams)}</div>`;
  $('#newExam').onclick=()=>{state.editing=null;go('create');};attachExamActions(root);
}
function attachExamActions(root) {
  $$('[data-action]',root).forEach(button=>button.addEventListener('click',async()=>{
    const id=button.dataset.id, action=button.dataset.action, ex=state.exams.find(x=>x.id===id);
    try {
      if(action==='share') await shareExam(id);
      if(action==='results') {state.resultExamId=id;go('results');}
      if(action==='edit') {state.editing=id;go('create');}
      if(action==='toggle') {const full=await api('teacherGet',{id});full.status=full.status==='closed'?'open':'closed';await api('save',full);await refreshExams();renderTab();notify(full.status==='closed'?'Đã đóng đợt kiểm tra.':'Đã mở lại đợt kiểm tra.');}
      if(action==='delete') {if(!confirm('Xóa đợt kiểm tra và toàn bộ kết quả liên quan?'))return;await api('delete',{id});await refreshExams();renderTab();notify('Đã xóa đợt kiểm tra.');}
    } catch(err){notify(err.message,'error');}
  }));
}
async function shareExam(id) {
  if(localMode()){notify('Chế độ dùng thử cục bộ không thể gửi link cho học sinh ở thiết bị khác. Hãy cài Apps Script và kết nối máy chủ trước.','error');return;}
  const ex=state.exams.find(x=>x.id===id); const url=new URL(location.href.split(/[?#]/)[0]);url.searchParams.set('exam',id);if(apiURL())url.searchParams.set('api',apiURL());
  const message=`${ex?.title||'Bài kiểm tra'}\nLớp: ${ex?.className||''}\nThời lượng: ${ex?.duration||45} phút\nLink làm bài: ${url.toString()}`;
  try{await navigator.clipboard.writeText(message);notify('Đã sao chép liên kết và thông tin để gửi học sinh qua Zalo.');}
  catch{prompt('Sao chép nội dung gửi học sinh:',message);}
}

function renderEditor(root) {
  const editing=!!state.editing;
  root.innerHTML=`<div class="panel"><div class="row between"><div><h2>${editing?'Chỉnh sửa đợt kiểm tra':'Tạo đợt kiểm tra mới'}</h2><div class="tiny muted">Mỗi đợt gồm thông tin tổ chức và danh sách câu hỏi.</div></div><span class="auth-chip">${editing?'CHỈNH SỬA':'TẠO MỚI'}</span></div><form id="examForm"><div class="form-grid"><div class="field"><label for="examTitle">Tên đợt kiểm tra *</label><input id="examTitle" required maxlength="180" placeholder="Ví dụ: Kiểm tra giữa học kỳ I – Toán 12"></div><div class="field"><label for="examClass">Lớp áp dụng *</label><input id="examClass" required maxlength="80" placeholder="12A1"></div><div class="field"><label for="examDuration">Thời lượng (phút) *</label><input id="examDuration" type="number" min="1" max="300" value="45" required></div><div class="field"><label for="examStatus">Trạng thái</label><select id="examStatus"><option value="open">Mở cho học sinh</option><option value="closed">Tạm đóng</option></select></div><div class="field"><label for="examStart">Thời điểm bắt đầu mở (để trống nếu mở ngay)</label><input id="examStart" type="datetime-local"></div><div class="field"><label for="examEnd">Thời điểm kết thúc nhận bài</label><input id="examEnd" type="datetime-local"></div></div><div class="divider"></div><div class="row between"><div><h3>Danh sách câu hỏi</h3><div class="inline-note">Hỗ trợ trắc nghiệm 4 lựa chọn, đúng/sai và trả lời ngắn.</div></div><div class="row"><button class="btn btn-soft" type="button" id="addFromBank">▧ Chọn từ ngân hàng</button><button class="btn btn-soft" type="button" id="addQuestion">＋ Thêm câu hỏi</button></div></div><div id="questionList"></div><div class="row"><button class="btn" type="submit" id="saveExamButton">Lưu đợt kiểm tra</button><button class="btn btn-light" type="button" id="cancelEditor">Hủy</button></div></form></div>`;
  $('#cancelEditor').onclick=()=>{state.editing=null;go('exams');};
  $('#addQuestion').onclick=()=>addQuestionCard();
  $('#addFromBank').onclick=()=>openBankPicker();
  $('#examForm').addEventListener('submit',saveExamForm);
  (async()=>{
    let ex=null;if(editing){try{ex=await api('teacherGet',{id:state.editing});}catch(err){notify(err.message,'error');go('exams');return;}if(!ex){notify('Không tìm thấy đợt kiểm tra.','error');go('exams');return;}}
    if(ex){$('#examTitle').value=ex.title;$('#examClass').value=ex.className||'';$('#examDuration').value=ex.duration||45;$('#examStatus').value=ex.status||'open';$('#examStart').value=toLocalInput(ex.startAt);$('#examEnd').value=toLocalInput(ex.endAt);ex.questions.forEach(q=>addQuestionCard(q));}
    else if(state.pendingQuestions && state.pendingQuestions.length){state.pendingQuestions.forEach(q=>addQuestionCard(q));state.pendingQuestions=null;}
    else addQuestionCard();
  })();
}
function toLocalInput(value){if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return '';const offset=d.getTimezoneOffset();return new Date(d.getTime()-offset*60000).toISOString().slice(0,16);}
function fromLocalInput(value){return value?new Date(value).toISOString():'';}
let questionSequence=0;
function addQuestionCard(q={}) {
  const list=$('#questionList');if(!list)return;
  const id='question_'+(++questionSequence);const type=q.type||'mcq';const card=document.createElement('article');card.className='question-card';card.id=id;
  card.innerHTML=`<div class="question-card-head"><strong class="question-number">Câu hỏi</strong><button type="button" class="btn btn-small btn-danger remove-question">Xóa câu</button></div><div class="field"><label>Nội dung câu hỏi *</label><textarea class="q-text" maxlength="5000" required placeholder="Nhập đầy đủ nội dung câu hỏi…">${escapeHtml(q.text||'')}</textarea></div><div class="form-grid"><div class="field"><label>Dạng câu hỏi</label><select class="q-type"><option value="mcq">Trắc nghiệm 4 lựa chọn</option><option value="truefalse">Đúng / Sai</option><option value="short">Trả lời ngắn</option></select></div><div class="field"><label>Điểm câu hỏi *</label><input class="q-point" type="number" min="0.01" max="100" step="0.01" value="${Number(q.point)||1}" required></div></div><div class="q-options"></div><div class="field"><label>Đáp án chuẩn *</label><input class="q-answer" required maxlength="200" placeholder="Đáp án đúng"></div><div class="field q-tolerance-field"><label>Dung sai cho đáp án số (tùy chọn, ví dụ 0.01)</label><input class="q-tolerance" type="number" min="0" step="any" value="${Number(q.tolerance)||0}" placeholder="0"></div><div class="field"><label>Lời giải / ghi chú dành cho giáo viên (không hiển thị cho học sinh)</label><textarea class="q-explain" maxlength="3000" placeholder="Lời giải…">${escapeHtml(q.explain||'')}</textarea></div>`;
  list.appendChild(card);card.querySelector('.q-type').value=type;card.querySelector('.remove-question').onclick=()=>{card.remove();renumberQuestions();};card.querySelector('.q-type').onchange=()=>renderQuestionControls(card,{});renderQuestionControls(card,q);renumberQuestions();
}
function renderQuestionControls(card,q={}) {
  const type=card.querySelector('.q-type').value,box=card.querySelector('.q-options'),answer=card.querySelector('.q-answer'),tol=card.querySelector('.q-tolerance-field');
  if(type==='mcq'){
    box.innerHTML='<div class="option-grid">'+['A','B','C','D'].map(k=>`<div class="field"><label>Phương án ${k} *</label><input class="q-opt" data-key="${k}" maxlength="1000" required placeholder="Nội dung phương án ${k}" value="${escapeHtml(q.options?.[k]||'')}"></div>`).join('')+'</div>';
    answer.placeholder='Nhập A, B, C hoặc D';answer.setAttribute('pattern','[ABCDabcd]');tol.classList.add('hidden');
  } else if(type==='truefalse'){
    box.innerHTML='<div class="notice">Câu dạng mệnh đề: học sinh chọn Đúng hoặc Sai. Đáp án chuẩn nhập Đ hoặc S.</div>';answer.placeholder='Nhập Đ hoặc S';answer.removeAttribute('pattern');tol.classList.add('hidden');
  } else {
    box.innerHTML='<div class="inline-note">Học sinh nhập kết quả vào ô trả lời. Có thể đặt dung sai nếu đáp án là số thập phân.</div>';answer.placeholder='Nhập đáp án chính xác';answer.removeAttribute('pattern');tol.classList.remove('hidden');
  }
  if(q.answer!==undefined)answer.value=q.answer;
}
function renumberQuestions(){ $$('.question-card').forEach((card,i)=>card.querySelector('.question-number').textContent='Câu hỏi '+(i+1)); }
async function saveExamForm(event) {
  event.preventDefault();const button=$('#saveExamButton');button.disabled=true;button.textContent='Đang lưu…';
  try {
    const cards=$$('.question-card');if(!cards.length)throw new Error('Đề cần có ít nhất một câu hỏi.');
    const questions=cards.map((card,i)=>{
      const type=card.querySelector('.q-type').value,text=card.querySelector('.q-text').value.trim(),answer=card.querySelector('.q-answer').value.trim(),point=Number(card.querySelector('.q-point').value);
      const options=type==='mcq'?Object.fromEntries($$('.q-opt',card).map(input=>[input.dataset.key,input.value.trim()])):{};
      if(!text||!answer||!(point>0))throw new Error('Kiểm tra nội dung, đáp án và điểm ở câu '+(i+1)+'.');
      if(type==='mcq'&&(['A','B','C','D'].includes(answer.toUpperCase())===false||Object.values(options).some(v=>!v)))throw new Error('Câu '+(i+1)+': cần đủ 4 phương án và đáp án A/B/C/D.');
      if(type==='truefalse'&&!['đ','d','s','đúng','sai','true','false'].includes(answer.toLocaleLowerCase('vi-VN')))throw new Error('Câu '+(i+1)+': đáp án đúng/sai phải là Đ hoặc S.');
      if(type==='short'&&Number(card.querySelector('.q-tolerance').value)<0)throw new Error('Dung sai không được âm ở câu '+(i+1)+'.');
      return {id:'q'+(i+1),text,type,point,options,answer:type==='truefalse'?normalizeTrueFalse(answer):type==='mcq'?answer.toUpperCase():answer,tolerance:Number(card.querySelector('.q-tolerance').value)||0,explain:card.querySelector('.q-explain').value.trim()};
    });
    const total=questions.reduce((sum,q)=>sum+q.point,0);if(!Number.isFinite(total)||total<=0)throw new Error('Tổng điểm không hợp lệ.');
    const existing=state.editing?await api('teacherGet',{id:state.editing}):null;
    const ex={id:existing?.id||makeId(),title:$('#examTitle').value.trim(),className:$('#examClass').value.trim(),duration:Number($('#examDuration').value),startAt:fromLocalInput($('#examStart').value),endAt:fromLocalInput($('#examEnd').value),status:$('#examStatus').value,questions,created:existing?.created||new Date().toISOString(),updatedAt:new Date().toISOString(),teacher:state.user};
    if(!ex.title||!ex.className||!(ex.duration>0&&ex.duration<=300))throw new Error('Kiểm tra tên đợt, lớp và thời lượng (1–300 phút).');
    if(ex.startAt&&ex.endAt&&new Date(ex.startAt)>=new Date(ex.endAt))throw new Error('Thời điểm kết thúc phải sau thời điểm bắt đầu.');
    await api('save',ex);await refreshExams();state.editing=null;notify('Đã lưu đợt kiểm tra.');go('exams');
  } catch(err){notify(err.message,'error');button.disabled=false;button.textContent='Lưu đợt kiểm tra';}
}
function normalizeTrueFalse(answer){const v=answer.trim().toLocaleLowerCase('vi-VN');return ['đ','d','đúng','true'].includes(v)?'Đ':'S';}

async function renderResults(root) {
  root.innerHTML='<div class="panel"><div class="loading">Đang tải kết quả…</div></div>';
  const id=state.resultExamId||state.exams[0]?.id||'';
  if(!id){root.innerHTML='<div class="panel"><h2>Kết quả học sinh</h2><div class="empty">Chưa có đợt kiểm tra nào.</div></div>';return;}
  let list=[];try{list=await api('results',{examId:id});}catch(err){root.innerHTML=`<div class="panel"><h2>Kết quả học sinh</h2><div class="notice error">${escapeHtml(err.message)}</div></div>`;return;}
  state.resultExamId=id;const ex=state.exams.find(x=>x.id===id);const avg=list.length?list.reduce((s,x)=>s+Number(x.score||0),0)/list.length:0;
  root.innerHTML=`<div class="panel"><div class="row between"><div><h2>Kết quả học sinh</h2><div class="tiny muted">Danh sách điểm theo từng đợt kiểm tra</div></div><button class="btn btn-soft" id="downloadResults" ${list.length?'':'disabled'}>↓ Tải bảng điểm CSV</button></div><div class="field"><label for="resultExamSelect">Chọn đợt kiểm tra</label><select id="resultExamSelect">${state.exams.map(x=>`<option value="${escapeHtml(x.id)}" ${x.id===id?'selected':''}>${escapeHtml(x.title)} – ${escapeHtml(x.className||'')}</option>`).join('')}</select></div><div class="grid-stats"><div class="stat"><div class="stat-label">Số bài đã nộp</div><div class="stat-value">${list.length}</div></div><div class="stat"><div class="stat-label">Điểm trung bình</div><div class="stat-value">${list.length?avg.toFixed(2):'—'}</div></div></div><p class="muted">${escapeHtml(ex?.title||'')} · ${escapeHtml(ex?.className||'')}</p>${list.length?`<div class="table-wrap"><table><thead><tr><th>STT</th><th>Họ và tên</th><th>Lớp</th><th>Mã học sinh</th><th>Điểm</th><th>Thời gian nộp</th></tr></thead><tbody>${list.sort((a,b)=>new Date(a.submittedAt)-new Date(b.submittedAt)).map((x,i)=>`<tr><td>${i+1}</td><td><strong>${escapeHtml(x.name)}</strong></td><td>${escapeHtml(x.className)}</td><td>${escapeHtml(x.studentId||'—')}</td><td><strong>${Number(x.score).toFixed(2)}</strong></td><td>${new Date(x.submittedAt).toLocaleString('vi-VN')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Chưa có học sinh nộp bài.</div>'}</div>`;
  $('#resultExamSelect').onchange=()=>{state.resultExamId=$('#resultExamSelect').value;renderResults(root);};
  $('#downloadResults').onclick=()=>downloadCSV(list,ex);
}
function downloadCSV(list,ex) {
  const rows=[['STT','Họ và tên','Lớp','Mã học sinh','Điểm','Điểm thô','Tổng điểm','Thời gian nộp'],...list.map((x,i)=>[i+1,x.name,x.className,x.studentId,x.score,x.rawScore,x.total,new Date(x.submittedAt).toLocaleString('vi-VN')])];
  const csvCell=value=>{let text=String(value??'');if(/^[\s\u0000-\u001f]*[=+@\-]/.test(text))text=String.fromCharCode(39)+text;return '"'+text.replace(/"/g,'""')+'"';};
  const csv='\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`TVD_Bang_diem_${(ex?.id||'ketqua').replace(/[^a-z0-9_-]/gi,'_')}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}

function renderSettings(root) {
  root.innerHTML=`<div class="panel"><h2>Cài đặt kết nối</h2><div class="notice ${localMode()?'':'success'}">${localMode()?'Đang ở chế độ dùng thử cục bộ.':'Đang kết nối máy chủ Apps Script: '+escapeHtml(apiURL())}</div><div class="field"><label for="settingsApi">URL Web App Google Apps Script</label><input id="settingsApi" type="url" value="${escapeHtml(apiURL())}" placeholder="https://script.google.com/macros/s/.../exec"></div><div class="row"><button class="btn" id="saveSettings">Lưu và kiểm tra kết nối</button><button class="btn btn-light" id="localMode">Chuyển về chế độ dùng thử</button></div><div class="divider"></div><h3>Quy trình sử dụng</h3><ol><li>Tạo một Google Sheet và một Apps Script theo tệp <strong>Code.gs</strong> trong bộ cài.</li><li>Điền ID Google Sheet và mã truy cập giáo viên vào phần cấu hình đầu mã nguồn.</li><li>Deploy Apps Script thành Web App, sao chép URL kết thúc bằng <code>/exec</code>.</li><li>Dán URL vào đây, đăng xuất và đăng nhập lại bằng mã truy cập giáo viên.</li><li>Tạo/ngập ngân hàng câu hỏi, tạo đợt kiểm tra, sao chép link và gửi qua Zalo cho học sinh.</li><li>Xem kết quả và tải bảng điểm CSV để mở bằng Excel.</li></ol><div class="notice">Lưu ý: bản này dùng một mã truy cập giáo viên chung. Nếu cần mỗi giáo viên có tài khoản riêng, phân quyền theo tổ/nhóm, ngân hàng câu hỏi dùng chung hoặc kỳ thi quy mô lớn, cần nâng cấp sang backend có xác thực người dùng (ví dụ Firebase/Supabase).</div></div>`;
  $('#saveSettings').onclick=async()=>{const url=$('#settingsApi').value.trim();try{const u=new URL(url);if(!isValidApiEndpoint(url))throw new Error('URL phải là Web App Apps Script dạng /macros/s/.../exec.');state.api=url;localStorage.setItem(STORE.api,url);await refreshExams();notify('Kết nối máy chủ thành công.');renderShell();}catch(err){notify(err.message,'error');}};
  $('#localMode').onclick=()=>{state.api='';state.token='';localStorage.removeItem(STORE.api);state.exams=localExams().map(x=>({id:x.id,title:x.title,className:x.className,duration:x.duration,status:x.status,questionCount:x.questions.length}));notify('Đã chuyển sang chế độ cục bộ.');renderShell();};
}

function studentStartView(ex) {
  const saved=readStudentSession(ex.id);
  if(saved && saved.attempt && new Date(saved.attempt.expiresAt).getTime()<=Date.now()) { $('#app').innerHTML='<div class="student-wrap"><div class="panel empty">Lượt làm bài đã hết thời gian. Hệ thống không cho phép bắt đầu lại lượt thi đã hết hạn. Vui lòng liên hệ giáo viên.</div></div>';return; }
  if(saved && saved.attempt && new Date(saved.attempt.expiresAt).getTime()>Date.now()) {
    state.currentExam=ex;state.student=saved.student;state.attempt=saved.attempt;state.answers=saved.answers||{};state.remaining=Math.max(0,Math.floor((new Date(saved.attempt.expiresAt).getTime()-Date.now())/1000));renderStudentQuestions();startTimer();return;
  }
  $('#app').innerHTML=`<div class="student-wrap"><div class="panel"><span class="eyebrow">BÀI KIỂM TRA TRỰC TUYẾN</span><h1>${escapeHtml(ex.title)}</h1><p class="muted">Lớp: ${escapeHtml(ex.className||'Chưa quy định')} · Thời lượng: ${Number(ex.duration)} phút · ${ex.questions.length} câu</p><div class="notice">Nhập đúng họ tên và lớp trước khi bắt đầu. Máy chủ cấp một lượt làm bài cho mỗi mã học sinh; nếu không nhập mã, hệ thống dùng họ tên và lớp để đối chiếu lượt thi.</div><form id="studentStartForm"><div class="form-grid"><div class="field"><label for="studentName">Họ và tên học sinh *</label><input id="studentName" maxlength="120" required autocomplete="name" placeholder="Nguyễn Văn A"></div><div class="field"><label for="studentClass">Lớp *</label><input id="studentClass" maxlength="60" required value="${escapeHtml(ex.className||'')}" placeholder="12A1"></div><div class="field"><label for="studentId">Mã học sinh (khuyến nghị)</label><input id="studentId" maxlength="80" placeholder="Mã học sinh do nhà trường cấp"></div></div><button class="btn" id="beginExamButton" type="submit">Bắt đầu làm bài →</button></form></div><div class="footer">TVD · Không tải lại trang trong khi đang làm bài</div></div>`;
  $('#studentStartForm').addEventListener('submit',()=>beginStudentExam(ex.id));
}
function readStudentSession(examId){try{return JSON.parse(sessionStorage.getItem('tvd_session_'+examId)||'null')}catch{return null}}
function saveStudentSession(){if(state.currentExam&&state.attempt)sessionStorage.setItem('tvd_session_'+state.currentExam.id,JSON.stringify({student:state.student,attempt:state.attempt,answers:state.answers}));}
async function beginStudentExam(examId) {
  const button=$('#beginExamButton');if(!$('#studentStartForm').reportValidity())return;
  const student={name:$('#studentName').value.trim(),className:$('#studentClass').value.trim(),studentId:$('#studentId').value.trim()};button.disabled=true;button.textContent='Đang khởi tạo lượt thi…';
  try {
    const attempt=await api('start',{examId,...student});if(!attempt||!attempt.attemptId)throw new Error('Máy chủ không cấp được lượt làm bài.');
    const ex=await api('get',{id:examId});if(!ex)throw new Error('Không tải được nội dung đề thi.');
    state.currentExam=ex;state.student=student;state.attempt=attempt;state.answers={};state.remaining=Math.max(0,Math.floor((new Date(attempt.expiresAt).getTime()-Date.now())/1000));saveStudentSession();renderStudentQuestions();startTimer();
  }catch(err){notify(err.message,'error');button.disabled=false;button.textContent='Bắt đầu làm bài →';}
}
function renderStudentQuestions() {
  const ex=state.currentExam;$('#app').innerHTML=`<div class="student-wrap"><div class="panel student-head"><div><span class="eyebrow">ĐANG LÀM BÀI</span><h2 style="margin:7px 0 2px">${escapeHtml(ex.title)}</h2><div class="tiny muted">${escapeHtml(state.student.name)} · ${escapeHtml(state.student.className)}</div></div><div class="timer" id="examTimer">${formatTime(state.remaining)}</div></div><div class="notice">Bài làm sẽ tự động nộp khi hết giờ. Không đóng trình duyệt hoặc chia sẻ đường link trong khi làm bài.</div><div id="studentQuestions">${ex.questions.map((q,i)=>studentQuestionHTML(q,i)).join('')}</div><div class="panel"><div class="row between"><span class="muted" id="answeredCount"></span><button class="btn" id="submitExamButton">Nộp bài</button></div></div></div>`;
  $$('.student-answer').forEach(input=>{
    const update=()=>{state.answers[input.dataset.qid]=input.type==='radio'?input.value:input.value;saveStudentSession();updateAnsweredCount();};
    input.addEventListener(input.type==='radio'?'change':'input',update);
    if(input.type==='radio'&&state.answers[input.dataset.qid]===input.value)input.checked=true;
    if(input.type!=='radio'&&state.answers[input.dataset.qid]!==undefined)input.value=state.answers[input.dataset.qid];
  });
  $('#submitExamButton').onclick=()=>submitStudentExam(false);updateAnsweredCount();
}
function studentQuestionHTML(q,i) {
  const point=Number(q.point)||0;
  let controls='';
  if(q.type==='mcq') controls=Object.entries(q.options||{}).map(([k,v])=>`<label class="answer-option"><input class="student-answer" type="radio" name="${escapeHtml(q.id)}" data-qid="${escapeHtml(q.id)}" value="${escapeHtml(k)}"><span><strong>${escapeHtml(k)}.</strong> ${escapeHtml(v)}</span></label>`).join('');
  else if(q.type==='truefalse') controls=['Đ','S'].map((v,j)=>`<label class="answer-option"><input class="student-answer" type="radio" name="${escapeHtml(q.id)}" data-qid="${escapeHtml(q.id)}" value="${v}"><span>${j===0?'Đúng':'Sai'}</span></label>`).join('');
  else controls=`<div class="field"><input class="student-answer" type="text" data-qid="${escapeHtml(q.id)}" maxlength="200" placeholder="Nhập câu trả lời"></div>`;
  return `<article class="panel student-question"><div class="row between"><h3>Câu ${i+1}</h3><span class="pill">${point} điểm</span></div><div style="white-space:pre-wrap;margin:10px 0 14px">${escapeHtml(q.text)}</div>${controls}</article>`;
}
function updateAnsweredCount(){const node=$('#answeredCount');if(!node)return;const total=state.currentExam.questions.length,done=state.currentExam.questions.filter(q=>String(state.answers[q.id]??'').trim()!=='').length;node.textContent=`Đã trả lời ${done}/${total} câu`;}
function formatTime(seconds){seconds=Math.max(0,Math.floor(seconds));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
function startTimer(){clearInterval(state.timer);state.timer=setInterval(()=>{if(!state.attempt)return;state.remaining=Math.max(0,Math.floor((new Date(state.attempt.expiresAt).getTime()-Date.now())/1000));const node=$('#examTimer');if(node)node.textContent=formatTime(state.remaining);if(state.remaining<=0){clearInterval(state.timer);submitStudentExam(true);}},500);}
async function submitStudentExam(autoSubmit) {
  const button=$('#submitExamButton');if(!autoSubmit&&!confirm('Bạn chắc chắn muốn nộp bài?'))return;if(button){button.disabled=true;button.textContent='Đang nộp bài…';}
  clearInterval(state.timer);
  const result={id:makeId('SUB'),examId:state.currentExam.id,attemptId:state.attempt.attemptId,student:state.student,answers:state.answers,submittedAt:new Date().toISOString()};
  try {
    await api('submit',result);sessionStorage.removeItem('tvd_session_'+state.currentExam.id);
    $('#app').innerHTML=`<div class="student-wrap"><div class="panel" style="text-align:center;padding:40px 20px"><div style="font-size:48px">✓</div><h1>Đã nộp bài thành công!</h1><p>${escapeHtml(state.student.name)} · ${escapeHtml(state.student.className)}</p><p class="muted">Bài làm đã được máy chủ ghi nhận. Giáo viên sẽ xem điểm trong trang quản lý.</p><span class="pill green">ĐÃ GHI NHẬN BÀI NỘP</span></div></div>`;
  }catch(err){if(button){button.disabled=false;button.textContent='Thử gửi lại bài';}notify(err.message,'error');}
}


// ---------------- NGAN HANG CAU HOI & NHAP TU FILE ----------------
function bankQuestionKey(q){return normalizeAnswer(q.text)+'|'+String(q.type||'short');}
function normalizeTFAnswer(answer){const v=String(answer||'').trim().toLocaleLowerCase('vi-VN');if(['đ','d','đúng','true'].includes(v))return 'Đ';if(['s','sai','false'].includes(v))return 'S';return ''; }
function normalizeImportedQuestion(q){
  const out={...q};out.id=out.id||makeId('Q');out.text=String(out.text||out.question||out.content||'').trim();
  const aliases={'mcq':'mcq','tracnghiem':'mcq','multiplechoice':'mcq','dungsai':'truefalse','truefalse':'truefalse','short':'short','traloingan':'short','shortanswer':'short'};const rawType=String(out.type||'').toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z]/g,'');
  const rawOptions=Array.isArray(out.options)?Object.fromEntries(out.options.map((v,i)=>[['A','B','C','D'][i],v]).filter(x=>x[0])):(out.options&&typeof out.options==='object'?out.options:{});
  out.type=['mcq','truefalse','short'].includes(out.type)?out.type:(aliases[rawType]||(Object.values(rawOptions).filter(v=>String(v||'').trim()).length===4?'mcq':'short'));
  out.point=Number(out.point)||1;out.options=rawOptions;
  out.answer=String(out.answer??'').trim();out.tolerance=Math.max(0,Number(out.tolerance)||0);out.explain=String(out.explain||'').trim();
  if(out.type==='mcq'&&out.answer)out.answer=out.answer.toUpperCase();
  if(out.type==='truefalse'&&out.answer)out.answer=normalizeTFAnswer(out.answer);
  out.needsAnswer=!out.answer;
  return out;
}
async function loadBank(){state.bank=await api('bankList');if(!Array.isArray(state.bank))state.bank=[];return state.bank;}
function renderBank(root){
  root.innerHTML=`<div class="panel"><div class="row between"><div><h2>Ngân hàng câu hỏi TVD</h2><div class="tiny muted">Nhập câu hỏi từ tệp, tự cập nhật câu trùng và tái sử dụng cho nhiều đợt kiểm tra.</div></div><span class="auth-chip" id="bankCount">Đang tải…</span></div>
  <div class="import-drop"><div class="import-icon">⇧</div><div><strong>Nhập câu hỏi từ tệp</strong><div class="tiny muted">Hỗ trợ .DOCX, .PDF có văn bản, .XLSX, .XLS, .CSV, .JSON và .TXT theo mẫu TVD.</div></div></div>
  <div class="form-grid"><div class="field"><label for="bankFile">Chọn tệp đề / ngân hàng câu hỏi</label><input id="bankFile" type="file" accept=".docx,.pdf,.xlsx,.xls,.csv,.json,.txt"></div><div class="field"><label for="bankDefaultPoint">Điểm mặc định nếu tệp không ghi điểm</label><input id="bankDefaultPoint" type="number" min="0.01" step="0.01" value="1"></div></div>
  <div class="row"><button class="btn" id="readBankFile">Đọc tệp và xem trước</button><button class="btn btn-light" id="downloadCsvTemplate">Tải mẫu Excel/CSV</button><button class="btn btn-light" id="downloadJsonTemplate">Tải mẫu JSON</button></div>
  <div id="importPreview" class="import-preview hidden"></div>
  </div>
  <div class="panel"><div class="row between"><div><h2>Danh sách câu hỏi đã lưu</h2><div class="tiny muted">Câu hỏi trùng nội dung và cùng dạng sẽ được cập nhật, không tạo bản sao.</div></div><button class="btn btn-soft" id="createFromBank">Tạo đề từ câu đã chọn</button></div>
  <div class="field"><input id="bankSearch" type="search" placeholder="Tìm nội dung câu hỏi, đáp án, dạng câu…"></div><div id="bankList" class="bank-list"><div class="empty">Đang tải ngân hàng câu hỏi…</div></div></div>`;
  $('#readBankFile').onclick=readSelectedBankFile;$('#downloadCsvTemplate').onclick=downloadBankCsvTemplate;$('#downloadJsonTemplate').onclick=downloadBankJsonTemplate;
  $('#createFromBank').onclick=createExamFromSelectedBank;$('#bankSearch').oninput=()=>drawBankList();
  loadBank().then(()=>{drawBankList();$('#bankCount').textContent=state.bank.length+' câu hỏi';}).catch(e=>{ $('#bankList').innerHTML=`<div class="notice error">${escapeHtml(e.message)}</div>`;$('#bankCount').textContent='Lỗi tải';});
}
function drawBankList(){
  const root=$('#bankList');if(!root)return;const term=normalizeAnswer($('#bankSearch')?.value||'');const list=state.bank.filter(q=>!term||normalizeAnswer([q.text,q.answer,q.type,q.explain].join(' ')).includes(term));
  if(!list.length){root.innerHTML='<div class="empty">Chưa có câu hỏi phù hợp. Hãy nhập tệp ở phía trên.</div>';return;}
  root.innerHTML=list.map(q=>`<article class="bank-item"><label class="bank-select"><input type="checkbox" class="bank-check" value="${escapeHtml(q.id)}"><span>Chọn</span></label><div class="bank-main"><div class="row"><span class="pill">${q.type==='mcq'?'Trắc nghiệm':q.type==='truefalse'?'Đúng/Sai':'Trả lời ngắn'}</span><span class="tiny muted">${Number(q.point)||1} điểm</span></div><div class="bank-question">${escapeHtml(q.text)}</div><div class="tiny muted">${q.answer?`Đáp án: <b>${escapeHtml(q.answer)}</b>`:'<span class="pill amber">Cần bổ sung đáp án</span>'}${q.explain?' · Có lời giải':''}</div></div><button class="btn btn-small btn-danger" data-bank-delete="${escapeHtml(q.id)}">Xóa</button></article>`).join('');
  $$('[data-bank-delete]',root).forEach(btn=>btn.onclick=async()=>{if(!confirm('Xóa câu hỏi này khỏi ngân hàng?'))return;try{await api('bankDelete',{id:btn.dataset.bankDelete});await loadBank();drawBankList();$('#bankCount').textContent=state.bank.length+' câu hỏi';notify('Đã xóa câu hỏi khỏi ngân hàng.');}catch(e){notify(e.message,'error');}});
}
async function openBankPicker(){
  try{await loadBank();}catch(e){notify(e.message,'error');return;}
  if(!state.bank.length){notify('Ngân hàng chưa có câu hỏi. Hãy nhập tệp trước.','error');return;}
  const selected=prompt('Nhập số thứ tự câu hỏi trong ngân hàng, cách nhau bằng dấu phẩy.\n\n'+state.bank.map((q,i)=>`${i+1}. ${q.text.slice(0,110)} [${q.type}]`).join('\n'));
  if(!selected)return;const indexes=selected.split(/[,;\s]+/).map(x=>Number(x.trim())-1).filter(i=>Number.isInteger(i)&&i>=0&&i<state.bank.length);
  if(!indexes.length){notify('Chưa chọn được câu hỏi hợp lệ.','error');return;}indexes.forEach(i=>addQuestionCard({...state.bank[i],id:makeId('Q')}));notify('Đã đưa '+indexes.length+' câu vào đề đang soạn.');
}
function createExamFromSelectedBank(){const ids=$$('.bank-check:checked').map(x=>x.value);if(!ids.length){notify('Chọn ít nhất một câu hỏi.','error');return;}state.pendingQuestions=state.bank.filter(q=>ids.includes(q.id)).map(q=>({...q,id:makeId('Q')}));state.editing=null;go('create');}
async function readSelectedBankFile(){
  const input=$('#bankFile'),file=input?.files?.[0];if(!file){notify('Hãy chọn một tệp trước.','error');return;}
  const button=$('#readBankFile');button.disabled=true;button.textContent='Đang đọc tệp…';
  try{
    const result=await readQuestionFile(file);const questions=(result.questions||[]).map((q,i)=>normalizeImportedQuestion({...q,id:makeId('Q'),point:q.point||Number($('#bankDefaultPoint').value)||1}));
    const errors=[];questions.forEach((q,i)=>{const error=validateImportedQuestion(q);if(error)errors.push(`Câu ${i+1}: ${error}`);});
    state.importPreview=questions.filter(q=>!validateImportedQuestion(q));state.importErrors=[...((result.errors)||[]),...errors];
    drawImportPreview(file.name,result.note||'');
  }catch(e){notify(e.message,'error');}
  finally{button.disabled=false;button.textContent='Đọc tệp và xem trước';}
}
function validateImportedQuestion(q){
  if(!q.text)return 'thiếu nội dung.';if(!(Number(q.point)>0))return 'điểm phải lớn hơn 0.';
  if(q.type==='mcq'){if(q.answer&&!['A','B','C','D'].includes(q.answer.toUpperCase()))return 'đáp án trắc nghiệm phải là A/B/C/D.';if(!['A','B','C','D'].every(k=>String(q.options?.[k]||'').trim()))return 'thiếu phương án A, B, C hoặc D.';}
  if(q.type==='truefalse'&&q.answer&&!['Đ','S'].includes(normalizeTFAnswer(q.answer)))return 'đáp án Đúng/Sai phải là Đ hoặc S.';
  if(!['mcq','truefalse','short'].includes(q.type))return 'dạng câu chưa được hỗ trợ.';return '';
}
function drawImportPreview(filename,note=''){
  const box=$('#importPreview');if(!box)return;box.classList.remove('hidden');const valid=state.importPreview.length,errors=state.importErrors.length;
  const keySet=new Set(state.bank.map(bankQuestionKey));const duplicate=state.importPreview.filter(q=>keySet.has(bankQuestionKey(q))).length;
  box.innerHTML=`<div class="row between"><div><h3>Kết quả đọc tệp: ${escapeHtml(filename)}</h3><div class="tiny muted">${note?escapeHtml(note)+' · ':''}${valid} câu hợp lệ · ${errors} lỗi cần xử lý · ${duplicate} câu trùng sẽ được cập nhật</div></div><button class="btn" id="commitBankImport" ${valid?'':'disabled'}>Cập nhật ngân hàng (${valid})</button></div>
  ${errors?`<div class="notice error"><b>Các dòng chưa nhập được</b><br>${state.importErrors.slice(0,12).map(escapeHtml).join('<br>')}${errors>12?`<br>… và ${errors-12} lỗi khác`:''}</div>`:''}
  ${valid?state.importPreview.slice(0,20).map((q,i)=>`<div class="preview-row"><b>${i+1}.</b><div><span class="pill">${q.type==='mcq'?'Trắc nghiệm':q.type==='truefalse'?'Đúng/Sai':'Trả lời ngắn'}</span> <span class="tiny muted">${q.point} điểm</span><div>${escapeHtml(q.text)}</div><div class="tiny muted">${q.answer?`Đáp án: ${escapeHtml(q.answer)}`:'<span class="pill amber">Chưa có đáp án – bổ sung trong trình soạn đề</span>'}</div></div></div>`).join('')+(valid>20?`<div class="tiny muted">Còn ${valid-20} câu khác trong danh sách.</div>`:''):'<div class="empty">Không tìm thấy câu hỏi hợp lệ. Hãy kiểm tra mẫu tệp ở README.</div>'}`;
  $('#commitBankImport')?.addEventListener('click',commitBankImport);
}
async function commitBankImport(){
  const questions=state.importPreview;if(!questions.length)return;if(questions.length>150){notify('Mỗi lần nhập tối đa 150 câu. Hãy chia tệp thành nhiều phần.','error');return;}const bytes=new TextEncoder().encode(JSON.stringify({questions})).length;if(bytes>420000){notify('Tệp câu hỏi quá lớn cho một lần đồng bộ. Hãy chia thành các tệp nhỏ hơn.','error');return;}const btn=$('#commitBankImport');btn.disabled=true;btn.textContent='Đang cập nhật…';
  try{const result=await api('bankImport',{questions});await loadBank();drawBankList();$('#bankCount').textContent=state.bank.length+' câu hỏi';$('#importPreview').innerHTML=`<div class="notice success">Đã cập nhật ngân hàng câu hỏi. Tổng hiện có: ${state.bank.length} câu. Câu trùng được cập nhật, câu mới được thêm vào.</div>`;state.importPreview=[];notify('Cập nhật ngân hàng câu hỏi thành công.');}
  catch(e){btn.disabled=false;btn.textContent='Thử cập nhật lại';notify(e.message,'error');}
}
async function readQuestionFile(file){
  const ext=file.name.split('.').pop().toLowerCase();
  if(ext==='json'){const data=JSON.parse(await file.text());const arr=Array.isArray(data)?data:data.questions;if(!Array.isArray(arr))throw new Error('JSON phải là một mảng câu hỏi hoặc đối tượng có thuộc tính questions.');return {questions:arr};}
  if(ext==='csv'){return {questions:parseQuestionRows(parseCSV(await file.text()))};}
  if(ext==='xlsx'||ext==='xls'){
    await loadExternalScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','XLSX');const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array'});let rows=[];for(const name of wb.SheetNames)rows.push(...XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:'',raw:false}));return {questions:parseQuestionRows(rows),note:`Đã đọc ${wb.SheetNames.length} sheet Excel.`};
  }
  if(ext==='docx'){
    await loadExternalScript('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js','mammoth');const buf=await file.arrayBuffer();const result=await mammoth.extractRawText({arrayBuffer:buf});return {questions:parseQuestionText(result.value),note:'Đã trích xuất văn bản Word. Vui lòng rà soát công thức và ký hiệu toán học trong phần xem trước.'};
  }
  if(ext==='pdf'){
    await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','pdfjsLib');
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let pages=[];
    for(let p=1;p<=pdf.numPages;p++){
      const page=await pdf.getPage(p);const content=await page.getTextContent();let grouped=[];
      for(const item of content.items){const y=Math.round(item.transform?.[5]||0);let line=grouped.find(x=>x.y===y);if(!line){line={y,text:[]};grouped.push(line);}line.text.push(item.str);}
      grouped.sort((a,b)=>b.y-a.y);pages.push(grouped.map(x=>x.text.join(' ')).join('\n'));
    }
    return {questions:parseQuestionText(pages.join('\n')),note:'PDF đã trích xuất lớp văn bản. PDF scan/ảnh không có OCR trong bản này; công thức cần kiểm tra lại.'};
  }
  if(ext==='txt'){return {questions:parseQuestionText(await file.text())};}
  throw new Error('Định dạng chưa hỗ trợ. Chọn DOCX, PDF có văn bản, XLSX, XLS, CSV, JSON hoặc TXT.');
}
function loadExternalScript(src,globalName){return new Promise((resolve,reject)=>{if(window[globalName])return resolve();const existing=[...document.scripts].find(x=>x.src===src);if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error('Không tải được thư viện đọc tệp. Kiểm tra Internet.')),{once:true});return;}const script=document.createElement('script');script.src=src;script.onload=()=>window[globalName]?resolve():reject(new Error('Thư viện đọc tệp không khởi tạo được.'));script.onerror=()=>reject(new Error('Không tải được thư viện đọc tệp từ CDN. Kiểm tra Internet.'));document.head.appendChild(script);});}
function parseCSV(text){
  text=String(text||'').replace(/^\uFEFF/,'');const first=(text.split(/\r?\n/)[0]||'');const delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':(first.includes('\t')?'\t':',');
  const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(ch===delimiter&&!quoted){row.push(cell);cell='';}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>String(x).trim()))rows.push(row);row=[];cell='';}else cell+=ch;}row.push(cell);if(row.some(x=>String(x).trim()))rows.push(row);
  if(rows.length<2)throw new Error('CSV cần có dòng tiêu đề và ít nhất một dòng câu hỏi.');const headers=rows.shift().map(x=>String(x).trim());return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}
function keyColumn(s){return String(s||'').trim().toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]/g,'');}
function parseQuestionRows(rows){
  return rows.map(row=>{const o={};for(const [k,v] of Object.entries(row))o[keyColumn(k)]=v;const pick=(...keys)=>{for(const k of keys){const v=o[keyColumn(k)];if(v!==undefined&&String(v).trim()!=='')return v;}return '';};
    let options={A:pick('A','Phương án A','Dap an A'),B:pick('B','Phương án B'),C:pick('C','Phương án C'),D:pick('D','Phương án D')};
    const rawType=keyColumn(pick('type','dạng','loại câu hỏi','dang cau hoi'));const answer=String(pick('answer','đáp án','dap an','key','đáp án đúng','đáp án chuẩn','dap an dung','answer key')).trim();let type=rawType.includes('true')||rawType.includes('dungsai')?'truefalse':rawType.includes('short')||rawType.includes('ngan')?'short':rawType.includes('mcq')||rawType.includes('tracnghiem')?'mcq':(Object.values(options).every(x=>String(x).trim())?'mcq':(['đ','s','d','đúng','sai'].includes(answer.toLowerCase())?'truefalse':'short'));
    const opts=Object.fromEntries(Object.entries(options).map(([k,v])=>[k,String(v??'').trim()]));return {text:pick('text','question','câu hỏi','cau hoi','nội dung','noi dung','nội dung câu hỏi','noi dung cau hoi','question text'),type,point:Number(String(pick('point','điểm','diem','điểm số','diem so')).replace(',','.'))||1,options:opts,answer,tolerance:Number(String(pick('tolerance','dung sai','dung sai so')).replace(',','.'))||0,explain:pick('explain','lời giải','loi giai','giải thích')};
  }).filter(q=>q.text||q.answer);
}
function parseQuestionText(raw){
  const lines=String(raw||'').replace(/\r/g,'').replace(/\u00a0/g,' ').split('\n').map(x=>x.trim()).filter(x=>x);
  const starts=/^(?:câu|cau|question|q)\s*\d+\s*[:.)\-]\s*/i;const simple=/^\d{1,3}[.)]\s+\S/;
  const blocks=[];let current=null;for(const line of lines){if(starts.test(line)||(!current&&simple.test(line))||(current&&simple.test(line)&&/^(?:\d{1,3})[.)]\s/.test(line)&&current.hasBody)){
      if(current)blocks.push(current);current={lines:[line.replace(starts,'').replace(/^\d{1,3}[.)]\s*/, '')],hasBody:true};
    }else if(current)current.lines.push(line);}
  if(current)blocks.push(current);if(!blocks.length&&lines.length)blocks.push({lines});
  return blocks.map(block=>{
    let text=[],opts={},answer='',point=1,explain=[],optionKey='';
    for(const line of block.lines){
      let m;if((m=line.match(/^(?:đáp án|dap an|answer|key)(?:\s*câu\s*\d+)?\s*[:：]\s*(.+)$/i))){answer=m[1].trim();optionKey='';continue;}
      if((m=line.match(/^(?:điểm|diem|point)\s*[:：]\s*([\d.,]+)$/i))){point=Number(m[1].replace(',','.'))||1;optionKey='';continue;}
      if((m=line.match(/^(?:lời giải|loi giai|giải thích|giai thich|explanation)\s*[:：]\s*(.*)$/i))){if(m[1])explain.push(m[1]);optionKey='explain';continue;}
      if((m=line.match(/^([ABCD])\s*[.)\]:]\s*(.*)$/i))){optionKey=m[1].toUpperCase();opts[optionKey]=m[2].trim();continue;}
      if(optionKey&&optionKey!=='explain'){opts[optionKey]+=' '+line;continue;}if(optionKey==='explain'){explain.push(line);continue;}text.push(line);
    }
    const tf=['đ','s','đúng','sai','true','false'].includes(answer.trim().toLocaleLowerCase('vi-VN'));const hasOptions=['A','B','C','D'].every(k=>String(opts[k]||'').trim());let type=hasOptions?'mcq':tf?'truefalse':'short';
    if(type==='mcq'){const key=answer.match(/^\s*[\[(]?([ABCD])(?:\b|[.)\]:])/i);if(key)answer=key[1].toUpperCase();}
    if(type==='truefalse')answer=normalizeTrueFalse(answer);
    return {text:text.join('\n').trim(),type,point,options:opts,answer,tolerance:0,explain:explain.join('\n').trim()};
  }).filter(q=>q.text);
}
function downloadTextFile(filename,content,mime){const blob=new Blob([content],{type:mime||'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function downloadBankCsvTemplate(){const csv='Câu hỏi,Dạng,Điểm,A,B,C,D,Đáp án,Dung sai,Lời giải\n"Giá trị của 2+3 bằng bao nhiêu?",mcq,1,4,5,6,7,B,0,"Vì 2+3=5"\n"Số 0 là số dương.",truefalse,1,,,,,S,0,"Số 0 không phải số dương"\n"Tính 3^2.",short,1,,,,,9,0.01,"3^2=9"';downloadTextFile('Mau_Ngan_Hang_Cau_Hoi_TVD.csv','\ufeff'+csv,'text/csv;charset=utf-8');}
function downloadBankJsonTemplate(){const data={questions:[{text:'Giá trị của 2+3 bằng bao nhiêu?',type:'mcq',point:1,options:{A:'4',B:'5',C:'6',D:'7'},answer:'B',tolerance:0,explain:'Vì 2+3=5.'},{text:'Số 0 là số dương.',type:'truefalse',point:1,options:{},answer:'S',explain:'Số 0 không phải số dương.'},{text:'Tính 3^2.',type:'short',point:1,options:{},answer:'9',tolerance:0.01,explain:'3^2=9.'}]};downloadTextFile('Mau_Ngan_Hang_Cau_Hoi_TVD.json',JSON.stringify(data,null,2),'application/json;charset=utf-8');}

async function route() {
  const params=new URLSearchParams(location.search);const incomingApi=params.get('api');if(incomingApi){if(!isValidApiEndpoint(incomingApi)){$('#app').innerHTML='<div class="student-wrap"><div class="panel empty">Liên kết bài thi chứa địa chỉ máy chủ không hợp lệ. Hãy yêu cầu giáo viên gửi lại link từ ứng dụng TVD.</div></div>';return;}state.api=incomingApi;localStorage.setItem(STORE.api,incomingApi);}else {const savedApi=localStorage.getItem(STORE.api)||'';state.api=isValidApiEndpoint(savedApi)?savedApi:'';}
  const examId=params.get('exam');
  if(examId){
    if(!state.api && !localExams().some(x=>x.id===examId)){ $('#app').innerHTML='<div class="student-wrap"><div class="panel"><h2>Chưa kết nối được đề thi</h2><p>Liên kết này thiếu cấu hình máy chủ. Hãy đề nghị giáo viên gửi lại link mới được tạo từ trang quản lý TVD.</p></div></div>';return; }
    try{const ex=await api('get',{id:examId});if(!ex){$('#app').innerHTML='<div class="student-wrap"><div class="panel empty">Không tìm thấy đợt kiểm tra hoặc đường link không còn hiệu lực.</div></div>';return;}if(ex.status==='closed'){ $('#app').innerHTML='<div class="student-wrap"><div class="panel empty">Đợt kiểm tra đã đóng.</div></div>';return;}ensureExamOpen(ex);studentStartView(ex);}
    catch(err){$('#app').innerHTML=`<div class="student-wrap"><div class="panel"><h2>Không thể mở bài kiểm tra</h2><div class="notice error">${escapeHtml(err.message)}</div></div></div>`;}
    return;
  }
  if(!state.user)showLogin();else{await refreshExams();$('#signedUser').textContent=state.user;$('#logoutButton').classList.remove('hidden');$('#logoutButton').onclick=logout;renderShell();}
}

route().catch(err=>{ $('#app').innerHTML=`<div class="panel"><div class="notice error">${escapeHtml(err.message||'Có lỗi xảy ra khi khởi động ứng dụng.')}</div></div>`; });
