#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod db;
use db::{Database, Snapshot};
use serde::Serialize;
use std::{
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::Manager;

struct AppDatabase(Mutex<Database>);
#[tauri::command]
fn load_state(state: tauri::State<AppDatabase>) -> Result<Snapshot, String> {
    state.0.lock().map_err(|e| e.to_string())?.load()
}
#[tauri::command]
fn save_state(
    payload: serde_json::Value,
    expected_revision: i64,
    state: tauri::State<AppDatabase>,
) -> Result<i64, String> {
    state
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .save(payload, expected_revision)
}
#[tauri::command]
fn data_location(state: tauri::State<AppDatabase>) -> Result<String, String> {
    Ok(state
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .path
        .parent()
        .unwrap()
        .to_string_lossy()
        .to_string())
}
#[tauri::command]
fn backup_database(state: tauri::State<AppDatabase>) -> Result<String, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let directory = db.path.parent().unwrap().join("backups");
    std::fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let target = directory.join(format!("kari-{stamp}.db"));
    db.backup_to(&target)?;
    Ok(target.to_string_lossy().to_string())
}
#[tauri::command]
fn move_database(
    directory: String,
    app: tauri::AppHandle,
    state: tauri::State<AppDatabase>,
) -> Result<String, String> {
    let destination = PathBuf::from(directory);
    if !destination.is_absolute() {
        return Err("请选择绝对路径的数据目录".into());
    }
    std::fs::create_dir_all(&destination).map_err(|e| e.to_string())?;
    let mut db = state.0.lock().map_err(|e| e.to_string())?;
    if std::fs::canonicalize(db.path.parent().unwrap()).ok()
        == std::fs::canonicalize(&destination).ok()
    {
        return Ok(destination.to_string_lossy().to_string());
    }
    db.backup_to(&destination.join("kari.db"))?;
    let next = Database::open(&destination)?;
    let settings = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&settings).map_err(|e| e.to_string())?;
    std::fs::write(
        settings.join("data-location.txt"),
        destination.to_string_lossy().as_bytes(),
    )
    .map_err(|e| e.to_string())?;
    *db = next;
    Ok(destination.to_string_lossy().to_string())
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FileEntry {
    path: String,
    relative_path: String,
    name: String,
    directory: bool,
    size: u64,
}
#[derive(Serialize)]
struct DirectoryResult {
    entries: Vec<FileEntry>,
    truncated: bool,
}
#[tauri::command]
fn list_directory(
    root: String,
    recursive: bool,
    extensions: Vec<String>,
) -> Result<DirectoryResult, String> {
    let base = PathBuf::from(root);
    if !base.is_dir() {
        return Err("素材目录不存在或不是文件夹".into());
    }
    let mut output = DirectoryResult {
        entries: Vec::new(),
        truncated: false,
    };
    let mut pending = vec![(base.clone(), 0u32)];
    while let Some((dir, depth)) = pending.pop() {
        for item in std::fs::read_dir(dir).map_err(|e| format!("读取目录失败：{e}"))? {
            let entry = item.map_err(|e| e.to_string())?;
            let kind = entry.file_type().map_err(|e| e.to_string())?;
            if kind.is_symlink() {
                continue;
            }
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if kind.is_dir() {
                if recursive
                    && depth < 32
                    && !name.starts_with('.')
                    && !matches!(name.as_str(), "node_modules" | "target")
                {
                    pending.push((path.clone(), depth + 1));
                }
            } else if !extensions.is_empty()
                && !extensions.iter().any(|e| {
                    path.extension()
                        .map(|x| {
                            x.to_string_lossy()
                                .eq_ignore_ascii_case(e.trim_start_matches('.'))
                        })
                        .unwrap_or(false)
                })
            {
                continue;
            }
            output.entries.push(FileEntry {
                relative_path: path
                    .strip_prefix(&base)
                    .map_err(|e| e.to_string())?
                    .to_string_lossy()
                    .to_string(),
                path: path.to_string_lossy().to_string(),
                name,
                directory: kind.is_dir(),
                size: entry.metadata().map(|m| m.len()).unwrap_or(0),
            });
            if output.entries.len() >= 20_000 {
                output.truncated = true;
                return Ok(output);
            }
        }
    }
    output
        .entries
        .sort_by(|a, b| b.directory.cmp(&a.directory).then(a.name.cmp(&b.name)));
    Ok(output)
}
#[tauri::command]
fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}
#[tauri::command]
fn read_text(path: String) -> Result<String, String> {
    let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    if metadata.len() > 20 * 1024 * 1024 {
        return Err("文件超过20MB".into());
    }
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}
#[tauri::command]
fn write_text(path: String, content: String) -> Result<(), String> {
    if content.len() > 20 * 1024 * 1024 {
        return Err("输出超过20MB".into());
    }
    std::fs::write(path, content).map_err(|e| e.to_string())
}
#[tauri::command]
fn open_target(target: String, reveal: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let mut command = if target.starts_with("https://") || target.starts_with("http://") {
            let mut c = std::process::Command::new("rundll32.exe");
            c.arg("url.dll,FileProtocolHandler").arg(&target);
            c
        } else {
            let path = PathBuf::from(&target);
            if !path.exists() {
                return Err("本地位置不存在，请重新定位".into());
            }
            let mut c = std::process::Command::new("explorer.exe");
            if reveal && path.is_file() {
                c.arg(format!("/select,{target}"));
            } else {
                c.arg(path);
            }
            c
        };
        command
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (target, reveal);
        Err("当前首版仅支持Windows".into())
    }
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let explicit = std::env::var_os("KARI_DATA_DIR")
                .map(PathBuf::from)
                .or_else(|| {
                    app.path()
                        .app_config_dir()
                        .ok()
                        .and_then(|p| std::fs::read_to_string(p.join("data-location.txt")).ok())
                        .map(|s| PathBuf::from(s.trim()))
                });
            let portable = std::env::current_exe()?.parent().unwrap().join("data");
            let folder = explicit.unwrap_or_else(|| {
                if cfg!(debug_assertions) {
                    app.path().app_local_data_dir().unwrap_or(portable.clone())
                } else {
                    portable.clone()
                }
            });
            let database = Database::open(&folder).map_err(std::io::Error::other)?;
            app.manage(AppDatabase(Mutex::new(database)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            data_location,
            backup_database,
            move_database,
            list_directory,
            path_exists,
            read_text,
            write_text,
            open_target
        ])
        .run(tauri::generate_context!())
        .expect("KariManager启动失败");
}
