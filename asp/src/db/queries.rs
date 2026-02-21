use crate::error::AspError;

use super::Database;

#[derive(Debug, Clone)]
pub struct CommitmentRow {
    pub leaf_index: u32,
    pub commitment: String,
    pub deposit_tx: Option<String>,
}

#[derive(Debug, Clone)]
pub struct NullifierRow {
    pub nullifier_hash: String,
    pub circuit_type: String,
    pub tx_hash: Option<String>,
}

impl Database {
    // --- Commitments ---

    pub fn insert_commitment(
        &self,
        leaf_index: u32,
        commitment: &str,
        deposit_tx: Option<&str>,
    ) -> Result<(), AspError> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT OR IGNORE INTO commitments (leaf_index, commitment, deposit_tx) VALUES (?1, ?2, ?3)",
            rusqlite::params![leaf_index, commitment, deposit_tx],
        )?;
        Ok(())
    }

    pub fn get_commitment(&self, leaf_index: u32) -> Result<Option<CommitmentRow>, AspError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT leaf_index, commitment, deposit_tx FROM commitments WHERE leaf_index = ?1",
        )?;
        let mut rows = stmt.query_map(rusqlite::params![leaf_index], |row| {
            Ok(CommitmentRow {
                leaf_index: row.get(0)?,
                commitment: row.get(1)?,
                deposit_tx: row.get(2)?,
            })
        })?;
        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    }

    pub fn get_all_commitments(&self) -> Result<Vec<CommitmentRow>, AspError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT leaf_index, commitment, deposit_tx FROM commitments ORDER BY leaf_index ASC",
        )?;
        let rows = stmt
            .query_map([], |row| {
                Ok(CommitmentRow {
                    leaf_index: row.get(0)?,
                    commitment: row.get(1)?,
                    deposit_tx: row.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn get_leaf_count(&self) -> Result<u32, AspError> {
        let conn = self.conn()?;
        let count: u32 =
            conn.query_row("SELECT COUNT(*) FROM commitments", [], |row| row.get(0))?;
        Ok(count)
    }

    pub fn find_commitment_leaf_index(&self, commitment: &str) -> Result<Option<u32>, AspError> {
        let conn = self.conn()?;
        let result: Result<u32, _> = conn.query_row(
            "SELECT leaf_index FROM commitments WHERE commitment = ?1",
            rusqlite::params![commitment],
            |row| row.get(0),
        );
        match result {
            Ok(index) => Ok(Some(index)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    // --- Merkle Roots ---

    pub fn insert_root(
        &self,
        root: &str,
        leaf_count: u32,
        submit_tx: Option<&str>,
    ) -> Result<(), AspError> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT INTO merkle_roots (root, leaf_count, submit_tx) VALUES (?1, ?2, ?3)",
            rusqlite::params![root, leaf_count, submit_tx],
        )?;
        Ok(())
    }

    pub fn get_latest_root(&self) -> Result<Option<String>, AspError> {
        let conn = self.conn()?;
        let result: Result<String, _> = conn.query_row(
            "SELECT root FROM merkle_roots ORDER BY id DESC LIMIT 1",
            [],
            |row| row.get(0),
        );
        match result {
            Ok(root) => Ok(Some(root)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    // --- Nullifiers ---

    pub fn insert_nullifier(
        &self,
        nullifier_hash: &str,
        circuit_type: &str,
        tx_hash: Option<&str>,
    ) -> Result<(), AspError> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT OR IGNORE INTO nullifiers (nullifier_hash, circuit_type, tx_hash) VALUES (?1, ?2, ?3)",
            rusqlite::params![nullifier_hash, circuit_type, tx_hash],
        )?;
        Ok(())
    }

    pub fn is_nullifier_spent(&self, nullifier_hash: &str) -> Result<bool, AspError> {
        let conn = self.conn()?;
        let count: u32 = conn.query_row(
            "SELECT COUNT(*) FROM nullifiers WHERE nullifier_hash = ?1",
            rusqlite::params![nullifier_hash],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    pub fn get_nullifier(&self, nullifier_hash: &str) -> Result<Option<NullifierRow>, AspError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT nullifier_hash, circuit_type, tx_hash FROM nullifiers WHERE nullifier_hash = ?1",
        )?;
        let mut rows = stmt.query_map(rusqlite::params![nullifier_hash], |row| {
            Ok(NullifierRow {
                nullifier_hash: row.get(0)?,
                circuit_type: row.get(1)?,
                tx_hash: row.get(2)?,
            })
        })?;
        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    }

    // --- Sync State ---

    pub fn get_sync_state(&self, key: &str) -> Result<Option<String>, AspError> {
        let conn = self.conn()?;
        let result: Result<String, _> = conn.query_row(
            "SELECT value FROM sync_state WHERE key = ?1",
            rusqlite::params![key],
            |row| row.get(0),
        );
        match result {
            Ok(val) => Ok(Some(val)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn set_sync_state(&self, key: &str, value: &str) -> Result<(), AspError> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT OR REPLACE INTO sync_state (key, value) VALUES (?1, ?2)",
            rusqlite::params![key, value],
        )?;
        Ok(())
    }

    /// Simple health check — verifies the database is accessible.
    pub fn is_healthy(&self) -> bool {
        self.conn()
            .and_then(|c| {
                c.query_row("SELECT 1", [], |_| Ok(()))
                    .map_err(|e| e.into())
            })
            .is_ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_db() -> Database {
        let db = Database::new(":memory:").unwrap();
        db.run_migrations().unwrap();
        db
    }

    #[test]
    fn test_insert_and_get_commitment() {
        let db = test_db();
        db.insert_commitment(0, "12345", Some("0xabc")).unwrap();
        let row = db.get_commitment(0).unwrap().unwrap();
        assert_eq!(row.leaf_index, 0);
        assert_eq!(row.commitment, "12345");
        assert_eq!(row.deposit_tx.as_deref(), Some("0xabc"));
    }

    #[test]
    fn test_get_leaf_count() {
        let db = test_db();
        assert_eq!(db.get_leaf_count().unwrap(), 0);
        db.insert_commitment(0, "aaa", None).unwrap();
        assert_eq!(db.get_leaf_count().unwrap(), 1);
        db.insert_commitment(1, "bbb", None).unwrap();
        assert_eq!(db.get_leaf_count().unwrap(), 2);
    }

    #[test]
    fn test_insert_commitment_idempotent() {
        let db = test_db();
        db.insert_commitment(0, "aaa", None).unwrap();
        // INSERT OR IGNORE — should not error on duplicate
        db.insert_commitment(0, "aaa", None).unwrap();
        assert_eq!(db.get_leaf_count().unwrap(), 1);
    }

    #[test]
    fn test_insert_and_get_root() {
        let db = test_db();
        db.insert_root("root123", 1, Some("0xdef")).unwrap();
        let root = db.get_latest_root().unwrap();
        assert_eq!(root.as_deref(), Some("root123"));
    }

    #[test]
    fn test_get_latest_root_empty() {
        let db = test_db();
        assert!(db.get_latest_root().unwrap().is_none());
    }

    #[test]
    fn test_nullifier_lifecycle() {
        let db = test_db();
        db.insert_nullifier("nul1", "membership", Some("0x111"))
            .unwrap();
        assert!(db.is_nullifier_spent("nul1").unwrap());
        let row = db.get_nullifier("nul1").unwrap().unwrap();
        assert_eq!(row.circuit_type, "membership");
        assert_eq!(row.tx_hash.as_deref(), Some("0x111"));
    }

    #[test]
    fn test_nullifier_not_found() {
        let db = test_db();
        assert!(!db.is_nullifier_spent("nonexistent").unwrap());
        assert!(db.get_nullifier("nonexistent").unwrap().is_none());
    }

    #[test]
    fn test_nullifier_idempotent() {
        let db = test_db();
        db.insert_nullifier("nul1", "swap", None).unwrap();
        // INSERT OR IGNORE — should not error
        db.insert_nullifier("nul1", "swap", None).unwrap();
        assert!(db.is_nullifier_spent("nul1").unwrap());
    }

    #[test]
    fn test_sync_state() {
        let db = test_db();
        assert!(db.get_sync_state("last_block").unwrap().is_none());
        db.set_sync_state("last_block", "100").unwrap();
        assert_eq!(
            db.get_sync_state("last_block").unwrap().as_deref(),
            Some("100")
        );
        // Overwrite
        db.set_sync_state("last_block", "200").unwrap();
        assert_eq!(
            db.get_sync_state("last_block").unwrap().as_deref(),
            Some("200")
        );
    }

    #[test]
    fn test_is_healthy() {
        let db = test_db();
        assert!(db.is_healthy());
    }

    #[test]
    fn test_get_all_commitments_ordered() {
        let db = test_db();
        db.insert_commitment(2, "ccc", None).unwrap();
        db.insert_commitment(0, "aaa", None).unwrap();
        db.insert_commitment(1, "bbb", None).unwrap();

        let all = db.get_all_commitments().unwrap();
        assert_eq!(all.len(), 3);
        assert_eq!(all[0].leaf_index, 0);
        assert_eq!(all[1].leaf_index, 1);
        assert_eq!(all[2].leaf_index, 2);
    }
}
