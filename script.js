document.getElementById('timeCardForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const date = document.getElementById('date').value;
    const name = document.getElementById('name').value.trim();
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;

    if (!name) {
        alert('名前を入力してください。');
        return;
    }

    const timeCardData = {
        checkIn: checkIn,
        checkOut: checkOut
    };

    let allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
    if (!allTimeCards[name]) {
        allTimeCards[name] = {};
    }
    if (!allTimeCards[name][date]) {
        allTimeCards[name][date] = [];
    }
    allTimeCards[name][date].push(timeCardData);
    localStorage.setItem('timeCards', JSON.stringify(allTimeCards));

    document.getElementById('timeCardForm').reset();
    displayTimeCards();
});

document.getElementById('exportBtn').addEventListener('click', function() {
    exportToExcel();
});

function displayTimeCards() {
    const allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<h2>タイムカード一覧</h2>';

    for (let name in allTimeCards) {
        resultDiv.innerHTML += `<h3>${name}</h3>`;
        for (let date in allTimeCards[name]) {
            resultDiv.innerHTML += `<h4>${date}</h4>`;
            allTimeCards[name][date].forEach((card) => {
                resultDiv.innerHTML += `
                    <div>
                        <p><strong>出勤時間:</strong> ${card.checkIn}</p>
                        <p><strong>退勤時間:</strong> ${card.checkOut}</p>
                        <hr>
                    </div>
                `;
            });
        }
    }
}

function calculateTimeDifference(startTime, endTime) {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const diff = (end - start) / (1000 * 60 * 60); // difference in hours
    return diff.toFixed(2); // round to 2 decimal places
}

function splitTimePeriod(checkIn, checkOut) {
    const splitPoint = '12:00';
    let morningCheckOut = checkOut;
    let afternoonCheckIn = checkIn;

    if (checkIn < splitPoint && checkOut <= splitPoint) {
        return { morningCheckIn: checkIn, morningCheckOut: checkOut, afternoonCheckIn: '', afternoonCheckOut: '' };
    } else if (checkIn >= splitPoint) {
        return { morningCheckIn: '', morningCheckOut: '', afternoonCheckIn: checkIn, afternoonCheckOut: checkOut };
    } else {
        morningCheckOut = splitPoint;
        afternoonCheckIn = splitPoint;
        return { morningCheckIn: checkIn, morningCheckOut: morningCheckOut, afternoonCheckIn: afternoonCheckIn, afternoonCheckOut: checkOut };
    }
}

function calculateEarlyMorningTime(startTime, endTime) {
    const endLimit = new Date('1970-01-01T08:30');
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    if (end <= endLimit) {
        return parseFloat(calculateTimeDifference(startTime, endTime));
    } else if (start < endLimit) {
        return parseFloat(calculateTimeDifference(startTime, '08:30'));
    }
    return 0;
}

function calculateEveningTime(startTime, endTime) {
    const startLimit = new Date('1970-01-01T16:00');
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    if (start >= startLimit) {
        return parseFloat(calculateTimeDifference(startTime, endTime));
    } else if (end > startLimit) {
        return parseFloat(calculateTimeDifference('16:00', endTime));
    }
    return 0;
}

function exportToExcel() {
    const allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
    const workbook = XLSX.utils.book_new();

    for (let name in allTimeCards) {
        const sheetData = [
            ['日付', '午前出勤時間', '午前退勤時間', '午後出勤時間', '午後退勤時間', '午前合計', '午後合計', '1日合計', '早朝合計', '夕方合計', '通常合計']
        ];

        let totalEarlyMorning = 0;
        let totalEvening = 0;
        let totalNormal = 0;

        for (let date in allTimeCards[name]) {
            let morningCheckIn = '';
            let morningCheckOut = '';
            let afternoonCheckIn = '';
            let afternoonCheckOut = '';
            let morningTotal = 0;
            let afternoonTotal = 0;
            let earlyMorningTotal = 0;
            let eveningTotal = 0;

            allTimeCards[name][date].forEach((card) => {
                const splitTimes = splitTimePeriod(card.checkIn, card.checkOut);
                const morningHours = splitTimes.morningCheckIn && splitTimes.morningCheckOut ? calculateTimeDifference(splitTimes.morningCheckIn, splitTimes.morningCheckOut) : 0;
                const afternoonHours = splitTimes.afternoonCheckIn && splitTimes.afternoonCheckOut ? calculateTimeDifference(splitTimes.afternoonCheckIn, splitTimes.afternoonCheckOut) : 0;
                const earlyMorningHours = calculateEarlyMorningTime(card.checkIn, card.checkOut);
                const eveningHours = calculateEveningTime(card.checkIn, card.checkOut);

                if (splitTimes.morningCheckIn && splitTimes.morningCheckOut) {
                    morningCheckIn = splitTimes.morningCheckIn;
                    morningCheckOut = splitTimes.morningCheckOut;
                    morningTotal = parseFloat(morningHours);
                    earlyMorningTotal += earlyMorningHours;
                }
                if (splitTimes.afternoonCheckIn && splitTimes.afternoonCheckOut) {
                    afternoonCheckIn = splitTimes.afternoonCheckIn;
                    afternoonCheckOut = splitTimes.afternoonCheckOut;
                    afternoonTotal = parseFloat(afternoonHours);
                    eveningTotal += eveningHours;
                }
            });

            const normalTotal = (morningTotal + afternoonTotal - earlyMorningTotal - eveningTotal).toFixed(2);
            const dayTotal = (morningTotal + afternoonTotal).toFixed(2);
            totalEarlyMorning += earlyMorningTotal;
            totalEvening += eveningTotal;
            totalNormal += parseFloat(normalTotal);

            const row = [
                date,
                morningCheckIn,
                morningCheckOut,
                afternoonCheckIn,
                afternoonCheckOut,
                morningTotal.toFixed(2),
                afternoonTotal.toFixed(2),
                dayTotal,
                earlyMorningTotal.toFixed(2),
                eveningTotal.toFixed(2),
                normalTotal
            ];
            sheetData.push(row);
        }

        // 合計行を追加
        sheetData.push([]);
        sheetData.push(['', '', '', '', '', '', '', '', totalEarlyMorning.toFixed(2), totalEvening.toFixed(2), totalNormal.toFixed(2)]);

        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, name);
    }

    XLSX.writeFile(workbook, 'timecards.xlsx');
}

document.addEventListener('DOMContentLoaded', displayTimeCards);

