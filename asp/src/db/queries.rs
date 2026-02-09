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
        let conn = self.conn();
        conn.execute(
            "INSERT INTO commitments (leaf_index, commitment, deposit_tx) VALUES (?1, ?2, ?3)",
            rusqlite::params![leaf_index, commitment, deposit_tx],
        )?;
        Ok(())
    }

    pub fn get_commitment(&self, leaf_index: u32) -> Result<Option<CommitmentRow>, AspError> {
        let conn = self.conn();
        let mut stmt =
            conn.prepare("SELECT leaf_index, commitment, deposit_tx FROM commitments WHERE leaf_index = ?1")?;
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
        let conn = self.conn();
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
        let conn = self.conn();
        let count: u32 =
            conn.query_row("SELECT COUNT(*) FROM commitments", [], |row| row.get(0))?;
        Ok(count)
    }

    // --- Merkle Roots ---

    pub fn insert_root(
        &self,
        root: &str,
        leaf_count: u32,
        submit_tx: Option<&str>,
    ) -> Result<(), AspError> {
        let conn = self.conn();
        conn.execute(
            "INSERT INTO merkle_roots (root, leaf_count, submit_tx) VALUES (?1, ?2, ?3)",
            rusqlite::params![root, leaf_count, submit_tx],
        )?;
        Ok(())
    }

    pub fn get_latest_root(&self) -> Result<Option<String>, AspError> {
        let conn = self.conn();
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
        let conn = self.conn();
        conn.execute(
            "INSERT INTO nullifiers (nullifier_hash, circuit_type, tx_hash) VALUES (?1, ?2, ?3)",
            rusqlite::params![nullifier_hash, circuit_type, tx_hash],
        )?;
        Ok(())
    }

    pub fn is_nullifier_spent(&self, nullifier_hash: &str) -> Result<bool, AspError> {
        let conn = self.conn();
        let count: u32 = conn.query_row(
            "SELECT COUNT(*) FROM nullifiers WHERE nullifier_hash = ?1",
            rusqlite::params![nullifier_hash],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    pub fn get_nullifier(&self, nullifier_hash: &str) -> Result<Option<NullifierRow>, AspError> {
        let conn = self.conn();
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
        let conn = self.conn();
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
        let conn = self.conn();
        conn.execute(
            "INSERT OR REPLACE INTO sync_state (key, value) VALUES (?1, ?2)",
            rusqlite::params![key, value],
        )?;
        Ok(())
    }
}
