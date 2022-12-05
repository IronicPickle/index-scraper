const USERNAME = "%USERNAME%";
const PASSWORD = "%PASSWORD%";
const CATEGORIES = `%CATEGORIES%`;
const FILE_UUID = "%FILE_UUID%";

const NEW_LINE = "\r\n";

const byId = (id) => document.getElementById(id);
const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomNum = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const login = () => {
  coverScreen("🔑 Logging in");

  if (sessionStorage.getItem("loginAttempted"))
    return downloadError("Could not login, your username or password may be incorrect.");
  sessionStorage.setItem("loginAttempted", true);

  const usernameInput = byId("login");
  const passwordInput = byId("password");
  const loginButton = byId("loginbutton");

  usernameInput.value = USERNAME;
  passwordInput.value = PASSWORD;
  loginButton.click();
};

const goToClients = async () => {
  coverScreen("🛰️ Navigating to clients");

  const topMenu = await queryDoc(() => document.getElementsByClassName("top-menu").item(0));
  const clientButton = await queryDoc(() => {
    for (const { firstElementChild } of topMenu.children) {
      if (firstElementChild.innerText.toLowerCase() === "clients") return firstElementChild;
    }
  });
  clientButton.click();
};

const goBackToClients = () => {
  const clientButton = document.getElementById("existingli").firstChild;
  clientButton.click();
};

const queryDoc = async (queryFunc, noRetry) => {
  while (true) {
    try {
      const element = queryFunc();
      if (element == null) throw new Error("No element found");
      return element;
    } catch (_) {
      if (noRetry) break;
      await sleep(500);
    }
  }
};

const escapeCsv = (csv) => {
  csv = csv.replace(/(\r\n|\n|\r|\s+|\t|&nbsp;)/gm, " ");
  csv = csv.replace(/\"/g, '""');

  return `"${csv}"`;
};

const dataToFields = (data) => {
  const fields = [];
  for (const { value } of Object.values(data)) {
    fields.push(escapeCsv(value));
  }

  return fields;
};

const clientsToCsv = (clients) => {
  let csv = "";

  for (const client of Object.values(clients)) {
    const fieldsSet = [];

    const headerFieldsTop = [];
    const headerFieldsBottom = [];
    for (const { category, data } of Object.values(client)) {
      if (category === "Users") continue;
      for (const { key } of data) {
        headerFieldsTop.push(category);
        headerFieldsBottom.push(key);
      }
    }

    const dataFields = [];

    for (const { category, data } of Object.values(client)) {
      if (category === "Users") continue;
      dataFields.push(dataToFields(data));
    }

    fieldsSet.push(headerFieldsTop);
    fieldsSet.push(headerFieldsBottom);

    fieldsSet.push(dataFields);

    fieldsSet.push([]);

    for (const { category, data } of Object.values(client)) {
      if (category === "Users") {
        const users = data;

        if (users.length > 0) {
          fieldsSet.push(users[0].map(() => "Users"));
          fieldsSet.push(users[0].map(({ key }) => escapeCsv(key)));

          for (const user of users) {
            fieldsSet.push(dataToFields(user));
          }
        }
      }
    }

    fieldsSet.push([]);
    fieldsSet.push([]);

    for (const fields of fieldsSet) {
      csv += fields.join(",") + NEW_LINE;
    }
  }

  return csv;
};

const downloadCsv = (csv) => {
  const downloadLink = document.createElement("a");
  const blob = new Blob(["\ufeff", csv]);
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.download = `clients-${FILE_UUID}.csv`;

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};

const downloadError = (error) => {
  const downloadLink = document.createElement("a");
  const blob = new Blob([error]);
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.download = `error-${FILE_UUID}.txt`;

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};

const cancel = () => {
  downloadError("Cancelled");
  window.close();
};

let clients = [];

const blacklist = [
  {
    category: "Admin options",
    keys: ["Logo"],
  },
  {
    category: "HelloSign Options",
    keys: ["Email Logo"],
  },
];

const isBlacklisted = (category, key) =>
  !!blacklist.find(
    ({ category: currCategory, keys }) => category === currCategory && keys.includes(key),
  );

const scrapeClientData = async () => {
  const tbodyElement = await queryDoc(
    () =>
      document.getElementById("client_form").firstElementChild.firstElementChild.firstElementChild,
  );
  const trElements = tbodyElement.getElementsByTagName("tr");

  const data = [];
  let category = null;
  let i = 0;

  for await (const trElement of trElements) {
    const key = (await queryDoc(() => trElement.firstElementChild.innerText))?.replace(/:$/g, "");
    const value = await queryDoc(
      () => trElement.lastElementChild.querySelector("input, select, textarea").value,
      true,
    );

    if (!key) {
      const newCategory = await queryDoc(
        () => trElement.firstElementChild.firstElementChild.value,
        true,
      );
      if (newCategory != null) {
        if (CATEGORIES.includes(newCategory)) {
          category = newCategory;
          i = data.length;
          data.push({
            category,
            data: [],
          });
        } else {
          category = null;
        }
      }
      continue;
    }

    if (!category || value == null || isBlacklisted(category, key)) continue;

    data[i].data.push({
      key,
      value,
    });
  }

  tbodyElement.remove();

  data.push({
    category: "Users",
    data: await scrapeClientUserData(),
  });

  return data;
};

const scrapeClientUserData = async () => {
  const tbodyElement = await queryDoc(
    () =>
      document.getElementById("activeusers").getElementsByTagName("table").item(0).lastElementChild,
  );
  const trElements = tbodyElement.getElementsByTagName("tr");

  const data = [];

  for await (const trElement of trElements) {
    const username = await queryDoc(() => trElement.children.item(0).innerText);
    const name = await queryDoc(() => trElement.children.item(1).innerText);
    const email = await queryDoc(() => trElement.children.item(2).innerText);
    const lastOrder = await queryDoc(() => trElement.children.item(3).innerText);
    const accountType = await queryDoc(() => {
      const innerText = trElement.children.item(4).innerText;
      return innerText === "Master Account" ? "Yes" : "No";
    });

    data.push([
      {
        key: "Username",
        value: username,
      },
      {
        key: "Name",
        value: name,
      },
      {
        key: "Email",
        value: email,
      },
      {
        key: "Last Order",
        value: lastOrder,
      },
      {
        key: "Is Master",
        value: accountType,
      },
    ]);
  }

  tbodyElement.remove();

  return data;
};

const startScrape = async () => {
  coverScreen("⌛ Beginning scrape");

  const tbodyElement = await queryDoc(() =>
    document.getElementById("existing").firstChild.children.item(1),
  );

  // let max = 5;
  let i = 0;

  for await (const trElement of tbodyElement.children) {
    // if (i >= max) break;
    ++i;
    const clientName = trElement.firstElementChild.innerText;

    trElement.click();

    coverScreen(`📋 ${clientName} `, i, tbodyElement.children.length);

    clients.push(await scrapeClientData());

    goBackToClients();

    coverScreen(`📋 ${clientName}`, i, tbodyElement.children.length);

    await sleep(randomNum(1000, 2000));
  }

  const csv = clientsToCsv(clients);

  downloadCsv(csv);
};

const coverScreen = (text, current, total) => {
  document.getElementById("scrape-cover")?.remove();

  const coverElement = document.createElement("div");
  coverElement.id = "scrape-cover";
  coverElement.style = `
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;

    inset: 0;

    background-color: rgba(0, 0, 0, 0.5);

    z-index: 9999999;
  `;

  const promptElement = document.createElement("p");
  promptElement.style = `
    margin: 0;

    color: #fff;
    font-size: 48px;
    text-align: center;
  `;
  promptElement.innerText = text;

  const progressElement = document.createElement("p");
  progressElement.style = `
    margin: 0;

    color: #fff;
    font-size: 32px;
    text-align: center;
  `;
  progressElement.innerText = `${current} / ${total}`;

  const cancelElement = document.createElement("button");
  cancelElement.style = `
    padding: 8px 14px;

    border: 0;
    border-radius: 5px;
    background-color: #FF5252;

    color: #fff;
    font-size: 18px;
    font-weight: 500;

    cursor: pointer;
  `;
  cancelElement.innerText = "Cancel";
  cancelElement.onclick = cancel;

  coverElement.appendChild(promptElement);
  if (current != null && total != null) coverElement.appendChild(progressElement);
  coverElement.appendChild(cancelElement);

  document.body.appendChild(coverElement);
};

const start = () => {
  const { pathname } = location;

  switch (pathname) {
    case "/": {
      login();
      break;
    }
    case "/2.7/client-management": {
      startScrape();
      break;
    }
    default: {
      goToClients();
      break;
    }
  }
};

window.onload = start;
