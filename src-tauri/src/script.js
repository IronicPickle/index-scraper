const byId = (id) => document.getElementById(id);

const goto = (url) => setTimeout(() => location.replace(url), 1000);

const login = () => {
  const usernameInput = byId("login");
  const passwordInput = byId("password");
  const loginButton = byId("loginbutton");

  usernameInput.value = "NathanRath1";
  passwordInput.value = "NathanRath1";
  loginButton.click();
};

const goToClients = () => {
  // goto("/2.7/client-management");
};

const start = () => {
  const { pathname } = location;

  console.log(pathname);
  switch (pathname) {
    case "/": {
      login();
    }
    case "/2.7/case-management": {
      goToClients();
    }
    default: {
      console.log("done");
    }
  }
};

window.onload = start;
