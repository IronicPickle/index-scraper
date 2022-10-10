const byId = (id) => document.getElementById(id);
const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const login = () => {
  const usernameInput = byId("login");
  const passwordInput = byId("password");
  const loginButton = byId("loginbutton");

  usernameInput.value = "NathanRath1";
  passwordInput.value = "NathanRath1";
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

const queryDoc = async (queryFunc) => {
  while (true) {
    try {
      const element = queryFunc();
      if (element == null) throw new Error("No element found");
      return element;
    } catch (_) {
      await sleep(500);
    }
  }
};

let clients = [];

const keys = [
  "Client ID:",
  "Company Name:",
  "Branch:",
  "Address:",
  "Town:",
  "Country:",
  "Post Code:",
  "Phone Number:",
  "Fax Number:",
  "DX Number:",
  "DX Exchange:",
];

const scrapeClientData = async () => {
  const tbodyElement = await queryDoc(
    () =>
      document.getElementById("client_form").firstElementChild.firstElementChild.firstElementChild,
  );
  const trElements = tbodyElement.getElementsByTagName("tr");

  const data = {};

  for await (const trElement of trElements) {
    const key = await queryDoc(() => trElement.firstElementChild.innerText);
    if (!keys.includes(key)) continue;
    const value = await queryDoc(() => trElement.lastElementChild.firstElementChild.value);
    data[key] = value;
  }

  tbodyElement.remove();

  return data;
};

const startScrape = async () => {
  const tbodyElement = await queryDoc(() =>
    document.getElementById("existing").firstChild.children.item(1),
  );

  let max = 3;
  let i = 0;

  for await (const trElement of tbodyElement.children) {
    if (i >= max) return;
    ++i;
    trElement.click();

    const clientData = await scrapeClientData();

    console.log(clientData);

    return;

    goBackToClients();
  }
};

const start = () => {
  const { pathname } = location;

  switch (pathname) {
    case "/": {
      login();
    }
    case "/2.7/case-management": {
      goToClients();
    }
    case "/2.7/client-management": {
      startScrape();
    }
    default: {
      console.log("done");
    }
  }
};

window.onload = start;
