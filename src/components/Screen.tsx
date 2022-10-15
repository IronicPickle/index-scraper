import { invoke } from "@tauri-apps/api/tauri";
import { useState } from "preact/hooks";

interface LaunchRes {
  success: boolean;
  error: string;
}

const allCategories = [
  "Client Contact Details",
  "OOS Pricing and Options",
  "Lexsure Options",
  "Thirdfort Options",
  "HelloSign Options",
  "Admin options",
  "CMS Options",
  "Third Party Provider Options",
  "Email Options",
];

export default function Screen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [categories, setCategories] = useState<string[]>(allCategories);

  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (category: string) => {
    const index = categories.indexOf(category);
    if (index >= 0) {
      setCategories((categories) => [
        ...categories.slice(0, index),
        ...categories.slice(index + 1),
      ]);
    } else setCategories((categories) => [...categories, category]);
  };

  const launch = async () => {
    setError(null);

    if (username.length === 0 || password.length === 0) {
      return setError("Username and Password are both required!");
    }

    const { success, error } = await invoke<LaunchRes>("launch", {
      username,
      password,
      categories: JSON.stringify(categories),
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
          <div className="columns">
            <div className="column">
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

              <button type="submit">Begin Scrape</button>
            </div>

            <div className="column">
              <label htmlFor="username">Sections to Include</label>

              {allCategories.map((category) => (
                <div key={category} className="entry row">
                  <input
                    name={category}
                    id={category}
                    type="checkbox"
                    checked={categories.includes(category)}
                    onChange={() => toggleCategory(category)}
                  />
                  <label htmlFor={category}>{category}</label>
                </div>
              ))}
            </div>
          </div>

          {error && <p class="error">{error}</p>}
        </form>
      </div>
    </div>
  );
}
