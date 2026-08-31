// ดึง element ต่าง ๆ จาก HTML มาใช้งาน
const nameInput = document.getElementById("transaction-name");
const typeInput = document.getElementById("transaction-type");
const categoryInput = document.getElementById("transaction-category");
const amountInput = document.getElementById("transaction-amount");
const searchInput = document.getElementById("search-input");
const transactionList = document.getElementById("transaction-list");
const storageKey = "html3-transactions";

// กำหนดไอคอนให้กับแต่ละหมวดหมู่ เพื่อให้แสดงผลสวยและเข้าใจง่ายขึ้น
const categoryIcons = {
    "อาหาร": "🍽️",
    "เดินทาง": "🚗",
    "ช้อปปิ้ง": "🛍️",
    "เงินเดือน": "💰",
    "อื่นๆ": "📌"
};

// ดึงข้อมูลรายการที่เคยบันทึกไว้ใน localStorage หากมีอยู่
let transactions = JSON.parse(localStorage.getItem(storageKey) || "[]");

// ฟังก์ชันแปลงจำนวนเงินให้เป็นรูปแบบเงินไทย เช่น ฿250.00
function formatCurrency(value) {
    return `฿${Number(value).toFixed(2)}`;
}

// ฟังก์ชันแสดงรายการทั้งหมดหรือรายการที่ผ่านการกรองแล้ว
function showTransactions() {
    // ล้างรายการเดิมก่อนแสดงข้อมูลใหม่
    transactionList.innerHTML = "";

    // อ่านคำค้นหาจากช่อง search และแปลงให้เป็นตัวพิมพ์เล็กทั้งหมด
    const keyword = searchInput.value.trim().toLowerCase();

    // กรองรายการตามชื่อที่ผู้ใช้พิมพ์
    const filteredTransactions = transactions.filter(function (transaction) {
        return transaction.name.toLowerCase().includes(keyword);
    });

    // ถ้าไม่มีรายการที่ตรงกับคำค้นหา ให้แสดงข้อความนี้
    if (filteredTransactions.length === 0) {
        transactionList.innerHTML = "<li class='empty-state'>ไม่พบรายการธุรกรรม</li>";
        updateSummary();
        return;
    }

    // วนลูปแสดงแต่ละรายการแบบเรียงตามลำดับ
    filteredTransactions.forEach(function (transaction) {
        const listItem = document.createElement("li");
        const typeText = transaction.type === "income" ? "รายรับ" : "รายจ่าย";
        const icon = categoryIcons[transaction.category] || "📌";
        const amountClass = transaction.type === "income" ? "amount income" : "amount expense";

        // สร้าง HTML สำหรับแต่ละรายการ
        listItem.innerHTML = `
            <span class="transaction-id">#${transaction.id}</span>
            <span class="transaction-type ${transaction.type}">${typeText}</span>
            <span class="transaction-name">${transaction.name}</span>
            <span class="transaction-category">${icon} ${transaction.category}</span>
            <span class="${amountClass}">${formatCurrency(transaction.amount)}</span>
        `;

        // เพิ่มรายการลงในลิสต์
        transactionList.appendChild(listItem);
    });

    // หลังแสดงรายการเสร็จ ให้คำนวณสรุปรายการอีกครั้ง
    updateSummary();
}

// ฟังก์ชันคำนวณและอัปเดตสรุปรายงานการเงิน
function updateSummary() {
    // คำนวณยอดรายรับจากรายการที่เป็น income
    const income = transactions
        .filter(function (transaction) { return transaction.type === "income"; })
        .reduce(function (total, transaction) { return total + Number(transaction.amount); }, 0);

    // คำนวณยอดรายจ่ายจากรายการที่เป็น expense
    const expense = transactions
        .filter(function (transaction) { return transaction.type === "expense"; })
        .reduce(function (total, transaction) { return total + Number(transaction.amount); }, 0);

    // ยอดเงินคงเหลือสุทธิ = รายรับ - รายจ่าย
    const netBalance = income - expense;

    // อัปเดตข้อความในหน้า HTML
    document.getElementById("total-income").textContent = `ยอดรายรับรวม: ${formatCurrency(income)}`;
    document.getElementById("total-expense").textContent = `ยอดรายจ่ายรวม: ${formatCurrency(expense)}`;
    document.getElementById("net-balance").textContent = `ยอดเงินคงเหลือสุทธิ: ${formatCurrency(netBalance)}`;
}

// ฟังก์ชันเพิ่มรายการใหม่
function addTransaction() {
    // อ่านค่าจากฟอร์มและตัดช่องว่างรอบคำให้หมด
    const name = nameInput.value.trim();
    const amount = Number(amountInput.value);

    // ตรวจสอบว่าผู้ใช้กรอกข้อมูลครบและจำนวนเงินถูกต้องหรือไม่
    if (name === "" || amountInput.value === "" || amount < 0) {
        alert("กรุณากรอกชื่อรายการและจำนวนเงินให้ถูกต้อง");
        return;
    }

    // เพิ่มข้อมูลใหม่ลงใน array
    transactions.push({
        id: transactions.length + 1,
        type: typeInput.value,
        name: name,
        category: categoryInput.value,
        amount: amount
    });

    // บันทึกลง localStorage เพื่อให้ข้อมูลอยู่แม้ reload หน้า
    localStorage.setItem(storageKey, JSON.stringify(transactions));

    // เคลียร์ค่าที่กรอกไว้แล้ว
    nameInput.value = "";
    amountInput.value = "";

    // แสดงรายการใหม่ทันที
    showTransactions();
}

// เมื่อกดปุ่มเพิ่มรายการ ให้เรียกฟังก์ชัน addTransaction
document.getElementById("add-transaction-btn").addEventListener("click", addTransaction);

// เมื่อมีการพิมพ์ในช่องค้นหา ให้เรียก showTransactions ทันที
searchInput.addEventListener("input", showTransactions);

// ถ้ากด Enter ในช่องจำนวนเงิน ให้เรียก addTransaction เช่นกัน
amountInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        addTransaction();
    }
});

// เมื่อกดปุ่มล้างข้อมูลทั้งหมด ให้ยืนยันก่อนล้างจริง
document.getElementById("clear-all-btn").addEventListener("click", function () {
    if (confirm("ต้องการล้างข้อมูลทั้งหมดหรือไม่?")) {
        transactions = [];
        localStorage.removeItem(storageKey);
        showTransactions();
    }
});

// เรียกแสดงรายการตอนโหลดหน้าแรก
showTransactions();
