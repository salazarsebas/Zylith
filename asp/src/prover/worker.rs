use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, ChildStdout};

use crate::error::AspError;

pub struct Worker {
    _child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

#[derive(Serialize)]
struct WorkerRequest {
    id: String,
    command: String,
    params: Value,
}

#[derive(Deserialize)]
struct WorkerResponse {
    id: String,
    ok: bool,
    #[serde(default)]
    data: Value,
    #[serde(default)]
    error: Option<String>,
}

impl Worker {
    pub async fn spawn(worker_path: &str) -> Result<Self, AspError> {
        let mut child = tokio::process::Command::new("node")
            .arg(worker_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .map_err(|e| AspError::WorkerUnavailable(format!("Failed to spawn worker: {e}")))?;

        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| AspError::WorkerUnavailable("No stdin on worker".into()))?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| AspError::WorkerUnavailable("No stdout on worker".into()))?;

        let stdout = BufReader::new(stdout);

        // Wait for the "ready" signal from worker
        let mut worker = Worker {
            _child: child,
            stdin,
            stdout,
        };

        let mut line = String::new();
        worker
            .stdout
            .read_line(&mut line)
            .await
            .map_err(|e| AspError::WorkerUnavailable(format!("Worker startup failed: {e}")))?;

        let msg: Value = serde_json::from_str(line.trim())
            .map_err(|e| AspError::WorkerUnavailable(format!("Invalid worker ready message: {e}")))?;

        if msg.get("ready").and_then(|v| v.as_bool()) != Some(true) {
            return Err(AspError::WorkerUnavailable(
                "Worker did not send ready signal".into(),
            ));
        }

        tracing::info!("Worker ready");
        Ok(worker)
    }

    async fn send_command(&mut self, command: &str, params: Value) -> Result<Value, AspError> {
        let id = uuid::Uuid::new_v4().to_string();
        let request = WorkerRequest {
            id: id.clone(),
            command: command.to_string(),
            params,
        };

        let mut json = serde_json::to_string(&request)
            .map_err(|e| AspError::Internal(format!("Failed to serialize request: {e}")))?;
        json.push('\n');

        self.stdin
            .write_all(json.as_bytes())
            .await
            .map_err(|e| AspError::WorkerUnavailable(format!("Failed to write to worker: {e}")))?;
        self.stdin
            .flush()
            .await
            .map_err(|e| AspError::WorkerUnavailable(format!("Failed to flush worker stdin: {e}")))?;

        let mut line = String::new();
        self.stdout
            .read_line(&mut line)
            .await
            .map_err(|e| AspError::WorkerUnavailable(format!("Failed to read from worker: {e}")))?;

        let response: WorkerResponse = serde_json::from_str(line.trim())
            .map_err(|e| AspError::WorkerUnavailable(format!("Invalid worker response: {e}")))?;

        if response.id != id {
            return Err(AspError::Internal(format!(
                "Worker response ID mismatch: expected {id}, got {}",
                response.id
            )));
        }

        if !response.ok {
            return Err(AspError::ProverError(
                response.error.unwrap_or_else(|| "Unknown worker error".into()),
            ));
        }

        Ok(response.data)
    }

    /// Build/rebuild the Merkle tree from a list of commitment leaves (decimal strings).
    /// Returns the root as a decimal string.
    pub async fn build_tree(&mut self, leaves: &[String]) -> Result<String, AspError> {
        let params = serde_json::json!({ "leaves": leaves });
        let data = self.send_command("build_tree", params).await?;
        data["root"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| AspError::ProverError("Missing root in build_tree response".into()))
    }

    /// Get a Merkle proof for a leaf at the given index.
    pub async fn get_proof(
        &mut self,
        leaf_index: u32,
    ) -> Result<MerkleProof, AspError> {
        let params = serde_json::json!({ "leafIndex": leaf_index });
        let data = self.send_command("get_proof", params).await?;
        let proof: MerkleProof = serde_json::from_value(data)
            .map_err(|e| AspError::ProverError(format!("Invalid proof response: {e}")))?;
        Ok(proof)
    }

    /// Compute a note commitment and nullifier hash.
    pub async fn compute_commitment(
        &mut self,
        secret: &str,
        nullifier: &str,
        amount_low: &str,
        amount_high: &str,
        token: &str,
    ) -> Result<CommitmentResult, AspError> {
        let params = serde_json::json!({
            "secret": secret,
            "nullifier": nullifier,
            "amount_low": amount_low,
            "amount_high": amount_high,
            "token": token,
        });
        let data = self.send_command("compute_commitment", params).await?;
        let result: CommitmentResult = serde_json::from_value(data)
            .map_err(|e| AspError::ProverError(format!("Invalid commitment response: {e}")))?;
        Ok(result)
    }

    /// Compute a position commitment and nullifier hash.
    pub async fn compute_position_commitment(
        &mut self,
        secret: &str,
        nullifier: &str,
        tick_lower: i32,
        tick_upper: i32,
        liquidity: &str,
    ) -> Result<CommitmentResult, AspError> {
        let params = serde_json::json!({
            "secret": secret,
            "nullifier": nullifier,
            "tickLower": tick_lower,
            "tickUpper": tick_upper,
            "liquidity": liquidity,
        });
        let data = self.send_command("compute_position_commitment", params).await?;
        let result: CommitmentResult = serde_json::from_value(data)
            .map_err(|e| AspError::ProverError(format!("Invalid position commitment response: {e}")))?;
        Ok(result)
    }

    /// Generate a Groth16 proof and return Garaga calldata.
    pub async fn generate_proof(
        &mut self,
        circuit: &str,
        inputs: Value,
    ) -> Result<ProofResult, AspError> {
        let params = serde_json::json!({
            "circuit": circuit,
            "inputs": inputs,
        });
        let data = self.send_command("generate_proof", params).await?;
        let result: ProofResult = serde_json::from_value(data)
            .map_err(|e| AspError::ProverError(format!("Invalid proof result: {e}")))?;
        Ok(result)
    }

    /// Insert a single leaf and get the new root.
    pub async fn insert_leaf(&mut self, leaf: &str) -> Result<String, AspError> {
        let params = serde_json::json!({ "leaf": leaf });
        let data = self.send_command("insert_leaf", params).await?;
        data["root"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| AspError::ProverError("Missing root in insert_leaf response".into()))
    }

    /// Get the current tree root without modifying the tree.
    pub async fn get_root(&mut self) -> Result<String, AspError> {
        let data = self
            .send_command("get_root", serde_json::json!({}))
            .await?;
        data["root"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| AspError::ProverError("Missing root in get_root response".into()))
    }

    /// Send a ping to check if the worker process is alive.
    pub async fn ping(&mut self) -> Result<bool, AspError> {
        let data = self
            .send_command("ping", serde_json::json!({}))
            .await?;
        Ok(data["pong"].as_bool().unwrap_or(false))
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MerkleProof {
    pub path_elements: Vec<String>,
    pub path_indices: Vec<u32>,
    pub root: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitmentResult {
    pub commitment: String,
    pub nullifier_hash: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProofResult {
    pub calldata: Vec<String>,
    pub public_signals: Vec<String>,
}
