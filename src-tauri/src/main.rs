#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::async_runtime::{block_on, channel, Receiver};

use std::io::prelude::*;
use std::io::Result;
use std::time::Duration;
use std::{
    fs::{remove_file, write, File},
    path::Path,
};

use dirs::download_dir;
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug)]
struct LaunchRes {
    success: bool,
    error: String,
}

fn read_file(file_path: &str) -> Result<String> {
    let mut file = File::open(file_path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

fn delete_file(file_path: &str) -> Result<()> {
    remove_file(Path::new(file_path))?;
    Ok(())
}

fn write_file(file_path: &str, contents: &str) -> Result<()> {
    write(Path::new(file_path), contents)?;
    Ok(())
}

#[tauri::command]
async fn launch(
    handle: tauri::AppHandle,
    username: String,
    password: String,
    folder_path: String,
) -> LaunchRes {
    let mut script = read_file("./src/scripts/launch.js").expect("Could not read script");

    let file_uuid = Uuid::new_v4().to_string();

    script = script.replace("%USERNAME%", &username);
    script = script.replace("%PASSWORD%", &password);
    script = script.replace("%FILE_UUID%", &file_uuid);

    let window = tauri::WindowBuilder::new(
        &handle,
        "index",
        tauri::WindowUrl::External("https://indexlive.co.uk/".parse().unwrap()),
    )
    .initialization_script(&script)
    .build()
    .unwrap();

    window
        .eval(&script)
        .expect("err while running running eval");

    let (success, file_path) = async_watch(&file_uuid).await.expect("Watch failed");

    if !success {
        let error = read_file(&file_path).expect("Cannot read error file");
        delete_file(&file_path).expect("Cannot delete error file");

        window.close().expect("Close failed");
        return LaunchRes {
            success: false,
            error,
        };
    }

    let save_path = Path::new(&folder_path)
        .join("clients.csv")
        .into_os_string()
        .into_string()
        .expect("Cannot get save path");

    let csv = read_file(&file_path).expect("Cannot read clients csv file");
    delete_file(&file_path).expect("Cannot delete client csv file");
    if !csv.is_empty() {
        write_file(&save_path, &csv).expect("Cannot write clients csv file");
    }

    window.close().expect("Close failed");

    opener::open(&save_path).expect("Cannot open clients csv file");

    return LaunchRes {
        success: true,
        error: String::from(""),
    };
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![launch])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn async_watcher() -> notify::Result<(RecommendedWatcher, Receiver<notify::Result<notify::Event>>)>
{
    let (tx, rx) = channel(1);

    let watcher = RecommendedWatcher::new(
        move |res| {
            block_on(async {
                tx.send(res).await.unwrap();
            });
        },
        Config::default().with_poll_interval(Duration::from_secs(1)),
    )?;

    Ok((watcher, rx))
}

async fn async_watch(file_uuid: &str) -> notify::Result<(bool, String)> {
    let (mut watcher, mut rx) = async_watcher()?;

    let download_dir = download_dir().expect("Cannot get download dir");

    watcher
        .watch(download_dir.as_path(), RecursiveMode::Recursive)
        .expect("Watch failed");

    let mut success = true;
    let mut file_path = String::new();

    while let Some(res) = rx.recv().await {
        match res {
            Ok(event) => {
                let path = &event.paths[0];
                let file_name = path
                    .file_name()
                    .expect("Cannot get file name")
                    .to_str()
                    .expect("Cannot get file name");

                let mut clients_file_name = String::from("clients-");
                clients_file_name.push_str(file_uuid);
                clients_file_name.push_str(".csv");

                let mut error_file_name = String::from("error-");
                error_file_name.push_str(file_uuid);
                error_file_name.push_str(".txt");

                if event.kind.is_modify() {
                    if file_name == &error_file_name {
                        file_path.push_str(path.to_str().expect("Cannot get file path"));
                        success = false;
                        break;
                    }
                    if file_name == &clients_file_name {
                        file_path.push_str(path.to_str().expect("Cannot get file path"));
                        break;
                    }
                }
            }
            Err(e) => println!("watch error: {:?}", e),
        }
    }

    Ok((success, file_path))
}
