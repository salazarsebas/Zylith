use axum::body::Body;
use axum::extract::Request;
use axum::middleware::Next;
use axum::response::Response;
use std::time::Instant;

/// Axum middleware: logs method, path, status, and duration for every request.
pub async fn request_logger(req: Request<Body>, next: Next) -> Response {
    let method = req.method().clone();
    let path = req.uri().path().to_string();
    let start = Instant::now();

    let response = next.run(req).await;

    let duration = start.elapsed();
    let status = response.status().as_u16();

    tracing::info!(
        method = %method,
        path = %path,
        status = status,
        duration_ms = duration.as_millis() as u64,
    );

    response
}
