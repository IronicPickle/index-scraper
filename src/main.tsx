import { render } from "preact";
import Root from "./Root";

import "./styles/index.scss";

render(<Root />, document.getElementById("app") as HTMLElement);
