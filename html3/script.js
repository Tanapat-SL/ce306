const nameInput = document.getElementById("transaction-name");
const typeInput = document.getElementById("transaction-type");
const categoryInput = document.getElementById("transaction-category");
const amountInput = document.getElementById("transaction-amount");
const searchInput = document.getElementById("search-input");
const transactionList = document.getElementById("transaction-list");
const storageKey = "html3-transactions";
const categoryIcons = {
    "อาหาร": "🍽️",
    "เดินทาง": "🚗",
    "ช้อปปิ้ง": "🛍️",
    "เงินเดือน": "💰",
    "อื่นๆ": "📌"
};

let transactions = JSON.parse(localStorage.getItem(storageKey) || "[]");

function formatCurrency(value) {
    return `฿${Number(value).toFixed(2)}`;
}

function showTransactions() {
    transactionList.innerHTML = "";
    const keyword = searchInput.value.trim().toLowerCase();
    const filteredTransactions = transactions.filter(function (transaction) {
        return transaction.name.toLowerCase().includes(keyword);
    });

    if (filteredTransactions.length === 0) {
        transactionList.innerHTML = "<li class='empty-state'>ไม่พบรายการธุรกรรม</li>";
        updateSummary();
        return;
    }

    filteredTransactions.forEach(function (transaction) {
        const listItem = document.createElement("li");
        const typeText = transaction.type === "income" ? "รายรับ" : "รายจ่าย";
        const icon = categoryIcons[transaction.category] || "📌";
        const amountClass = transaction.type === "income" ? "amount income" : "amount expense";

        listItem.innerHTML = `
            <span class="transaction-id">#${transaction.id}</span>
            <span class="transaction-type ${transaction.type}">${typeText}</span>
            <span class="transaction-name">${transaction.name}</span>
            <span class="transaction-category">${icon} ${transaction.category}</span>
            <span class="${amountClass}">${formatCurrency(transaction.amount)}</span>
        `;

        transactionList.appendChild(listItem);
    });

    updateSummary();
}

function updateSummary() {
    const income = transactions
        .filter(function (transaction) { return transaction.type === "income"; })
        .reduce(function (total, transaction) { return total + Number(transaction.amount); }, 0);
    const expense = transactions
        .filter(function (transaction) { return transaction.type === "expense"; })
        .reduce(function (total, transaction) { return total + Number(transaction.amount); }, 0);
    const netBalance = income - expense;

    document.getElementById("total-income").textContent = `ยอดรายรับรวม: ${formatCurrency(income)}`;
    document.getElementById("total-expense").textContent = `ยอดรายจ่ายรวม: ${formatCurrency(expense)}`;
    document.getElementById("net-balance").textContent = `ยอดเงินคงเหลือสุทธิ: ${formatCurrency(netBalance)}`;
}

function addTransaction() {
    const name = nameInput.value.trim();
    const amount = Number(amountInput.value);

    if (name === "" || amountInput.value === "" || amount < 0) {
        alert("กรุณากรอกชื่อรายการและจำนวนเงินให้ถูกต้อง");
        return;
    }

    transactions.push({
        id: transactions.length + 1,
        type: typeInput.value,
        name: name,
        category: categoryInput.value,
        amount: amount
    });

    localStorage.setItem(storageKey, JSON.stringify(transactions));
    nameInput.value = "";
    amountInput.value = "";
    showTransactions();
}

document.getElementById("add-transaction-btn").addEventListener("click", addTransaction);
searchInput.addEventListener("input", showTransactions);

amountInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        addTransaction();
    }
});

document.getElementById("clear-all-btn").addEventListener("click", function () {
    if (confirm("ต้องการล้างข้อมูลทั้งหมดหรือไม่?")) {
        transactions = [];
        localStorage.removeItem(storageKey);
        showTransactions();
    }
});

showTransactions();
