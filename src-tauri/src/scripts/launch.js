const USERNAME = "%USERNAME%";
const PASSWORD = "%PASSWORD%";
const FILE_UUID = "%FILE_UUID%";

const byId = (id) => document.getElementById(id);
const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const login = () => {
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

const goToClients = () => {
  const topMenu = document.getElementsByClassName("top-menu").item(0);
  const clientButton = topMenu.children.item(2).firstChild;
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

const clientsToCsv = (clients) => {
  let csv = "";
  const fieldsTop = [];
  const fieldsBottom = [];
  for (const { category, data } of Object.values(clients[0])) {
    for (const { key } of Object.values(data)) {
      fieldsTop.push(category);
      fieldsBottom.push(key);
    }
  }
  csv += fieldsTop.join(",") + "\r\n";
  csv += fieldsBottom.join(",") + "\r\n";

  for (const client of Object.values(clients)) {
    const fields = [];
    for (const { data } of Object.values(client)) {
      for (const { value } of Object.values(data)) {
        fields.push(value);
      }
    }
    csv += fields.join(",") + "\r\n";
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

let clients = [];

const categories = ["Client Contact Details", "Admin options"];

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
    const key = await queryDoc(() => trElement.firstElementChild.innerText);
    const value = await queryDoc(() => trElement.lastElementChild.firstElementChild.value, true);

    if (!key) {
      const newCategory = await queryDoc(
        () => trElement.firstElementChild.firstElementChild.value,
        true,
      );
      if (newCategory != null) {
        if (categories.includes(newCategory)) {
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

    if (!category) continue;

    data[i].data.push({
      key,
      value,
    });
  }

  tbodyElement.remove();

  return data;
};

const startScrape = async () => {
  const tbodyElement = await queryDoc(() =>
    document.getElementById("existing").firstChild.children.item(1),
  );

  let max = 1;
  let i = 0;

  for await (const trElement of tbodyElement.children) {
    if (i >= max) break;
    ++i;
    trElement.click();

    clients.push(await scrapeClientData());

    goBackToClients();
  }

  const csv = clientsToCsv(clients);

  downloadCsv(csv);
};

const start = () => {
  const { pathname } = location;

  console.log({ USERNAME, PASSWORD });

  switch (pathname) {
    case "/": {
      login();
      break;
    }
    case "/2.7/case-management": {
      goToClients();
      break;
    }
    case "/2.7/client-management": {
      startScrape();
      break;
    }
    default: {
      break;
    }
  }
};

window.onload = start;
