import Screen from "@components/Screen";

export default function Root() {
  console.log((window as any).__TAURI__);
  return <Screen />;
}
