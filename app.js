// ---------- Data ----------
const DORMS = [
{ id:'A', name:'หอ A (ใกล้คณะวิทย์)', rooms:[
{ id:'A101', type:'single', price:850, capacity:1, amenities:['แอร์','Wi‑Fi','โต๊ะอ่านหนังสือ'] },
{ id:'A202', type:'double', price:650, capacity:2, amenities:['พัดลม','Wi‑Fi','ตู้เสื้อผ้า'] },
]},
{ id:'B', name:'หอ B (ใกล้โรงอาหารกลาง)', rooms:[
{ id:'B303', type:'single', price:900, capacity:1, amenities:['แอร์','Wi‑Fi','น้ำอุ่น'] },
{ id:'B404', type:'double', price:700, capacity:2, amenities:['แอร์','Wi‑Fi','ระเบียง'] },
]},
{ id:'C', name:'หอ C (ติดสนามกีฬา)', rooms:[
{ id:'C105', type:'double', price:680, capacity:2, amenities:['พัดลม','Wi‑Fi','ปลั๊กเยอะ'] },
{ id:'C210', type:'single', price:880, capacity:1, amenities:['แอร์','Wi‑Fi','ใกล้ลิฟต์'] },
]},
];


const bookingsKey = 'ku-halloween-bookings';
// ---------- Helpers ----------
const el = (sel, root=document) => root.querySelector(sel);
const els = (sel, root=document) => [...root.querySelectorAll(sel)];
const money = n => new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB'}).format(n);
const parseDate = s => s ? new Date(s+'T00:00:00') : null;
const daysBetween = (a,b) => Math.max( ( (b - a) / (1000*60*60*24) ), 0 );
const toISO = d => d.toISOString().slice(0,10);
const todayISO = () => toISO(new Date());


function loadBookings(){ try{ return JSON.parse(localStorage.getItem(bookingsKey) || '[]'); }catch{ return []; } }
function saveBookings(arr){ localStorage.setItem(bookingsKey, JSON.stringify(arr)); }
function dateRangesOverlap(aStart,aEnd,bStart,bEnd){ return (aStart < bEnd) && (bStart < aEnd); }


function allRoomItems(){ return DORMS.flatMap(d => d.rooms); }


// ---------- Render rooms ----------
function renderRooms(list){
const grid = el('#roomGrid');
grid.innerHTML = '';
const tpl = el('#roomCardTpl');
list.forEach(r => {
const node = tpl.content.cloneNode(true);
el('.title', node).textContent = `${r.id} · ${r.type==='single'?'เดี่ยว':'คู่'}`;
el('.cap', node).textContent = `รองรับ ${r.capacity} คน`;
el('.price', node).textContent = money(r.price) + '/คืน';
el('.type', node).textContent = r.type==='single'?'ห้องเดี่ยว':'ห้องพักคู่';
el('.dorm', node).textContent = `อาคาร ${r.id[0]}`;
el('.amen', node).textContent = r.amenities.slice(0,2).join(' • ');


el('.preview', node).addEventListener('click', () => {
const md = el('#resultModal');
el('#modalTitle').textContent = `รายละเอียดห้อง ${r.id}`;
el('#modalBody').innerHTML = `
<div style="display:grid;gap:8px">
<div><b>ประเภท:</b> ${r.type==='single'?'เดี่ยว':'คู่'} | <b>รองรับ:</b> ${r.capacity} คน</div>
<div><b>ราคา:</b> ${money(r.price)}/คืน</div>
<div><b>สิ่งอำนวยความสะดวก:</b> ${r.amenities.join(', ')}</div>
<div class="help">Tip: คลิก \"จองห้องนี้\" แล้วเลื่อนลงไปที่ฟอร์ม ระบบจะกรอกประเภทห้องให้อัตโนมัติ</div>
</div>`;
md.showModal();
});
els('a', node)[0].addEventListener('click', () => {
el('#roomType').value = r.type;
window.location.hash = '#book';
calcPrice();
});


grid.appendChild(node);
});
}
// ---------- Quick Search ----------
function quickSearch(){
const type = el('#qType').value;
const max = parseInt(el('#qBudget').value || '999999', 10);
const ci = parseDate(el('#qCheckIn').value);
const co = parseDate(el('#qCheckOut').value);
const result = el('#quickResult');


const rooms = allRoomItems().filter(r => (!type || r.type===type) && r.price <= max);


let available = rooms;
if(ci && co && co>ci){
const bks = loadBookings();
available = rooms.filter(r => !bks.some(b => b.roomId===r.id && dateRangesOverlap(ci,co, new Date(b.checkIn), new Date(b.checkOut))));
}
renderRooms(available);
result.textContent = `พบห้องที่ตรงเงื่อนไข ${available.length} ห้อง`;
}


// ---------- Populate form ----------
function fillDorms(){
const sel = el('#dorm');
sel.innerHTML = DORMS.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
}


function defaultDates(){
const ci = el('#checkIn');
const co = el('#checkOut');
const t = new Date();
const tomorrow = new Date(t.getFullYear(), t.getMonth(), t.getDate()+1);
const next2 = new Date(t.getFullYear(), t.getMonth(), t.getDate()+2);
ci.min = todayISO(); co.min = todayISO();
ci.value = toISO(tomorrow); co.value = toISO(next2);
el('#qCheckIn').min = el('#qCheckOut').min = todayISO();
}
// ---------- Pricing ----------

function calcPrice(){
const nights = getNightCount();
if(!nights){ el('#priceSummary').textContent = 'สรุคราคา: –'; return; }
const per = basePricePerNight();
const subtotal = per * nights;
const discount = promoDiscount(subtotal);
const total = Math.max(0, subtotal - discount);
el('#priceSummary').textContent = `สรุคราคา: ${money(per)} × ${nights} คืน = ${money(subtotal)} − ส่วนลด ${money(discount)} ⇒ รวมทั้งสิ้น ${money(total)}`;
return { nights, per, subtotal, discount, total };
}


// ---------- Submit booking ----------
function handleSubmit(e){
e.preventDefault();
const ci = parseDate(el('#checkIn').value);
const co = parseDate(el('#checkOut').value);
if(!(ci && co) || co<=ci){ alert('กรุณาเลือกวันที่ให้ถูกต้อง'); return; }


const form = {
name: el('#name').value.trim(),
studentId: el('#studentId').value.trim(),
email: el('#email').value.trim(),
phone: el('#phone').value.trim(),
dorm: el('#dorm').value,
roomType: el('#roomType').value,
checkIn: el('#checkIn').value,
checkOut: el('#checkOut').value,
guests: parseInt(el('#guests').value||'1',10),
promo: (el('#promo').value||'').trim(),
notes: el('#notes').value.trim(),
};


const candidates = DORMS.find(d=>d.id===form.dorm).rooms.filter(r=>r.type===form.roomType);
const bks = loadBookings();
const ciD = parseDate(form.checkIn), coD = parseDate(form.checkOut);
const available = candidates.find(r => !bks.some(b => b.roomId===r.id && dateRangesOverlap(ciD,coD,new Date(b.checkIn),new Date(b.checkOut))));
if(!available){ alert('ช่วงวันดังกล่าว ห้องประเภทนี้เต็มแล้ว ลองเลือกวันที่อื่นหรือตึกอื่น'); return; }


const price = calcPrice();
const id = 'KU-'+Date.now().toString(36).toUpperCase();
const record = { id, roomId: available.id, ...form, total: price.total };
bks.push(record); saveBookings(bks);


el('#modalTitle').textContent = '🎃 การจองสำเร็จ!';
el('#modalBody').innerHTML = `
<div style="display:grid;gap:8px">
<div><b>รหัสการจอง:</b> ${id}</div>
<div><b>ผู้จอง:</b> ${record.name} · <b>นิสิต:</b> ${record.studentId}</div>
<div><b>ห้อง:</b> ${record.roomId} (${record.roomType==='single'?'เดี่ยว':'คู่'}) · <b>อาคาร:</b> ${record.dorm}</div>
<div><b>เข้าพัก:</b> ${record.checkIn} → <b>เช็คเอาต์:</b> ${record.checkOut} · <b>ผู้เข้าพัก:</b> ${record.guests} คน</div>
<div><b>ราคารวม:</b> ${money(record.total)}</div>
<div class="help">* โปรดบันทึกหน้าจอหรือจดรหัสไว้ แอดมินหอจะตรวจสอบหน้างาน (เดโม)</div>
<div style="display:flex;gap:8px;margin-top:6px">
<button class="btn" id="btnCopy">คัดลอกรายละเอียด</button>
<button class="btn ghost" id="btnGoList">ดูการจองของฉัน</button>
</div>
</div>`;
const md = el('#resultModal');
md.showModal();


setTimeout(()=>{
const copy = el('#btnCopy');
copy?.addEventListener('click', async ()=>{
const text = `รหัสการจอง ${id}
ห้อง ${record.roomId} (${record.roomType}) อาคาร ${record.dorm}
เข้าพัก ${record.checkIn} ถึง ${record.checkOut}
รวมทั้งสิ้น ${money(record.total)}`;
try{ await navigator.clipboard.writeText(text); copy.textContent='คัดลอกแล้ว ✓'; }catch{ alert('คัดลอกไม่สำเร็จ'); }
});
el('#btnGoList')?.addEventListener('click', ()=>{ md.close(); showMyBookings(); });
}, 50);


el('#notes').value='';
}
// ---------- My Bookings ----------
function showMyBookings(){
const list = loadBookings();
if(!list.length){ alert('ยังไม่มีการจอง'); return; }
el('#modalTitle').textContent = 'การจองของฉัน';
el('#modalBody').innerHTML = list.map(b=>`
<div class="panel" style="margin-bottom:10px">
<div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
<div>
<div><b>${b.id}</b> · ${b.name}</div>
<div class="help">${b.roomId} · ${b.checkIn} → ${b.checkOut} · ${money(b.total)}</div>
</div>
<div style="display:flex;gap:8px">
<button class="btn" data-copy="${b.id}">คัดลอก</button>
<button class="btn" data-cancel="${b.id}">ยกเลิก</button>
</div>
</div>
</div>`).join('');
const md = el('#resultModal');
md.showModal();


el('#modalBody').addEventListener('click', async (ev)=>{
const copyId = ev.target.getAttribute?.('data-copy');
const cancelId = ev.target.getAttribute?.('data-cancel');
if(copyId){
const b = loadBookings().find(x=>x.id===copyId);
const text = `รหัสการจอง ${b.id}
ห้อง ${b.roomId} อาคาร ${b.dorm}
${b.checkIn} → ${b.checkOut} รวม ${money(b.total)}`;
try{ await navigator.clipboard.writeText(text); ev.target.textContent='คัดลอกแล้ว ✓'; }catch{}
}
if(cancelId){
if(confirm('ยืนยันการยกเลิกการจองนี้?')){
const arr = loadBookings().filter(x=>x.id!==cancelId); saveBookings(arr);
showMyBookings();
}
}
}, { once:false });
}


// ---------- Events ----------
function bindEvents(){
el('#btnQuickSearch').addEventListener('click', quickSearch);
['checkIn','checkOut','roomType','promo'].forEach(id=> el('#'+id).addEventListener('input', calcPrice));
el('#bookingForm').addEventListener('submit', handleSubmit);
el('#btnViewBookings').addEventListener('click', showMyBookings);
el('#btnClear').addEventListener('click', ()=> el('#bookingForm').reset());
}
// ---------- Init ----------
(function init(){
document.getElementById('y').textContent = new Date().getFullYear();
fillDorms();
defaultDates();
renderRooms(allRoomItems());
bindEvents();
calcPrice();
})();