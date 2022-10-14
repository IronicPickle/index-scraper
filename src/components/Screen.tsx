import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import { useState } from "preact/hooks";

interface LaunchRes {
  success: boolean;
  error: string;
}

export default function Screen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);

  const launch = async () => {
    setError(null);

    if (username.length === 0 || password.length === 0) {
      return setError("Username and Password are both required!");
    }

    const folder = await open({
      title: "Choose a save location for the csv file",
      directory: true,
    });

    if (!folder || typeof folder === "object") return;

    const { success, error } = await invoke<LaunchRes>("launch", {
      folderPath: folder,
      username,
      password,
    });

    if (!success) setError(error);
  };

  return (
    <div id="screen">
      <div className="wrapper">
        <h1>Client Data Scraper</h1>
        <h3>Input your CMS Login Details to begin</h3>
        <form
          onSubmit={(event) => {
            event.stopPropagation();
            event.preventDefault();
            launch();
          }}
        >
          <div className="entry">
            <label htmlFor="username">Username</label>
            <input
              name="username"
              id="username"
              type="text"
              placeholder="Username"
              value={username}
              onChange={({ currentTarget: { value } }) => setUsername(value)}
            />
          </div>
          <div className="entry">
            <label htmlFor="password">Password</label>
            <input
              name="password"
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={({ currentTarget: { value } }) => setPassword(value)}
            />
          </div>

          {error && <p class="error">{error}</p>}

          <button type="submit">Begin Scrape</button>
        </form>
      </div>
    </div>
  );
}
