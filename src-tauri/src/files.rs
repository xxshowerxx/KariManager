use std::path::{Path, PathBuf};

pub fn checked_child(root: &str, target: &str) -> Result<PathBuf, String> {
    let base = std::fs::canonicalize(root).map_err(|e| e.to_string())?;
    let child = std::fs::canonicalize(target).map_err(|e| e.to_string())?;
    if !base.is_dir() || child == base || !child.starts_with(&base) {
        return Err("只能删除映射目录内的文件或子文件夹".into());
    }
    Ok(child)
}

pub fn recycle(path: &Path) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows::{
            core::HSTRING,
            Win32::{
                System::Com::{
                    CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER,
                    COINIT_APARTMENTTHREADED,
                },
                UI::Shell::{
                    FileOperation, IFileOperation, IShellItem, SHCreateItemFromParsingName,
                    FOFX_ADDUNDORECORD, FOFX_RECYCLEONDELETE, FOF_NOCONFIRMATION,
                    FOF_WANTNUKEWARNING,
                },
            },
        };
        let target = path
            .to_string_lossy()
            .trim_start_matches(r"\\?\")
            .to_string();
        // Use a fresh STA thread so COM and its objects share one apartment.
        std::thread::spawn(move || -> Result<(), String> {
            unsafe {
                CoInitializeEx(None, COINIT_APARTMENTTHREADED)
                    .ok()
                    .map_err(|e| e.to_string())?;
                let result = (|| -> windows::core::Result<()> {
                    let operation: IFileOperation =
                        CoCreateInstance(&FileOperation, None, CLSCTX_INPROC_SERVER)?;
                    operation.SetOperationFlags(
                        FOFX_RECYCLEONDELETE
                            | FOFX_ADDUNDORECORD
                            | FOF_WANTNUKEWARNING
                            | FOF_NOCONFIRMATION,
                    )?;
                    let item: IShellItem =
                        SHCreateItemFromParsingName(&HSTRING::from(target), None)?;
                    operation.DeleteItem(&item, None)?;
                    operation.PerformOperations()?;
                    if operation.GetAnyOperationsAborted()?.as_bool() {
                        return Err(windows::core::Error::from_hresult(windows::core::HRESULT(
                            0x80004004u32 as i32,
                        )));
                    }
                    Ok(())
                })();
                CoUninitialize();
                result.map_err(|e| format!("未能移入回收站：{e}"))
            }
        })
        .join()
        .map_err(|_| "回收站操作失败".to_string())?
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        Err("当前仅支持 Windows 回收站".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_root_and_outside_paths() {
        let root = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let child = root.path().join("nested");
        std::fs::create_dir(&child).unwrap();
        let base = root.path().to_str().unwrap();
        assert!(checked_child(base, base).is_err());
        assert!(checked_child(base, outside.path().to_str().unwrap()).is_err());
        assert!(checked_child(base, child.to_str().unwrap()).is_ok());
    }
}
