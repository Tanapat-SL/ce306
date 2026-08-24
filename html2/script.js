const rates = {
    THB: 1,
    USD: 1 / 35,
    EUR: 1 / 38,
    JPY: 1 / 0.24
};

const amountOne = document.getElementById("amount-one");
const amountTwo = document.getElementById("amount-two");
const currencyOne = document.getElementById("currency-one");
const currencyTwo = document.getElementById("currency-two");
const rateText = document.getElementById("rate");
const historyList = document.getElementById("history-list");
const historyKey = "currency-history";
let history = JSON.parse(localStorage.getItem(historyKey) || "[]");

function getRate() {
    return rates[currencyTwo.value] / rates[currencyOne.value];
}

function updateRateText() {
    rateText.textContent =
        `1 ${currencyOne.value} = ${getRate().toFixed(4)} ${currencyTwo.value}`;
}

function calculateFromOne() {
    if (amountOne.value === "") {
        amountTwo.value = "";
        return;
    }

    amountTwo.value = (Number(amountOne.value) * getRate()).toFixed(2);
}

function displayHistory() {
    historyList.innerHTML = "";

    if (history.length === 0) {
        historyList.innerHTML = "<li>ยังไม่มีประวัติการแปลงเงิน</li>";
        return;
    }

    history.forEach(function (item) {
        const listItem = document.createElement("li");
        listItem.textContent = item;
        historyList.appendChild(listItem);
    });
}

function addHistory() {
    if (amountOne.value === "" || amountTwo.value === "") {
        return;
    }

    const item =
        `${Number(amountOne.value).toFixed(2)} ${currencyOne.value} ` +
        `→ ${Number(amountTwo.value).toFixed(2)} ${currencyTwo.value}`;

    history.unshift(item);
    history = history.slice(0, 10);
    localStorage.setItem(historyKey, JSON.stringify(history));
    displayHistory();
}

amountOne.addEventListener("input", calculateFromOne);

amountOne.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        addHistory();
    }
});

amountTwo.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        addHistory();
    }
});

currencyOne.addEventListener("change", function () {
    updateRateText();
    calculateFromOne();
});

currencyTwo.addEventListener("change", function () {
    updateRateText();
    calculateFromOne();
});

document.getElementById("swap-btn").addEventListener("click", function () {
    const oldCurrency = currencyOne.value;
    currencyOne.value = currencyTwo.value;
    currencyTwo.value = oldCurrency;

    const oldAmount = amountOne.value;
    amountOne.value = amountTwo.value;
    amountTwo.value = oldAmount;

    updateRateText();
});

document.getElementById("clear-btn").addEventListener("click", function () {
    amountOne.value = "";
    amountTwo.value = "";
    rateText.textContent = "อัตราแลกเปลี่ยน";
});

document.getElementById("clear-history-btn").addEventListener("click", function () {
    history = [];
    localStorage.removeItem(historyKey);
    displayHistory();
});

document.getElementById("last-update").textContent =
    "เวลาที่อัปเดตล่าสุด: " + new Date().toLocaleString("th-TH");

updateRateText();
displayHistory();