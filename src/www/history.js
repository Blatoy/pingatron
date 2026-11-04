const API_URL = "../api/history";

// This is soooooooo ugly and ai generated but I'll fix it later
function createCard(dailyData) {
    console.log(dailyData)
    const card = document.createElement("div");
    const date = document.createElement("p");
    const dateSpan = document.createElement("span");
    const hr1 = document.createElement("hr");

    const packetSent = document.createElement("p");
    const packetSentLabel = document.createElement("label");
    const packetSentSpan = document.createElement("span");
    const packetReceived = document.createElement("p");
    const packetReceivedLabel = document.createElement("label");
    const packetReceivedSpan = document.createElement("span");
    const packetLost = document.createElement("p");
    const packetLostLabel = document.createElement("label");
    const packetLostSpan = document.createElement("span");
    const latePackets = document.createElement("p");
    const latePacketsLabel = document.createElement("label");
    const latePacketsSpan = document.createElement("span");

    const hr2 = document.createElement("hr");
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    const trHeader = document.createElement("tr");
    const thTime = document.createElement("th");
    const thAverage = document.createElement("th");
    const thMin = document.createElement("th");
    const thMax = document.createElement("th");
    const thLost = document.createElement("th");
    const thLate = document.createElement("th");

    // Set the text content of the elements
    dateSpan.textContent = dailyData.date;
    packetSentLabel.textContent = "Packet sent: ";
    packetSentSpan.textContent = dailyData.packetsSent;
    packetReceivedLabel.textContent = "Packet received: ";
    packetReceivedSpan.textContent = dailyData.packetsReceived;
    packetLostLabel.textContent = "Packet lost: ";
    packetLostSpan.textContent = dailyData.packetsLost;
    latePacketsLabel.textContent = "Late packets: ";
    latePacketsSpan.textContent = dailyData.latePackets;
    thTime.textContent = "Time";
    thAverage.textContent = "Average";
    thMin.textContent = "Min";
    thMax.textContent = "Max";
    thLost.textContent = "Lost count";

    // Append the elements to the card
    date.appendChild(dateSpan);
    card.appendChild(date);
    card.appendChild(hr1);
    packetSent.appendChild(packetSentLabel);
    packetSent.appendChild(packetSentSpan);
    card.appendChild(packetSent);
    packetReceived.appendChild(packetReceivedLabel);
    packetReceived.appendChild(packetReceivedSpan);
    card.appendChild(packetReceived);
    packetLost.appendChild(packetLostLabel);
    packetLost.appendChild(packetLostSpan);
    card.appendChild(packetLost);
    latePackets.appendChild(latePacketsLabel);
    latePackets.appendChild(latePacketsSpan);
    card.appendChild(latePackets);
    card.appendChild(hr2);
    if (dailyData.latencyIssues.length > 0) {
        card.appendChild(table);
        table.appendChild(thead);
        table.appendChild(tbody);
    }

    thead.appendChild(trHeader);
    trHeader.appendChild(thTime);
    trHeader.appendChild(thAverage);
    trHeader.appendChild(thMin);
    trHeader.appendChild(thMax);
    trHeader.appendChild(thLost);

    // Append the latency issues to the table
    dailyData.latencyIssues.forEach((issue) => {
        const tr = document.createElement("tr");
        const tdTime = document.createElement("td");
        const tdAverage = document.createElement("td");
        const tdMin = document.createElement("td");
        const tdMax = document.createElement("td");
        const tdLost = document.createElement("td");

        tdTime.textContent = issue.time;

        if (issue.min === null) {
            tdAverage.textContent = "All packets lost";
            tdAverage.colSpan = 4;
            tdAverage.style.textAlign = "center";
            tr.appendChild(tdTime);
            tr.appendChild(tdAverage);
        } else {
            tdAverage.textContent = issue.average;
            tdMin.textContent = issue.min;
            tdMax.textContent = issue.max;
            tdLost.textContent = issue.lost;

            tr.appendChild(tdTime);
            tr.appendChild(tdAverage);
            tr.appendChild(tdMin);
            tr.appendChild(tdMax);
            tr.appendChild(tdLost);
        }

        tbody.appendChild(tr);
    });

    return card;
}

async function main() {
    const mainContainer = document.querySelector("main");

    const results = await fetch(API_URL);
    const data = await results.json();

    for (const dailyData of data.reverse()) {
        const card = createCard(dailyData);
        mainContainer.appendChild(card);
    }
}

main();
