/**
 * System Architecture - مركز زمزم
 * Data Layer, UI Layer, and Logic Layer
 */

// --- 1. Data Layer (State Management) ---
const STORAGE_KEY = 'zamzam_erp_data';

let appState = {
    dailyRecords: [], // سجلات التنزيل اليومي
    finance: {
        expenses: [],
        externalIncome: [],
        salaries: []
    },
    settings: {
        dentist1Rate: 0.15, // 15% حسب الإكسل
        dentist2Rate: 0.10, // 10%
        cosmeticsRate: 0.20
    },
    purchases: [] // المشتريات
};

// Load data from LocalStorage
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        appState = JSON.parse(saved);
        if (!appState.purchases) {
            appState.purchases = [];
        }
    }
}

// Save data to LocalStorage
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    updateDashboard(); // Update UI whenever data changes
}

// --- 2. Logic & Math Layer (Excel Formulas Translation) ---
const logic = {
    calculateNet: (income, expense) => parseFloat(income || 0) - parseFloat(expense || 0),
    
    // محاكاة معادلة طبيب الأسنان الموجودة في شيت "طبيب اسنان 1"
    calculateDentistNet: (work, deductions, lab, rate, implantsCount, implantPrice) => {
        let doctorShare = (work - deductions - lab) * rate;
        let implantsValue = implantsCount * implantPrice;
        return doctorShare + implantsValue;
    },

    getTotals: () => {
        let totalIncome = 0;
        let totalExpense = 0;

        // من اليومية
        appState.dailyRecords.forEach(rec => {
            totalIncome += parseFloat(rec.income);
            totalExpense += parseFloat(rec.expense);
        });

        // من المالية
        appState.finance.externalIncome.forEach(rec => totalIncome += parseFloat(rec.amount));
        appState.finance.expenses.forEach(rec => totalExpense += parseFloat(rec.amount));
        appState.finance.salaries.forEach(rec => totalExpense += parseFloat(rec.amount));

        return {
            income: totalIncome,
            expense: totalExpense,
            net: totalIncome - totalExpense
        };
    }
};

// --- 3. UI Layer (Rendering & Events) ---

// الخيارات الفرعية للأقسام
const departmentOptions = {
    "التجميل": ["قطوعات", "عمل", "مصروف"],
    "الاشعه": ["عمل فقط"],
    "الطبيبه": ["قطوعات", "عمل", "حصتها"],
    "السونار": ["عمل", "حصة السونار"],
    "المختبر": ["عمل"],
    "ضماد الرجال": ["صباحا", "ظهرا", "عصرا", "ليلا"],
    "ضماد النساء": ["صباحا", "ظهرا", "عصرا", "ليلا"],
    "د ايلاف اسنان": ["قطوعات", "عمل", "حصتها"],
    "د حيان اسنان": ["قطوعات", "عمل", "كلي", "عدد زرعات", "عملها", "كلي", "كلي +كلي"],
    "د غيث اسنان": ["قطوعات", "عمل", "كلي"],
    "عدد زرعات": ["عملها", "كلي", "كلي +كلي"],
    "الطبيب": ["قطوعات", "عمل", "حصته", "عمل الطبيبه"]
};

// إظهار الخيارات الفرعية عند اختيار القسم
document.getElementById('entryDepartment').addEventListener('change', function() {
    const selectedDept = this.value;
    const subOptionGroup = document.getElementById('subOptionGroup');
    const subSelect = document.getElementById('entrySubOption');
    
    subSelect.innerHTML = '<option value="" disabled selected>اختر الخيار الفرعي...</option>';
    
    if (departmentOptions[selectedDept]) {
        departmentOptions[selectedDept].forEach(opt => {
            subSelect.innerHTML += `<option value="${opt}">${opt}</option>`;
        });
        subOptionGroup.classList.remove('hidden');
        subSelect.required = true;
    } else {
        subOptionGroup.classList.add('hidden');
        subSelect.required = false;
    }
});

// Navigation Logic
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        // Remove active from all
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        
        // Add active to clicked
        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
    });
});

// Update Date in Header
document.getElementById('currentDate').innerText = new Date().toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// Initialize App
function initApp() {
    loadData();
    document.getElementById('entryDate').valueAsDate = new Date();
    updateDashboard();
    renderDailyTable();
    renderPurchasesTable();
}

// Form Submission: Daily Entry
document.getElementById('dailyForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const departmentEl = document.getElementById('entryDepartment');
    const subOptionEl = document.getElementById('entrySubOption');
    
    const record = {
        id: Date.now(),
        date: document.getElementById('entryDate').value,
        department: departmentEl.value,
        departmentName: departmentEl.options[departmentEl.selectedIndex].text,
        subOption: subOptionEl.value || '-',
        income: document.getElementById('entryIncome').value,
        expense: document.getElementById('entryExpense').value,
        net: logic.calculateNet(document.getElementById('entryIncome').value, document.getElementById('entryExpense').value)
    };

    appState.dailyRecords.push(record);
    saveData();
    
    this.reset();
    document.getElementById('entryDate').valueAsDate = new Date();
    document.getElementById('subOptionGroup').classList.add('hidden');
    document.getElementById('entrySubOption').required = false;
    
    renderDailyTable();
    
    Swal.fire({ icon: 'success', title: 'تم الحفظ', background: '#1e293b', color: '#fff', timer: 1500, showConfirmButton: false });
});

// Render Daily Table
function renderDailyTable() {
    const tbody = document.getElementById('dailyTableBody');
    tbody.innerHTML = '';
    
    // Get today's date
    const today = document.getElementById('entryDate').value || new Date().toISOString().split('T')[0];
    
    const todaysRecords = appState.dailyRecords.filter(r => r.date === today);
    
    if(todaysRecords.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">لا توجد سجلات لهذا اليوم</td></tr>`;
        return;
    }

    todaysRecords.forEach(rec => {
        tbody.innerHTML += `
            <tr>
                <td>${rec.departmentName}</td>
                <td>${rec.subOption}</td>
                <td class="text-success">${rec.income}</td>
                <td class="text-danger">${rec.expense}</td>
                <td class="text-primary">${rec.net}</td>
                <td>
                    <button class="btn-danger" style="padding: 5px 10px; box-shadow: none;" onclick="deleteDailyRecord(${rec.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function deleteDailyRecord(id) {
    Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "لن تتمكن من التراجع عن هذا!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'نعم، احذف!',
        cancelButtonText: 'إلغاء',
        background: '#1e293b', color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            appState.dailyRecords = appState.dailyRecords.filter(r => r.id !== id);
            saveData();
            renderDailyTable();
        }
    });
}

// Update Dashboard
let myChart = null;
function updateDashboard() {
    const totals = logic.getTotals();
    
    // Format Numbers correctly
    const formatter = new Intl.NumberFormat('ar-IQ');
    
    document.getElementById('totalIncome').innerText = formatter.format(totals.income) + ' د.ع';
    document.getElementById('totalExpense').innerText = formatter.format(totals.expense) + ' د.ع';
    document.getElementById('netProfit').innerText = formatter.format(totals.net) + ' د.ع';

    // Update Chart
    const ctx = document.getElementById('financeChart').getContext('2d');
    if(myChart) myChart.destroy();
    
    Chart.defaults.color = '#e2e8f0';
    Chart.defaults.font.family = 'Cairo';

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['الواردات', 'المصروفات'],
            datasets: [{
                data: [totals.income, totals.expense],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Sub-tabs in Finance
function switchSubTab(type) {
    document.getElementById('financeType').value = type;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

// --- قسم المشتريات ---

function getFormattedDateTime() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${yyyy}-${mm}-${dd} ${hours}:${minutes} ${ampm}`;
}

window.app = window.app || {};

window.app.showAddPurchaseForm = () => {
    document.getElementById('addPurchaseFormContainer').classList.remove('hidden');
    document.getElementById('purchaseEditId').value = '';
    document.getElementById('purchaseForm').reset();
    document.getElementById('purchaseDateTime').value = getFormattedDateTime();
};

window.app.hideAddPurchaseForm = () => {
    document.getElementById('addPurchaseFormContainer').classList.add('hidden');
};

document.getElementById('purchaseForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const editId = document.getElementById('purchaseEditId').value;
    const dateTime = document.getElementById('purchaseDateTime').value;
    const notes = document.getElementById('purchaseNotes').value;
    const price = parseFloat(document.getElementById('purchasePrice').value);

    if (editId) {
        const index = appState.purchases.findIndex(p => p.id == editId);
        if (index !== -1) {
            appState.purchases[index].notes = notes;
            appState.purchases[index].price = price;
        }
    } else {
        appState.purchases.push({
            id: Date.now(),
            dateTime: dateTime,
            dateOnly: dateTime.split(' ')[0],
            notes: notes,
            price: price
        });
    }
    saveData();
    app.hideAddPurchaseForm();
    renderPurchasesTable();
});

window.app.deletePurchase = (id) => {
    appState.purchases = appState.purchases.filter(p => p.id !== id);
    saveData();
    renderPurchasesTable();
};

window.app.editPurchase = (id) => {
    const purchase = appState.purchases.find(p => p.id === id);
    if (purchase) {
        app.showAddPurchaseForm();
        document.getElementById('purchaseEditId').value = purchase.id;
        document.getElementById('purchaseDateTime').value = purchase.dateTime;
        document.getElementById('purchaseNotes').value = purchase.notes;
        document.getElementById('purchasePrice').value = purchase.price;
    }
};

window.app.clearPurchases = () => {
    appState.purchases = [];
    saveData();
    renderPurchasesTable();
    document.getElementById('filterPurchaseFrom').value = '';
    document.getElementById('filterPurchaseTo').value = '';
};

window.app.filterPurchases = () => {
    const from = document.getElementById('filterPurchaseFrom').value;
    const to = document.getElementById('filterPurchaseTo').value;
    let filtered = appState.purchases || [];
    if(from && to) {
        filtered = filtered.filter(p => p.dateOnly >= from && p.dateOnly <= to);
    }
    renderPurchasesTable(filtered);
};

function renderPurchasesTable(filteredList = null) {
    const tbody = document.getElementById('purchasesTableBody');
    tbody.innerHTML = '';
    
    const listToRender = filteredList || appState.purchases || [];
    let total = 0;
    const formatter = new Intl.NumberFormat('ar-IQ');

    if(listToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">لا توجد سجلات مشتريات</td></tr>`;
        document.getElementById('totalPurchasesValue').innerText = '0 د.ع';
        return;
    }

    listToRender.forEach(p => {
        total += p.price;
        tbody.innerHTML += `
            <tr>
                <td>${p.dateTime}</td>
                <td>${p.notes}</td>
                <td class="text-danger">${formatter.format(p.price)} د.ع</td>
                <td>
                    <button class="btn-primary" style="padding: 5px 10px; margin-left: 5px; box-shadow: none; display: inline-block;" onclick="app.editPurchase(${p.id})">
                        تعديل
                    </button>
                    <button class="btn-danger" style="padding: 5px 10px; box-shadow: none; display: inline-block;" onclick="app.deletePurchase(${p.id})">
                        حذف
                    </button>
                </td>
            </tr>
        `;
    });
    document.getElementById('totalPurchasesValue').innerText = formatter.format(total) + ' د.ع';
}

// --- 4. Excel Import Layer (SheetJS) ---
const fileInput = document.getElementById('excelFile');
const processBtn = document.getElementById('processExcelBtn');
const fileNameDisplay = document.getElementById('fileNameDisplay');
let loadedWorkbook = null;

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileNameDisplay.innerText = `الملف المحدد: ${file.name}`;
        processBtn.classList.remove('hidden');
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const data = new Uint8Array(event.target.result);
            loadedWorkbook = XLSX.read(data, {type: 'array'});
        };
        reader.readAsArrayBuffer(file);
    }
});

processBtn.addEventListener('click', () => {
    if(!loadedWorkbook) return;
    
    Swal.fire({
        title: 'جاري معالجة الإكسل...',
        text: 'نقوم بتحليل الجداول والأعمدة بناءً على هيكل مركز زمزم.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
        background: '#1e293b', color: '#fff'
    });

    try {
        if(loadedWorkbook.SheetNames.includes("الواردات الخارجية")) {
            const sheet = loadedWorkbook.Sheets["الواردات الخارجية"];
            const json = XLSX.utils.sheet_to_json(sheet, {range: 3});
            json.forEach(row => {
                if(row['المبلغ'] && row['المبلغ'] > 0) {
                    appState.finance.externalIncome.push({
                        id: Date.now() + Math.random(),
                        amount: row['المبلغ'],
                        details: row['التفاصيل'] || 'وارد مستورد'
                    });
                }
            });
        }
        
        if(loadedWorkbook.SheetNames.includes("المصروفات")) {
            const sheet = loadedWorkbook.Sheets["المصروفات"];
            const json = XLSX.utils.sheet_to_json(sheet, {range: 3}); 
            json.forEach(row => {
                if(row['المبلغ'] && row['المبلغ'] > 0) {
                    appState.finance.expenses.push({
                        id: Date.now() + Math.random(),
                        amount: row['المبلغ'],
                        details: row['التفاصيل'] || 'مصروف مستورد'
                    });
                }
            });
        }

        saveData();
        
        Swal.fire({
            icon: 'success',
            title: 'تم الاستيراد بنجاح!',
            text: 'تم تحديث قاعدة بيانات النظام.',
            background: '#1e293b', color: '#fff'
        });
        
        processBtn.classList.add('hidden');
        fileInput.value = '';
        fileNameDisplay.innerText = '';

    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ في الاستيراد',
            text: 'تأكد من أن الملف هو قالب "مركز زمزم" المعتمد.',
            background: '#1e293b', color: '#fff'
        });
    }
});

// App Object (Exposed for HTML inline handlers like clear data)
window.app.clearData = () => {
    Swal.fire({
        title: 'تحذير خطير!',
        text: "هل أنت متأكد من مسح كافة بيانات النظام؟",
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'نعم، امسح كل شيء',
        background: '#1e293b', color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem(STORAGE_KEY);
            location.reload();
        }
    });
};

// Run Initialization
initApp();
