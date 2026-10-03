use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize)]
pub struct Snapshot {
    pub payload: Option<serde_json::Value>,
    pub revision: i64,
}
pub struct Database {
    pub connection: Connection,
    pub path: PathBuf,
}
impl Database {
    pub fn open(directory: &Path) -> Result<Self, String> {
        std::fs::create_dir_all(directory).map_err(|e| format!("数据目录不可写：{e}"))?;
        let path = directory.join("kari.db");
        let connection = Connection::open(&path).map_err(|e| format!("无法打开数据库：{e}"))?;
        connection.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL, revision INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS schema_meta (version INTEGER NOT NULL); INSERT INTO schema_meta SELECT 1 WHERE NOT EXISTS(SELECT 1 FROM schema_meta);").map_err(|e| e.to_string())?;
        let version: i64 = connection
            .query_row("SELECT version FROM schema_meta LIMIT 1", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        if version != 1 {
            return Err("数据库版本较新，当前版本不能读取".into());
        }
        Ok(Self { connection, path })
    }
    pub fn load(&self) -> Result<Snapshot, String> {
        let mut stmt = self
            .connection
            .prepare("SELECT payload, revision FROM app_state WHERE id=1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
        match rows.next().map_err(|e| e.to_string())? {
            Some(row) => {
                let json: String = row.get(0).map_err(|e| e.to_string())?;
                let payload = serde_json::from_str(&json)
                    .map_err(|e| format!("数据库内容损坏，请恢复备份：{e}"))?;
                Ok(Snapshot {
                    payload: Some(payload),
                    revision: row.get(1).map_err(|e| e.to_string())?,
                })
            }
            None => Ok(Snapshot {
                payload: None,
                revision: 0,
            }),
        }
    }
    pub fn save(
        &mut self,
        payload: serde_json::Value,
        expected_revision: i64,
    ) -> Result<i64, String> {
        if payload.get("schemaVersion").and_then(|v| v.as_u64()) != Some(1) {
            return Err("数据版本不支持".into());
        }
        let json = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
        if json.len() > 20 * 1024 * 1024 {
            return Err("资料库超过20MB，请先导出并整理".into());
        }
        let tx = self.connection.transaction().map_err(|e| e.to_string())?;
        let current = tx
            .query_row(
                "SELECT COALESCE((SELECT revision FROM app_state WHERE id=1),0)",
                [],
                |r| r.get::<_, i64>(0),
            )
            .map_err(|e| e.to_string())?;
        if current != expected_revision {
            return Err("资料已被其他窗口修改，请重新打开以载入最新数据".into());
        }
        let revision = current + 1;
        tx.execute("INSERT INTO app_state(id,payload,revision) VALUES(1,?1,?2) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision",params![json,revision]).map_err(|e|e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;
        Ok(revision)
    }
    pub fn backup_to(&self, destination: &Path) -> Result<(), String> {
        if destination.exists() {
            return Err("备份目标已存在，请选择新文件名".into());
        }
        self.connection
            .execute(
                "VACUUM INTO ?1",
                [destination.to_string_lossy().to_string()],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn persists_and_rejects_stale_writes() {
        let root = tempfile::tempdir().unwrap();
        let mut db = Database::open(root.path()).unwrap();
        let value =
            serde_json::json!({"schemaVersion":1,"works":[{"id":"one"}],"materials":[{"id":"m"}]});
        assert_eq!(db.save(value.clone(), 0).unwrap(), 1);
        assert!(db.save(value.clone(), 0).is_err());
        drop(db);
        let db = Database::open(root.path()).unwrap();
        assert_eq!(db.load().unwrap().payload.unwrap(), value);
        let backup = root.path().join("backup.db");
        db.backup_to(&backup).unwrap();
        let restored = Connection::open(backup).unwrap();
        let revision: i64 = restored
            .query_row("SELECT revision FROM app_state", [], |r| r.get(0))
            .unwrap();
        assert_eq!(revision, 1);
    }
}
