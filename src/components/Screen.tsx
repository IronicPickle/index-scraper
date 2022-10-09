import { emit } from "@tauri-apps/api/event";

export default function Screen() {
  return (
    <button
      onClick={() => {
        emit("launch", {
          test: "This is a test",
        });
      }}
    >
      Launch
    </button>
  );
}
