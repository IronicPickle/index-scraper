#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;

use std::fs::File;
use std::io::prelude::*;

fn get_script() -> std::io::Result<String> {
    let mut file = File::open("./src/script.js")?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();

            let _id = app.listen_global("launch", move |_event| {
                let script = get_script().expect("Could not read script");

                let window = tauri::WindowBuilder::new(
                    &handle,
                    "index",
                    tauri::WindowUrl::External("https://indexlive.co.uk/".parse().unwrap()),
                )
                .initialization_script(script.as_str())
                .build()
                .unwrap();

                window
                    .eval(script.as_str())
                    .expect("err while running running eval");
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
