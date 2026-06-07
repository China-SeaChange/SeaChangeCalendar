(function() {
    let currentYear = 2026;
    let currentMonth = new Date().getMonth();
    const STORAGE = { N: 'cal_final_sound_notes', E: 'cal_final_sound_emojis' };
    const DEFAULT_COLOR = '#1F6ED4';
    const PRESET_EMOJIS = [ 
        '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
        '😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥',
        '😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎',
        '🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖',
        '😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽',
        '🤖','🎃','🎄','🎁','📅','🔔','💎','🎵','🎮','🎲','🏆','🚗','🚲','✍️','📸','💻','☕','🍩','🍉','🍓',
        '🍕','🍔','🍟','🌮','🥗','🍜','🍣','🎂','🍪','🍷','🍹','🍺','☀️','🌧️','🌈','❄️','🐱','🐶','🐰','🐼',
        '🐨','🐸','🦊','🐻','🐷','🐮','🐙','🐳','🐬','🌻','🌺','🌲','🌍','⭐','🌙','🔥','💧','🎈','🎀','🎃',
        '🎅','🎄','🎁','🧧','🧨','🏮'
    ];
    // 节假日数据（2026-2030）
    const HOLIDAYS = (function() {
        const holidays = {};
        for (let y = 2026; y <= 2030; y++) {
            holidays[`${y}-01-01`] = [{ text: '🎉元旦', color: '#ffeb3b', remark: '' }];
            holidays[`${y}-05-01`] = [{ text: '💼劳动节', color: '#ffcc80', remark: '' }];
            holidays[`${y}-10-01`] = [{ text: '🇨🇳国庆', color: '#ef9a9a', remark: '' }];
        }
        const springFestival = { 2026: '02-17', 2027: '02-06', 2028: '01-26', 2029: '02-13', 2030: '02-03' };
        const qingming = { 2026: '04-05', 2027: '04-05', 2028: '04-04', 2029: '04-04', 2030: '04-05' };
        const dragonBoat = { 2026: '06-19', 2027: '06-08', 2028: '05-28', 2029: '06-16', 2030: '06-06' };
        const midAutumn = { 2026: '09-25', 2027: '09-15', 2028: '10-03', 2029: '09-22', 2030: '09-12' };
        for (let y = 2026; y <= 2030; y++) {
            const yStr = y.toString();
            holidays[`${y}-${springFestival[yStr]}`] = [{ text: '🧧春节', color: '#ff8a80', remark: '' }];
            holidays[`${y}-${qingming[yStr]}`] = [{ text: '🌿清明', color: '#c5e1a5', remark: '' }];
            holidays[`${y}-${dragonBoat[yStr]}`] = [{ text: '🐲端午', color: '#b3e5fc', remark: '' }];
            holidays[`${y}-${midAutumn[yStr]}`] = [{ text: '🌕中秋', color: '#ffe082', remark: '' }];
        }
        return holidays;
    })();
    const COLOR_PRESETS = ['#B9EDF8', '#39BAE8', '#005DD6', '#0000A1', '#C00000', '#DE3C3C', '#F7B32D', '#7A57D1', '#50C1E9', '#5BE7C4', '#D5A4CF', '#F9BCDD'];

    let allNotes = {}, dateEmojis = {};
    let clipboard = null;
    let selected = new Set();
    let selectedChip = null;
    let isDragging = false, dragStartDate = null, dragRange = new Set();
    let dragNoteData = null;
    let noteIdCounter = 0;
    let curEditDate = null, multiDates = null, editId = null;
    let emojiCollapsed = false;
    let currentTooltip = null;
    let confirmEnterListener = null;
    let activeEditSpan = null;

    // 音效
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playSound(freq, type, duration, volume) {
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.value = volume;
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
            osc.stop(audioCtx.currentTime + duration);
        } catch(e) { }
    }
    function soundClick() { playSound(800, 'sine', 0.08, 0.12); }
    function soundBtn() { playSound(600, 'triangle', 0.1, 0.1); }
    function soundDragStart() { playSound(300, 'square', 0.12, 0.15); }
    function soundDrop() { playSound(650, 'sine', 0.1, 0.12); }
    function soundCopy() { playSound(1200, 'sine', 0.08, 0.1); }
    function soundPaste() { playSound(900, 'sine', 0.08, 0.1); }
    function soundDelete() { playSound(220, 'sawtooth', 0.15, 0.2); }
    function soundSpace() { playSound(1000, 'triangle', 0.12, 0.1); }
    function soundMonthSwitch() { playSound(450, 'sine', 0.08, 0.1); }
    function soundSelectChip() { playSound(700, 'sine', 0.06, 0.1); }
    function soundMultiSelectEnd() { playSound(550, 'triangle', 0.12, 0.12); }

    // 撤销/重做
    let undoStack = [], redoStack = [];
    const MAX_HISTORY = 100;
    function getStateSnapshot() { return { notes: JSON.parse(JSON.stringify(allNotes)), emojis: JSON.parse(JSON.stringify(dateEmojis)) }; }
    function restoreState(snapshot) {
        allNotes = snapshot.notes;
        dateEmojis = snapshot.emojis;
        saveNotes(); saveEmojis(); renderCalendar();
        selected.clear(); clearChipSelection(); dragRange.clear(); refreshVisuals();
        if (document.getElementById('modalOverlay').style.display === 'flex') closeModalImmediately();
    }
    function pushToUndoStack() {
        const snap = getStateSnapshot();
        undoStack.push(snap);
        if (undoStack.length > MAX_HISTORY) undoStack.shift();
        redoStack = [];
    }
    function undo() {
        if (undoStack.length === 0) { showToast('没有可撤销的操作'); return; }
        redoStack.push(getStateSnapshot());
        if (redoStack.length > MAX_HISTORY) redoStack.shift();
        restoreState(undoStack.pop());
        showToast('已撤销'); soundClick();
    }
    function redo() {
        if (redoStack.length === 0) { showToast('没有可重做的操作'); return; }
        undoStack.push(getStateSnapshot());
        if (undoStack.length > MAX_HISTORY) undoStack.shift();
        restoreState(redoStack.pop());
        showToast('已重做'); soundClick();
    }

    // 原始操作函数
    let origAddNote, origUpdateNote, origDeleteNote, origMoveNoteToDate, origReorderNotes, origDeleteNotesAndEmojisForDates, origClearAllEmojisForCurrentTargets, origAddEmojiToTargets;
    function genId() { return 'n' + (++noteIdCounter) + '_' + Date.now(); }
    function saveNotes() { localStorage.setItem(STORAGE.N, JSON.stringify(allNotes)); }
    function saveEmojis() { localStorage.setItem(STORAGE.E, JSON.stringify(dateEmojis)); }
    function getNotes(d) { return allNotes[d] || []; }
    origAddNote = function(d, text, color, spanId, isMilestone, remark = '') {
        if (!allNotes[d]) allNotes[d] = [];
        const n = { id: genId(), text: text.trim(), color: color || DEFAULT_COLOR, spanGroupId: spanId, isMilestone: !!isMilestone, remark: remark || '' };
        allNotes[d].push(n);
        return n;
    };
    origUpdateNote = function(d, id, text, color, isMilestone, remark) {
        const notes = allNotes[d];
        if (!notes) return;
        const note = notes.find(n => n.id === id);
        if (!note) return;
        note.text = text.trim();
        note.color = color || DEFAULT_COLOR;
        note.isMilestone = !!isMilestone;
        if (remark !== undefined) note.remark = remark;
    };
    origDeleteNote = function(d, id) {
        const notes = allNotes[d];
        if (!notes) return;
        const idx = notes.findIndex(n => n.id === id);
        if (idx >= 0) { notes.splice(idx, 1); if (notes.length === 0) delete allNotes[d]; }
    };
    origMoveNoteToDate = function(fromDate, noteId, toDate, insertBeforeId) {
        if (fromDate === toDate && !insertBeforeId) return;
        const fromNotes = allNotes[fromDate];
        if (!fromNotes) return;
        const idx = fromNotes.findIndex(n => n.id === noteId);
        if (idx === -1) return;
        const [note] = fromNotes.splice(idx, 1);
        if (fromNotes.length === 0) delete allNotes[fromDate];
        note.spanGroupId = null;
        if (!allNotes[toDate]) allNotes[toDate] = [];
        if (insertBeforeId) {
            const toIdx = allNotes[toDate].findIndex(n => n.id === insertBeforeId);
            if (toIdx >= 0) allNotes[toDate].splice(toIdx, 0, note);
            else allNotes[toDate].push(note);
        } else { allNotes[toDate].push(note); }
    };
    origReorderNotes = function(dateStr, movingId, targetId) {
        const notes = allNotes[dateStr];
        if (!notes) return;
        const fromIdx = notes.findIndex(n => n.id === movingId);
        const toIdx = notes.findIndex(n => n.id === targetId);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
        const [note] = notes.splice(fromIdx, 1);
        const adjustedToIdx = fromIdx < toIdx ? toIdx - 1 : toIdx;
        notes.splice(adjustedToIdx, 0, note);
    };
    origDeleteNotesAndEmojisForDates = function(dateList) {
        dateList.forEach(d => { if (allNotes[d]) delete allNotes[d]; if (dateEmojis[d]) delete dateEmojis[d]; });
    };
    origClearAllEmojisForCurrentTargets = function() {
        let targetDates = [];
        if (multiDates && multiDates.length) targetDates = [...multiDates];
        else if (curEditDate) targetDates = [curEditDate];
        if (targetDates.length === 0) return;
        targetDates.forEach(d => { if (dateEmojis[d]) delete dateEmojis[d]; });
    };
    origAddEmojiToTargets = function(e) {
        const targetDates = multiDates ? multiDates : (curEditDate ? [curEditDate] : []);
        if (!targetDates.length) return;
        targetDates.forEach(d => {
            if (!dateEmojis[d]) dateEmojis[d] = [];
            dateEmojis[d].push(e);
        });
    };
    function isSameNote(n1, n2) { return n1.text === n2.text && n1.color === n2.color && n1.isMilestone === n2.isMilestone && (n1.remark || '') === (n2.remark || ''); }

    // 带历史的包装函数
    function addNote(d, text, color, spanId, isMilestone, remark) { pushToUndoStack(); const r = origAddNote(d, text, color, spanId, isMilestone, remark); saveNotes(); renderCalendar(); return r; }
    function updateNote(d, id, text, color, isMilestone, remark) { pushToUndoStack(); origUpdateNote(d, id, text, color, isMilestone, remark); saveNotes(); renderCalendar(); }
    function deleteNote(d, id) { pushToUndoStack(); origDeleteNote(d, id); saveNotes(); renderCalendar(); }
    function moveNoteToDate(fromDate, noteId, toDate, insertBeforeId) { pushToUndoStack(); origMoveNoteToDate(fromDate, noteId, toDate, insertBeforeId); saveNotes(); renderCalendar(); }
    function reorderNotes(dateStr, movingId, targetId) { pushToUndoStack(); origReorderNotes(dateStr, movingId, targetId); saveNotes(); renderCalendar(); }
    function deleteNotesAndEmojisForDates(dateList) { pushToUndoStack(); origDeleteNotesAndEmojisForDates(dateList); saveNotes(); saveEmojis(); renderCalendar(); }
    function clearAllEmojisForCurrentTargets() { pushToUndoStack(); origClearAllEmojisForCurrentTargets(); saveEmojis(); renderCalendar(); }
    function addEmojiToTargets(e) { pushToUndoStack(); origAddEmojiToTargets(e); saveEmojis(); renderCalendar(); }
    function clearAllData() { pushToUndoStack(); allNotes = {}; dateEmojis = {}; saveNotes(); saveEmojis(); renderCalendar(); }
    function importData(newNotes, newEmojis) {
        pushToUndoStack();
        for (const [dateStr, notesArr] of Object.entries(newNotes)) {
            const existing = allNotes[dateStr] || [];
            for (const inc of notesArr) {
                if (!existing.some(ex => isSameNote(ex, inc))) {
                    if (!allNotes[dateStr]) allNotes[dateStr] = [];
                    origAddNote(dateStr, inc.text, inc.color, inc.spanGroupId, inc.isMilestone, inc.remark);
                }
            }
        }
        for (const [dateStr, emojiArr] of Object.entries(newEmojis)) {
            const existing = dateEmojis[dateStr] || [];
            const toAdd = emojiArr.filter(e => !existing.includes(e));
            if (toAdd.length) {
                if (!dateEmojis[dateStr]) dateEmojis[dateStr] = [];
                dateEmojis[dateStr].push(...toAdd);
            }
        }
        saveNotes(); saveEmojis(); renderCalendar();
        showToast('导入完成，已合并新日程，未重复添加');
    }
    function pasteWithHistory() {
        if (!clipboard?.length) return;
        const targets = selected.size ? [...selected] : (selectedChip ? [selectedChip.dateStr] : []);
        if (!targets.length) { showToast('请先选择日期'); return; }
        pushToUndoStack();
        targets.forEach(d => { clipboard.forEach(cn => origAddNote(d, cn.text, cn.color, null, cn.isMilestone, cn.remark || '')); });
        saveNotes(); renderCalendar(); soundPaste();
    }
    let paste = pasteWithHistory;
    function saveEditWithHistory() {
        const text = document.getElementById('modalTextarea').value.trim();
        if (!text) return;
        const color = document.getElementById('modalColor').value;
        const isMilestone = document.getElementById('modalMilestone').checked;
        const remark = document.getElementById('modalRemark').value;
        const noteId = document.getElementById('modalEditingNoteId').value;
        pushToUndoStack();
        if (noteId && curEditDate) origUpdateNote(curEditDate, noteId, text, color, isMilestone, remark);
        else if (curEditDate) origAddNote(curEditDate, text, color, null, isMilestone, remark);
        else if (multiDates?.length > 1) {
            const spanId = 'sg' + Date.now();
            multiDates.forEach(d => { if (d) origAddNote(d, text, color, spanId, isMilestone, remark); });
            selected.clear(); multiDates = null;
        }
        saveNotes(); renderCalendar(); closeModal(); soundBtn();
    }
    let saveEdit = saveEditWithHistory;

    // 日历核心
    function getMonthGrid(year, month) {
        const firstDay = new Date(year, month, 1);
        let startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
        const cells = [];
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
        for(let i = startDow - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            cells.push({ dateStr: prevYear + '-' + String(prevMonth + 1).padStart(2,'0') + '-' + String(day).padStart(2,'0'), day, month: prevMonth, year: prevYear, isCurrentMonth: false, isToday: false });
        }
        for(let d = 1; d <= daysInMonth; d++) {
            const ds = year + '-' + String(month + 1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
            cells.push({ dateStr: ds, day: d, month: month, year: year, isCurrentMonth: true, isToday: ds === todayStr });
        }
        let remaining = 7 - (cells.length % 7);
        if (remaining < 7) {
            const nextMonth = month === 11 ? 0 : month + 1;
            const nextYear = month === 11 ? year + 1 : year;
            for(let d = 1; d <= remaining; d++) {
                cells.push({ dateStr: nextYear + '-' + String(nextMonth + 1).padStart(2,'0') + '-' + String(d).padStart(2,'0'), day: d, month: nextMonth, year: nextYear, isCurrentMonth: false, isToday: false });
            }
        }
        while(cells.length < 42) {
            const last = cells[cells.length - 1];
            const d = new Date(last.dateStr);
            d.setDate(d.getDate() + 1);
            cells.push({ dateStr: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'), day: d.getDate(), month: d.getMonth(), year: d.getFullYear(), isCurrentMonth: false, isToday: false });
        }
        return cells.slice(0,42);
    }
    function renderCalendar() {
        const grid = getMonthGrid(currentYear, currentMonth);
        const tbody = document.getElementById('calendarTbody');
        tbody.innerHTML = '';
        for(let i = 0; i < 6; i++) {
            const tr = document.createElement('tr');
            for(let j = 0; j < 7; j++) {
                const cell = grid[i*7 + j];
                const td = document.createElement('td');
                td.setAttribute('data-date', cell.dateStr);
                if(!cell.isCurrentMonth) td.classList.add('other-month');
                if(cell.isToday) td.classList.add('today');
                if(selected.has(cell.dateStr)) td.classList.add('selected');
                else if(dragRange.has(cell.dateStr) && isDragging) td.classList.add('selecting');
                const numSpan = document.createElement('div'); numSpan.className = 'day-num';
                const emojis = dateEmojis[cell.dateStr] || [];
                numSpan.innerHTML = cell.day + (emojis.length ? ' ' + emojis.map(e => `<span class="day-emoji">${e}</span>`).join('') : '');
                td.appendChild(numSpan);
                const stack = document.createElement('div'); stack.className = 'notes-stack';
                (getNotes(cell.dateStr) || []).forEach(n => {
                    const chip = document.createElement('div'); chip.className = 'note-chip';
                    if(n.isMilestone) chip.classList.add('milestone');
                    chip.style.backgroundColor = getColor(n); chip.style.color = textColor(getColor(n));
                    chip.textContent = n.text;
                    chip.setAttribute('data-date', cell.dateStr); chip.setAttribute('data-note-id', n.id);
                    if(n.remark) chip.setAttribute('data-remark', n.remark);
                    chip.draggable = true;
                    chip.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); selectChip(cell.dateStr, n.id); soundClick(); });
                    chip.addEventListener('dblclick', e => { e.stopPropagation(); e.preventDefault(); selectChip(cell.dateStr, n.id); openNoteEdit(cell.dateStr, n.id); });
                    chip.addEventListener('dragstart', e => { dragNoteData = { dateStr: cell.dateStr, noteId: n.id }; soundDragStart(); });
                    chip.addEventListener('dragover', e => { e.preventDefault(); chip.classList.add('drag-over'); });
                    chip.addEventListener('dragleave', () => chip.classList.remove('drag-over'));
                    chip.addEventListener('drop', e => handleDropOnChip(e, cell.dateStr, n));
                    chip.addEventListener('dragend', () => chip.classList.remove('drag-over'));
                    if(n.remark && n.remark.trim()) {
                        chip.addEventListener('mouseenter', (e) => showTooltip(e, n.remark));
                        chip.addEventListener('mouseleave', hideTooltip);
                    }
                    stack.appendChild(chip);
                });
                td.appendChild(stack);
                td.addEventListener('mousedown', e => handleMouseDown(e, cell.dateStr));
                td.addEventListener('dblclick', (e) => {
                    if(e.target.closest('.note-chip')) return;
                    if(cell.isCurrentMonth){ soundBtn(); openEdit(cell.dateStr); }
                });
                td.addEventListener('dragover', e => e.preventDefault());
                td.addEventListener('drop', e => handleDropOnDate(e, cell.dateStr));
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        document.getElementById('yearNumber').textContent = currentYear;
        document.getElementById('monthNumber').textContent = currentMonth + 1;
    }
    function setYearMonth(year, month, fromEdit = false) {
        if (year < 1) year = 1;
        if (month < 0) { month = 11; year--; }
        if (month > 11) { month = 0; year++; }
        if (year < 1) year = 1;
        currentYear = year;
        currentMonth = month;
        selected.clear(); clearChipSelection(); dragRange.clear();
        renderCalendar();
        document.getElementById('calendarContainer').scrollTop = 0;
        soundMonthSwitch();
        if (fromEdit) soundBtn();
    }
    function prevMonth() { setYearMonth(currentYear, currentMonth - 1); }
    function nextMonth() { setYearMonth(currentYear, currentMonth + 1); }

    // 可编辑年份/月份
    function makeEditable(element, type, minVal, maxVal, currentVal, callback) {
        if (activeEditSpan === element && element.querySelector('input')) {
            const existingInput = element.querySelector('input');
            existingInput.focus();
            existingInput.select();
            return;
        }
        if (activeEditSpan && activeEditSpan !== element) {
            const oldInput = activeEditSpan.querySelector('input');
            if (oldInput) oldInput.blur();
        }
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentVal;
        input.className = type === 'year' ? 'year-edit-input' : 'month-edit-input';
        input.style.fontSize = window.getComputedStyle(element).fontSize;
        input.style.fontWeight = window.getComputedStyle(element).fontWeight;
        input.style.textAlign = 'center';
        element.classList.add('editing');
        element.innerHTML = '';
        element.appendChild(input);
        activeEditSpan = element;
        input.focus();
        input.select();
        const finish = () => {
            let newVal = parseInt(input.value, 10);
            if (isNaN(newVal)) newVal = currentVal;
            newVal = Math.min(maxVal, Math.max(minVal, newVal));
            element.classList.remove('editing');
            callback(newVal);
            element.innerHTML = newVal;
            activeEditSpan = null;
        };
        input.addEventListener('blur', finish);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finish();
            }
        });
        input.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }
    function initEditable() {
        const yearSpan = document.getElementById('yearNumber');
        const monthSpan = document.getElementById('monthNumber');
        yearSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            makeEditable(yearSpan, 'year', 1, 9999, currentYear, (newYear) => {
                if (newYear !== currentYear) setYearMonth(newYear, currentMonth, true);
            });
        });
        monthSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            makeEditable(monthSpan, 'month', 1, 12, currentMonth + 1, (newMonth) => {
                if (newMonth !== currentMonth + 1) setYearMonth(currentYear, newMonth - 1, true);
            });
        });
    }

    function getColor(note) { return note.color || DEFAULT_COLOR; }
    function textColor(bg) {
        const h = bg.replace('#', '');
        if (h.length !== 6) return '#fff';
        const r = parseInt(h.substr(0,2),16), g = parseInt(h.substr(2,2),16), b = parseInt(h.substr(4,2),16);
        return (r*299 + g*587 + b*114)/1000 > 185 ? '#1e2b3c' : '#fff';
    }
    function showTooltip(event, text) {
        if (!text) return;
        if (currentTooltip) currentTooltip.remove();
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = text;
        document.body.appendChild(tooltip);
        const rect = event.target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        let left = rect.left + window.scrollX;
        let top = rect.top + window.scrollY - tooltipRect.height - 8;
        if (top < 0) top = rect.bottom + window.scrollY + 8;
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        currentTooltip = tooltip;
    }
    function hideTooltip() { if (currentTooltip) { currentTooltip.remove(); currentTooltip = null; } }
    function openNoteEdit(dateStr, noteId) {
        const notes = getNotes(dateStr);
        const targetNote = notes.find(n => n.id === noteId);
        if(!targetNote) return;
        if(document.getElementById('modalOverlay').style.display === 'flex') closeModalImmediately();
        curEditDate = dateStr; multiDates = null; editId = noteId;
        populateModal(dateStr);
        document.getElementById('modalTextarea').value = targetNote.text;
        document.getElementById('modalRemark').value = targetNote.remark || '';
        document.getElementById('modalColor').value = targetNote.color || DEFAULT_COLOR;
        document.getElementById('modalMilestone').checked = !!targetNote.isMilestone;
        document.getElementById('modalEditingNoteId').value = noteId;
        document.getElementById('modalAddBtn').textContent = '更新';
        document.getElementById('modalCancelEditBtn').style.display = 'inline-block';
        document.getElementById('modalOverlay').style.display = 'flex';
    }
    function closeModalImmediately() { document.getElementById('modalOverlay').style.display = 'none'; }
    function handleMouseDown(e,dateStr){ if(e.button!==0||e.target.closest('.note-chip'))return; e.preventDefault(); isDragging=true; dragStartDate=dateStr; dragRange=new Set([dateStr]); refreshVisuals(); }
    function getDateRange(a,b){ const pa=a.split('-'),pb=b.split('-'); const da=new Date(pa[0],pa[1]-1,pa[2]),db=new Date(pb[0],pb[1]-1,pb[2]); const s=da<db?da:db,e=da<db?db:da; const r=[]; const cur=new Date(s); while(cur<=e){ r.push(cur.getFullYear()+'-'+String(cur.getMonth()+1).padStart(2,'0')+'-'+String(cur.getDate()).padStart(2,'0')); cur.setDate(cur.getDate()+1); } return r; }
    function refreshVisuals(){ document.querySelectorAll('td[data-date]').forEach(td=>{ const ds=td.getAttribute('data-date'); if(!ds)return; if(selected.has(ds)){ td.classList.add('selected'); td.classList.remove('selecting'); } else if(dragRange.has(ds)&&isDragging){ td.classList.remove('selected'); td.classList.add('selecting'); } else{ td.classList.remove('selected','selecting'); } }); }
    function selectChip(ds,noteId){ 
        if(selectedChip && selectedChip.dateStr===ds && selectedChip.noteId===noteId) clearChipSelection();
        else{ clearChipSelection(); selectedChip={dateStr:ds,noteId:noteId}; updateChipVisual(); soundSelectChip(); }
    }
    function clearChipSelection(){ selectedChip=null; updateChipVisual(); }
    function updateChipVisual(){ document.querySelectorAll('.note-chip.selected-chip').forEach(el=>el.classList.remove('selected-chip')); if(selectedChip){ const chip=document.querySelector(`.note-chip[data-date="${selectedChip.dateStr}"][data-note-id="${selectedChip.noteId}"]`); if(chip) chip.classList.add('selected-chip'); } }
    function handleDropOnDate(e,targetDate){ e.preventDefault(); if(!dragNoteData||!targetDate)return; moveNoteToDate(dragNoteData.dateStr,dragNoteData.noteId,targetDate,null); dragNoteData=null; soundDrop(); }
    function handleDropOnChip(e,targetDate,targetNote){ e.preventDefault();e.stopPropagation(); if(!dragNoteData)return; if(dragNoteData.dateStr===targetDate&&dragNoteData.noteId!==targetNote.id){ reorderNotes(targetDate,dragNoteData.noteId,targetNote.id); }else if(dragNoteData.dateStr!==targetDate){ moveNoteToDate(dragNoteData.dateStr,dragNoteData.noteId,targetDate,targetNote.id); } dragNoteData=null; soundDrop(); }
    function goToDate(ds){ const parts=ds.split('-'); if(parts.length===3){ const y=parseInt(parts[0]), m=parseInt(parts[1])-1; if(!isNaN(y)&&!isNaN(m)) setYearMonth(y,m); } selected.clear(); selected.add(ds); refreshVisuals(); setTimeout(()=>{ const td=document.querySelector(`td[data-date="${ds}"]`); if(td) td.scrollIntoView({behavior:'smooth',block:'center'}); },150); soundSpace(); }
    async function copyToSystemClipboard(text){ try{ await navigator.clipboard.writeText(text); return true; }catch(e){ return false; } }
    function copy() {
        let copyText='', noteCount=0;
        if(selectedChip){
            const notes=getNotes(selectedChip.dateStr);
            const note=notes.find(n=>n.id===selectedChip.noteId);
            if(note){ copyText=note.text; noteCount=1; clipboard=[{text:note.text,color:note.color,isMilestone:note.isMilestone,remark:note.remark}]; }
        } else if(selected.size){
            const allTargets=[...selected].sort();
            const collectedNotes=[];
            for(const d of allTargets){
                const notes=getNotes(d);
                for(const n of notes){ collectedNotes.push(n); copyText+=n.text+'\n'; }
            }
            copyText=copyText.trimEnd();
            noteCount=collectedNotes.length;
            if(collectedNotes.length) clipboard=collectedNotes.map(n=>({text:n.text,color:n.color,isMilestone:n.isMilestone,remark:n.remark}));
        }
        if(copyText){ copyToSystemClipboard(copyText); showToast(`已复制${noteCount}条日程文字到剪贴板`); soundCopy(); }
        else showToast('没有可复制的内容');
    }
    function openEdit(ds){ curEditDate=ds; multiDates=null; editId=null; populateModal(ds); }
    function openMulti(arr){ multiDates=arr; curEditDate=null; editId=null; populateModal(null); }
    function populateModal(ds){
        document.getElementById('modalEditingNoteId').value=''; document.getElementById('modalCancelEditBtn').style.display='none';
        document.getElementById('modalAddBtn').textContent='添加';
        let dateStr = ds || (multiDates?multiDates[0]:null);
        if(dateStr){
            const d=new Date(dateStr);
            const week=['日','一','二','三','四','五','六'][d.getDay()];
            document.getElementById('modalDateTitle').textContent=`📅 ${dateStr} 周${week}`;
        }
        if(ds){
            renderEmojiSection(ds); const notes=getNotes(ds);
            document.getElementById('existingNotes').style.display=notes.length?'block':'none';
            if(notes.length) renderExistingNotes(notes,ds);
        }else{
            document.getElementById('modalDateTitle').textContent=`📅 跨日长条 ${multiDates.length}天 · 批量操作`;
            document.getElementById('existingNotes').style.display='none';
            renderEmojiSection(multiDates[0]);
        }
        document.getElementById('modalTextarea').value='';
        document.getElementById('modalRemark').value='';
        document.getElementById('modalColor').value=DEFAULT_COLOR;
        document.getElementById('modalMilestone').checked=false;
        buildColorPresets();
        document.getElementById('modalOverlay').style.display='flex';
        emojiCollapsed=false;
        document.getElementById('emojiContent').style.display='block';
        document.getElementById('emojiToggleBtn').textContent='▲';
    }
    function buildColorPresets(){
        const container=document.getElementById('colorPresets');
        container.innerHTML=COLOR_PRESETS.map(c=>`<div class="color-preset" style="background:${c}" data-color="${c}"></div>`).join('');
        container.querySelectorAll('.color-preset').forEach(el=>el.onclick=()=>{document.getElementById('modalColor').value=el.dataset.color;});
    }
    function renderEmojiSection(ds){
        const div=document.getElementById('currentEmojis'); div.innerHTML='';
        const emojis=ds?(dateEmojis[ds]||[]):[];
        const targetDates=multiDates?multiDates:(ds?[ds]:[]);
        const wrap=document.createElement('div'); wrap.className='current-emojis-wrap';
        emojis.forEach(e=>{
            const s=document.createElement('span'); s.textContent=e; s.style.cursor='pointer'; s.title='移除';
            s.onclick=()=>{
                targetDates.forEach(d=>{
                    const arr=dateEmojis[d]||[];
                    const idx=arr.indexOf(e);
                    if(idx>=0) arr.splice(idx,1);
                    if(arr.length===0) delete dateEmojis[d]; else dateEmojis[d]=arr;
                });
                saveEmojis(); renderCalendar(); renderEmojiSection(ds);
            };
            wrap.appendChild(s);
        });
        const clearBtn=document.createElement('button');
        clearBtn.textContent='🗑️ 清空全部表情';
        clearBtn.className='emoji-clear-btn';
        clearBtn.onclick=(e)=>{ e.stopPropagation(); clearAllEmojisForCurrentTargets(); renderEmojiSection(ds); };
        wrap.appendChild(clearBtn);
        div.appendChild(wrap);
        document.getElementById('emojiPicker').innerHTML=PRESET_EMOJIS.map(e=>`<button>${e}</button>`).join('');
        document.getElementById('emojiPicker').querySelectorAll('button').forEach(b=>b.onclick=()=>{ addEmojiToTargets(b.textContent); renderEmojiSection(ds); });
        document.getElementById('emojiAddBtn').onclick=()=>{ const v=document.getElementById('emojiCustomInput').value.trim(); if(v) addEmojiToTargets(v); document.getElementById('emojiCustomInput').value=''; renderEmojiSection(ds); };
    }
    function renderExistingNotes(notes,ds){
        const list=document.getElementById('existingNotesList');
        list.innerHTML=notes.map(n=>`<div class="existing-note-row" data-note-id="${n.id}" data-date="${ds}"><span style="background:${getColor(n)};color:${textColor(getColor(n))};padding:2px 8px;border-radius:4px;">${escapeHtml(n.text)}${n.isMilestone?' 🚩':''}</span><button class="edit-note-btn" data-edit="${n.id}" style="margin-left:auto;">✏️</button><button data-del="${n.id}">🗑</button></div>`).join('');
        list.querySelectorAll('.existing-note-row').forEach(row=>{
            row.addEventListener('click',(e)=>{
                if(e.target.tagName==='BUTTON' && e.target.hasAttribute('data-del')) return;
                const noteId=row.getAttribute('data-note-id');
                const date=row.getAttribute('data-date');
                if(noteId && date) openNoteEdit(date,noteId);
            });
        });
        list.querySelectorAll('[data-edit]').forEach(b=>b.onclick=(e)=>{e.stopPropagation(); const id=b.dataset.edit; const note=notes.find(n=>n.id===id); if(note) openNoteEdit(ds,id);});
        list.querySelectorAll('[data-del]').forEach(b=>b.onclick=(e)=>{e.stopPropagation(); deleteNote(ds,b.dataset.del); renderCalendar(); openEdit(ds);});
    }
    function closeModal(){ document.getElementById('modalOverlay').style.display='none'; }
    function search() {
        const kw = document.getElementById('searchInput').value.trim().toLowerCase();
        if (!kw) return;
        const results = [];
        for (const [ds, notes] of Object.entries(allNotes)) {
            notes.forEach(n => {
                if (n.text.toLowerCase().includes(kw) || (n.remark && n.remark.toLowerCase().includes(kw))) {
                    results.push({ dateStr: ds, text: n.text, color: n.color, remark: n.remark, noteId: n.id });
                }
            });
        }
        const list = document.getElementById('searchResultsList');
        if (results.length) {
            list.innerHTML = results.map(r => {
                const remarkAttr = r.remark ? ` data-remark="${escapeHtml(r.remark).replace(/"/g, '&quot;')}"` : '';
                return `<li data-date="${r.dateStr}" data-note-id="${r.noteId}"${remarkAttr}><span class="result-date">📅 ${r.dateStr}</span><span class="result-text" style="background:${r.color || DEFAULT_COLOR};">${escapeHtml(r.text)}</span></li>`;
            }).join('');
            list.querySelectorAll('li[data-remark]').forEach(li => {
                const remark = li.getAttribute('data-remark');
                if (remark) {
                    li.addEventListener('mouseenter', (e) => {
                        if (currentTooltip) currentTooltip.remove();
                        const tooltip = document.createElement('div');
                        tooltip.className = 'custom-tooltip';
                        tooltip.textContent = remark;
                        document.body.appendChild(tooltip);
                        const rect = li.getBoundingClientRect();
                        const tooltipRect = tooltip.getBoundingClientRect();
                        let left = rect.left + window.scrollX;
                        let top = rect.top + window.scrollY - tooltipRect.height - 8;
                        if (top < 0) top = rect.bottom + window.scrollY + 8;
                        tooltip.style.left = left + 'px';
                        tooltip.style.top = top + 'px';
                        currentTooltip = tooltip;
                    });
                    li.addEventListener('mouseleave', () => { if (currentTooltip) { currentTooltip.remove(); currentTooltip = null; } });
                }
            });
        } else {
            list.innerHTML = '<li style="justify-content:center;color:#888;padding:20px;">未找到匹配的日程</li>';
        }
        document.getElementById('searchModalOverlay').style.display = 'flex';
        list.querySelectorAll('li[data-date]').forEach(li => li.onclick = () => {
            document.getElementById('searchModalOverlay').style.display = 'none';
            goToDate(li.getAttribute('data-date'));
        });
    }
    function closeSearchModalAndClear() {
        document.getElementById('searchModalOverlay').style.display = 'none';
        document.getElementById('searchInput').value = '';
    }
    function showConfirm(msg, cb) {
        document.getElementById('confirmMsg').textContent = msg;
        document.getElementById('confirmOverlay').style.display = 'flex';
        if (confirmEnterListener) document.removeEventListener('keydown', confirmEnterListener);
        confirmEnterListener = function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                cb();
                document.getElementById('confirmOverlay').style.display = 'none';
                document.removeEventListener('keydown', confirmEnterListener);
                confirmEnterListener = null;
            }
        };
        document.addEventListener('keydown', confirmEnterListener);
        const originalYesHandler = () => { cb(); document.getElementById('confirmOverlay').style.display = 'none'; if (confirmEnterListener) { document.removeEventListener('keydown', confirmEnterListener); confirmEnterListener = null; } };
        const originalNoHandler = () => { document.getElementById('confirmOverlay').style.display = 'none'; if (confirmEnterListener) { document.removeEventListener('keydown', confirmEnterListener); confirmEnterListener = null; } };
        const yesBtn = document.getElementById('confirmYes'), noBtn = document.getElementById('confirmNo');
        const newYes = yesBtn.cloneNode(true), newNo = noBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYes, yesBtn);
        noBtn.parentNode.replaceChild(newNo, noBtn);
        newYes.onclick = originalYesHandler;
        newNo.onclick = originalNoHandler;
    }
    function showToast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1500); }
    function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

    function clearSelectionIfNeeded(target) {
        if (target.closest('.note-chip')) return;
        if (target.closest('.modal')) return;
        if (selectedChip) clearChipSelection();
    }
    document.addEventListener('click', function(e) { clearSelectionIfNeeded(e.target); });
    function blurSearchInput() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput && document.activeElement === searchInput) searchInput.blur();
    }
    document.getElementById('calendarContainer').addEventListener('mousedown', blurSearchInput);

    // 事件绑定
    document.getElementById('modalOverlay').addEventListener('click', function(e) {
        if (e.target === this) {
            const textarea = document.getElementById('modalTextarea');
            if (textarea.value.trim()) saveEdit(); else closeModal();
        }
    });
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('searchModalClose').addEventListener('click', closeSearchModalAndClear);
    document.getElementById('searchModalOverlay').addEventListener('click', function(e) { if (e.target === this) closeSearchModalAndClear(); });
    document.getElementById('notesModalClose').addEventListener('click',()=>document.getElementById('notesModalOverlay').style.display='none');
    document.getElementById('notesModalOverlay').addEventListener('click',function(e){if(e.target===this)this.style.display='none';});
    document.getElementById('prevMonth').addEventListener('click', prevMonth);
    document.getElementById('nextMonth').addEventListener('click', nextMonth);
    document.getElementById('searchBtn').addEventListener('click', search);
    document.getElementById('searchInput').addEventListener('keypress', e => { if (e.key === 'Enter') search(); });
    document.getElementById('modalAddBtn').addEventListener('click', saveEdit);
    document.getElementById('modalCancelEditBtn').addEventListener('click',()=>{
        document.getElementById('modalTextarea').value='';
        document.getElementById('modalRemark').value='';
        document.getElementById('modalEditingNoteId').value='';
        editId=null;
        document.getElementById('modalCancelEditBtn').style.display='none';
        document.getElementById('modalAddBtn').textContent='添加';
    });
    document.getElementById('btnShowNotes').addEventListener('click',()=>{
        const content=document.getElementById('notesModalContent');
        const entries=[];
        for(const[d,items]of Object.entries(allNotes)){
            items.forEach(i=>entries.push({dateStr:d,...i}));
        }
        entries.sort((a,b)=>a.dateStr.localeCompare(b.dateStr));
        content.innerHTML=entries.length?entries.map(e=>`<div data-date="${e.dateStr}" style="padding:6px;border-bottom:1px solid #eee;cursor:pointer;">📅${e.dateStr} <span style="background:${getColor(e)};color:${textColor(getColor(e))};padding:2px 6px;">${escapeHtml(e.text)}</span></div>`).join(''):'<div style="text-align:center;color:#888;padding:20px;">暂无日程</div>';
        content.querySelectorAll('[data-date]').forEach(div=>div.onclick=()=>{document.getElementById('notesModalOverlay').style.display='none';goToDate(div.dataset.date);});
        document.getElementById('notesModalOverlay').style.display='flex';
    });
    document.getElementById('btnExport').addEventListener('click',()=>{
        const now=new Date();
        const mm=String(now.getMonth()+1).padStart(2,'0');
        const dd=String(now.getDate()).padStart(2,'0');
        const hh=String(now.getHours()).padStart(2,'0');
        const mi=String(now.getMinutes()).padStart(2,'0');
        const filename=`calendar_export_${currentYear}${mm}${dd}${hh}${mi}.json`;
        const data={notes:allNotes,emojis:dateEmojis};
        const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
        const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
    });
    document.getElementById('btnImport').addEventListener('click',()=>document.getElementById('importFileInput').click());
    document.getElementById('importFileInput').addEventListener('change',function(){
        if(this.files[0]){
            const r=new FileReader();
            r.onload=e=>{
                try{
                    const d=JSON.parse(e.target.result);
                    if(d.notes) importData(d.notes,d.emojis||{});
                    else alert('格式错误');
                }catch(ex){ alert('格式错误'); }
            };
            r.readAsText(this.files[0]);
            this.value='';
        }
    });
    document.getElementById('btnClearAll').addEventListener('click',()=>{ showConfirm('清空所有数据？',()=>{ clearAllData(); soundDelete(); }); });
    document.getElementById('emojiToggleHeader').addEventListener('click',function(e){ if(e.target.id==='emojiToggleBtn') return; emojiCollapsed=!emojiCollapsed; document.getElementById('emojiContent').style.display=emojiCollapsed?'none':'block'; document.getElementById('emojiToggleBtn').textContent=emojiCollapsed?'▼':'▲'; });
    document.getElementById('emojiToggleBtn').addEventListener('click',function(e){ e.stopPropagation(); emojiCollapsed=!emojiCollapsed; document.getElementById('emojiContent').style.display=emojiCollapsed?'none':'block'; document.getElementById('emojiToggleBtn').textContent=emojiCollapsed?'▼':'▲'; });
    let isCollapsed=false;
    document.getElementById('btnCollapse').addEventListener('click',()=>{
        isCollapsed=!isCollapsed;
        const top=document.getElementById('topSection');
        const expandBtn=document.getElementById('floatExpandBtn');
        if(isCollapsed){ top.classList.add('collapsed'); expandBtn.classList.add('visible'); document.getElementById('btnCollapse').innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>展开'; }
        else{ top.classList.remove('collapsed'); expandBtn.classList.remove('visible'); document.getElementById('btnCollapse').innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>折叠'; }
    });
    document.getElementById('floatExpandBtn').addEventListener('click',()=>{
        isCollapsed=false;
        document.getElementById('topSection').classList.remove('collapsed');
        document.getElementById('floatExpandBtn').classList.remove('visible');
        document.getElementById('btnCollapse').innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>折叠';
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (document.getElementById('modalOverlay').style.display === 'flex') { closeModal(); e.preventDefault(); return; }
            if (document.getElementById('notesModalOverlay').style.display === 'flex') { document.getElementById('notesModalOverlay').style.display = 'none'; e.preventDefault(); return; }
            if (document.getElementById('searchModalOverlay').style.display === 'flex') { closeSearchModalAndClear(); e.preventDefault(); return; }
            if (document.getElementById('confirmOverlay').style.display === 'flex') { document.getElementById('confirmOverlay').style.display = 'none'; if (confirmEnterListener) { document.removeEventListener('keydown', confirmEnterListener); confirmEnterListener = null; } e.preventDefault(); return; }
        }
        if (e.key === 'ArrowLeft') {
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
            e.preventDefault(); prevMonth(); return;
        }
        if (e.key === 'ArrowRight') {
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
            e.preventDefault(); nextMonth(); return;
        }
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); goToDate(new Date().toISOString().slice(0,10)); }
        else if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
        else if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
        else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') { e.preventDefault(); redo(); }
        else if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); copy(); }
        else if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); paste(); }
        else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            if (selectedChip) { deleteNote(selectedChip.dateStr, selectedChip.noteId); clearChipSelection(); renderCalendar(); soundDelete(); showToast('已删除内容条'); }
            else if (selected.size) { showConfirm(`删除${selected.size}天内容？`, () => { deleteNotesAndEmojisForDates([...selected]); selected.clear(); soundDelete(); showToast('已删除所选日程及表情'); }); }
        }
    });

    document.addEventListener('mousemove',e=>{
        if(!isDragging) return;
        const td=e.target.closest('td[data-date]'); if(!td) return;
        const ds=td.getAttribute('data-date'); if(!ds) return;
        const range=getDateRange(dragStartDate,ds);
        dragRange=new Set(range);
        refreshVisuals();
    });
    document.addEventListener('mouseup',()=>{
        if(!isDragging) return;
        isDragging=false;
        const final=[...dragRange].sort();
        if(final.length>1){ multiDates=final; curEditDate=null; soundMultiSelectEnd(); openMulti(final); }
        else if(final.length===1){ selected.clear(); selected.add(final[0]); multiDates=null; soundClick(); }
        dragRange.clear(); refreshVisuals();
    });
    document.addEventListener('dragend',function(e){ document.querySelectorAll('.note-chip.drag-over').forEach(el=>el.classList.remove('drag-over')); dragNoteData=null; });
    document.addEventListener('touchmove',e=>{
        if(!isDragging) return;
        const touch=e.touches[0];
        const el=document.elementFromPoint(touch.clientX,touch.clientY);
        const td=el?.closest('td[data-date]');
        if(td){
            const ds=td.getAttribute('data-date');
            if(ds){
                const range=getDateRange(dragStartDate,ds);
                dragRange=new Set(range);
                refreshVisuals();
            }
        }
    },{passive:true});
    document.addEventListener('touchend',()=>{
        if(!isDragging) return;
        isDragging=false;
        const final=[...dragRange].sort();
        if(final.length>1){ multiDates=final; curEditDate=null; soundMultiSelectEnd(); openMulti(final); }
        else if(final.length===1){ selected.clear(); selected.add(final[0]); multiDates=null; soundClick(); }
        dragRange.clear(); refreshVisuals();
    });

    function load() {
        try {
            const n = localStorage.getItem(STORAGE.N);
            if (n) {
                const p = JSON.parse(n);
                allNotes = {};
                for (const [k, v] of Object.entries(p)) if (Array.isArray(v)) allNotes[k] = v.map(i => ({ id: i.id || genId(), text: i.text || '', color: i.color || null, spanGroupId: i.spanGroupId || null, isMilestone: !!i.isMilestone, remark: i.remark || '' }));
            } else {
                allNotes = {};
                for (const [k, v] of Object.entries(HOLIDAYS)) allNotes[k] = v.map(i => ({ id: genId(), text: i.text, color: i.color, spanGroupId: null, isMilestone: false, remark: i.remark || '' }));
                saveNotes();
            }
        } catch (e) { allNotes = {}; }
        try { dateEmojis = JSON.parse(localStorage.getItem(STORAGE.E)) || {}; } catch (e) { dateEmojis = {}; }
        let m = 0;
        for (const arr of Object.values(allNotes)) for (const i of arr) { const ma = i.id?.match(/^n(\d+)_/); if (ma) m = Math.max(m, parseInt(ma[1])); }
        noteIdCounter = m;
        undoStack = []; redoStack = [];
    }
    load();
    initEditable();
    renderCalendar();
    const todayStr = new Date().toISOString().slice(0,10);
    selected.clear(); selected.add(todayStr); refreshVisuals();
})();