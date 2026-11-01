// models.rs: Protocol DTOs and Data Structures matching Discovery Protocol 1.0.0

use crate::json::JsonValue;

#[derive(Debug, Clone)]
pub struct ErrorDetail {
    pub path: String,
    pub reason: String,
}

#[derive(Debug, Clone)]
pub struct ErrorResponse {
    pub code: String,
    pub message: String,
    pub retryable: bool,
    pub request_id: Option<String>,
    pub details: Vec<ErrorDetail>,
    pub retry_after_ms: Option<u64>,
}

impl ErrorResponse {
    pub fn new(code: &str, message: &str, retryable: bool, request_id: Option<String>) -> Self {
        Self {
            code: code.to_string(),
            message: message.to_string(),
            retryable,
            request_id,
            details: Vec::new(),
            retry_after_ms: None,
        }
    }

    pub fn with_detail(mut self, path: &str, reason: &str) -> Self {
        self.details.push(ErrorDetail {
            path: path.to_string(),
            reason: reason.to_string(),
        });
        self
    }

    pub fn with_retry_after(mut self, ms: u64) -> Self {
        self.retry_after_ms = Some(ms);
        self
    }

    pub fn to_json(&self) -> JsonValue {
        let mut entries = vec![
            ("code".to_string(), JsonValue::String(self.code.clone())),
            ("message".to_string(), JsonValue::String(self.message.clone())),
            ("retryable".to_string(), JsonValue::Bool(self.retryable)),
            ("requestId".to_string(), match &self.request_id {
                Some(id) => JsonValue::String(id.clone()),
                None => JsonValue::Null,
            }),
            ("details".to_string(), JsonValue::Array(
                self.details.iter().map(|d| JsonValue::Object(vec![
                    ("path".to_string(), JsonValue::String(d.path.clone())),
                    ("reason".to_string(), JsonValue::String(d.reason.clone())),
                ])).collect()
            )),
        ];
        if let Some(ms) = self.retry_after_ms {
            entries.push(("retryAfterMs".to_string(), JsonValue::Number(ms as f64)));
        }
        JsonValue::Object(entries)
    }
}
#[derive(Debug, Clone)]
pub struct UserDto {
    pub user_id: String,
    pub display_name: String,
    pub role: String,
}

impl UserDto {
    pub fn to_json(&self) -> JsonValue {
        JsonValue::Object(vec![
            ("userId".to_string(), JsonValue::String(self.user_id.clone())),
            ("displayName".to_string(), JsonValue::String(self.display_name.clone())),
            ("role".to_string(), JsonValue::String(self.role.clone())),
        ])
    }
}

#[derive(Debug, Clone)]
pub struct LoginResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in_seconds: u64,
    pub user: UserDto,
}

impl LoginResponse {
    pub fn to_json(&self) -> JsonValue {
        JsonValue::Object(vec![
            ("accessToken".to_string(), JsonValue::String(self.access_token.clone())),
            ("tokenType".to_string(), JsonValue::String(self.token_type.clone())),
            ("expiresInSeconds".to_string(), JsonValue::Number(self.expires_in_seconds as f64)),
            ("user".to_string(), self.user.to_json()),
        ])
    }
}

#[derive(Debug, Clone)]
pub struct TicketResponse {
    pub ticket: String,
    pub expires_in_seconds: u64,
    pub ws_path: String,
    pub subprotocol: String,
}

impl TicketResponse {
    pub fn to_json(&self) -> JsonValue {
        JsonValue::Object(vec![
            ("ticket".to_string(), JsonValue::String(self.ticket.clone())),
            ("expiresInSeconds".to_string(), JsonValue::Number(self.expires_in_seconds as f64)),
            ("wsPath".to_string(), JsonValue::String(self.ws_path.clone())),
            ("subprotocol".to_string(), JsonValue::String(self.subprotocol.clone())),
        ])
    }
}
#[derive(Debug, Clone)]
pub struct PositionDto {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl PositionDto {
    pub fn to_json(&self) -> JsonValue {
        JsonValue::Object(vec![
            ("x".to_string(), JsonValue::Number(self.x)),
            ("y".to_string(), JsonValue::Number(self.y)),
            ("z".to_string(), JsonValue::Number(self.z)),
        ])
    }
}

#[derive(Debug, Clone)]
pub struct ActivityDto {
    pub mode: String,
    pub target_id: Option<String>,
    pub seat_id: Option<String>,
}

impl ActivityDto {
    pub fn exploring() -> Self {
        Self {
            mode: "exploring".to_string(),
            target_id: None,
            seat_id: None,
        }
    }

    pub fn to_json(&self) -> JsonValue {
        JsonValue::Object(vec![
            ("mode".to_string(), JsonValue::String(self.mode.clone())),
            ("targetId".to_string(), match &self.target_id {
                Some(id) => JsonValue::String(id.clone()),
                None => JsonValue::Null,
            }),
            ("seatId".to_string(), match &self.seat_id {
                Some(id) => JsonValue::String(id.clone()),
                None => JsonValue::Null,
            }),
        ])
    }
}

#[derive(Debug, Clone)]
pub struct PlayerDto {
    pub player_id: String,
    pub display_name: String,
    pub position: PositionDto,
    pub yaw_rad: f64,
    pub connected: bool,
    pub last_processed_input_seq: u64,
    pub activity: ActivityDto,
}

impl PlayerDto {
    pub fn to_json(&self) -> JsonValue {
        let safe_yaw = self.yaw_rad.clamp(-3.141592, 3.141592);
        JsonValue::Object(vec![
            ("playerId".to_string(), JsonValue::String(self.player_id.clone())),
            ("displayName".to_string(), JsonValue::String(self.display_name.clone())),
            ("position".to_string(), self.position.to_json()),
            ("yawRad".to_string(), JsonValue::Number(safe_yaw)),
            ("connected".to_string(), JsonValue::Bool(self.connected)),
            ("lastProcessedInputSeq".to_string(), JsonValue::Number(self.last_processed_input_seq as f64)),
            ("activity".to_string(), self.activity.to_json()),
        ])
    }
}

#[derive(Debug, Clone)]
pub struct NpcDto {
    pub npc_id: String,
    pub display_name: String,
    pub position: PositionDto,
    pub yaw_rad: f64,
    pub state: String,
    pub subject: String,
    pub role: String,
    pub module_id: String,
}

impl NpcDto {
    pub fn to_json(&self) -> JsonValue {
        let safe_state = match self.state.as_str() {
            "walking" => "walking",
            "talking" => "talking",
            _ => "idle",
        };
        let safe_role = match self.role.as_str() {
            "examiner" => "examiner",
            _ => "teacher",
        };
        let safe_yaw = self.yaw_rad.clamp(-3.141592, 3.141592);
        JsonValue::Object(vec![
            ("npcId".to_string(), JsonValue::String(self.npc_id.clone())),
            ("displayName".to_string(), JsonValue::String(self.display_name.clone())),
            ("position".to_string(), self.position.to_json()),
            ("yawRad".to_string(), JsonValue::Number(safe_yaw)),
            ("state".to_string(), JsonValue::String(safe_state.to_string())),
            ("subject".to_string(), JsonValue::String(self.subject.clone())),
            ("role".to_string(), JsonValue::String(safe_role.to_string())),
            ("moduleId".to_string(), JsonValue::String(self.module_id.clone())),
        ])
    }
}
#[derive(Debug, Clone)]
pub struct SessionDto {
    pub session_id: String,
    pub world_id: String,
    pub world_revision: u64,
    pub status: String,
    pub max_players: usize,
    pub players: Vec<PlayerDto>,
}

impl SessionDto {
    pub fn to_json(&self) -> JsonValue {
        JsonValue::Object(vec![
            ("sessionId".to_string(), JsonValue::String(self.session_id.clone())),
            ("worldId".to_string(), JsonValue::String(self.world_id.clone())),
            ("worldRevision".to_string(), JsonValue::Number(self.world_revision as f64)),
            ("status".to_string(), JsonValue::String(self.status.clone())),
            ("maxPlayers".to_string(), JsonValue::Number(self.max_players as f64)),
            ("players".to_string(), JsonValue::Array(self.players.iter().map(|p| p.to_json()).collect())),
        ])
    }
}

#[derive(Debug, Clone)]
pub struct ManifestDto {
    pub world_id: String,
    pub world_revision: u64,
    pub total_world_bytes: u64,
    pub cache_budget_bytes: u64,
    pub accounting: String,
    pub max_resource_bytes: u64,
    pub max_chunk_bytes: u64,
}

impl ManifestDto {
    pub fn to_json(&self) -> JsonValue {
        JsonValue::Object(vec![
            ("worldId".to_string(), JsonValue::String(self.world_id.clone())),
            ("worldRevision".to_string(), JsonValue::Number(self.world_revision as f64)),
            ("totalWorldBytes".to_string(), JsonValue::Number(self.total_world_bytes as f64)),
            ("cacheBudgetBytes".to_string(), JsonValue::Number(self.cache_budget_bytes as f64)),
            ("accounting".to_string(), JsonValue::String(self.accounting.clone())),
            ("maxResourceBytes".to_string(), JsonValue::Number(self.max_resource_bytes as f64)),
            ("maxChunkBytes".to_string(), JsonValue::Number(self.max_chunk_bytes as f64)),
        ])
    }
}

#[derive(Debug, Clone)]
pub struct AssetDto {
    pub resource_id: String,
    pub sha256: String,
    pub byte_size: u64,
    pub media_type: String,
    pub url: String,
}

impl AssetDto {
    pub fn to_json(&self) -> JsonValue {
        JsonValue::Object(vec![
            ("resourceId".to_string(), JsonValue::String(self.resource_id.clone())),
            ("sha256".to_string(), JsonValue::String(self.sha256.clone())),
            ("byteSize".to_string(), JsonValue::Number(self.byte_size as f64)),
            ("mediaType".to_string(), JsonValue::String(self.media_type.clone())),
            ("url".to_string(), JsonValue::String(self.url.clone())),
        ])
    }
}
#[derive(Debug, Clone)]
pub struct ChunkDescriptor {
    pub chunk_id: String,
    pub x: i64,
    pub z: i64,
    pub sha256: String,
    pub byte_size: u64,
    pub url: String,
    pub asset_ids: Vec<String>,
}

impl ChunkDescriptor {
    pub fn to_json(&self) -> JsonValue {
        JsonValue::Object(vec![
            ("chunkId".to_string(), JsonValue::String(self.chunk_id.clone())),
            ("x".to_string(), JsonValue::Number(self.x as f64)),
            ("z".to_string(), JsonValue::Number(self.z as f64)),
            ("sha256".to_string(), JsonValue::String(self.sha256.clone())),
            ("byteSize".to_string(), JsonValue::Number(self.byte_size as f64)),
            ("url".to_string(), JsonValue::String(self.url.clone())),
            ("assetIds".to_string(), JsonValue::Array(self.asset_ids.iter().map(|a| JsonValue::String(a.clone())).collect())),
        ])
    }
}

#[derive(Debug, Clone)]
pub struct InterestDto {
    pub world_revision: u64,
    pub interest_revision: u64,
    pub chunks: Vec<ChunkDescriptor>,
    pub assets: Vec<AssetDto>,
    pub required_bytes: u64,
}

impl InterestDto {
    pub fn to_json(&self) -> JsonValue {
        JsonValue::Object(vec![
            ("worldRevision".to_string(), JsonValue::Number(self.world_revision as f64)),
            ("interestRevision".to_string(), JsonValue::Number(self.interest_revision as f64)),
            ("chunks".to_string(), JsonValue::Array(self.chunks.iter().map(|c| c.to_json()).collect())),
            ("assets".to_string(), JsonValue::Array(self.assets.iter().map(|a| a.to_json()).collect())),
            ("requiredBytes".to_string(), JsonValue::Number(self.required_bytes as f64)),
        ])
    }
}

#[derive(Debug, Clone)]
pub struct ProgressDto {
    pub player_id: String,
    pub revision: u64,
    pub completed_knowledge_ids: Vec<String>,
    pub updated_at: String,
}

impl ProgressDto {
    pub fn to_json(&self) -> JsonValue {
        JsonValue::Object(vec![
            ("playerId".to_string(), JsonValue::String(self.player_id.clone())),
            ("revision".to_string(), JsonValue::Number(self.revision as f64)),
            ("completedKnowledgeIds".to_string(), JsonValue::Array(self.completed_knowledge_ids.iter().map(|k| JsonValue::String(k.clone())).collect())),
            ("updatedAt".to_string(), JsonValue::String(self.updated_at.clone())),
        ])
    }
}
#[derive(Debug, Clone)]
pub struct InteractionDto {
    pub request_id: String,
    pub npc_id: String,
    pub status: String,
    pub text: String,
    pub source: String,
    pub knowledge_ids: Vec<String>,
    pub progress_revision: u64,
    pub error: Option<ErrorResponse>,
}

impl InteractionDto {
    pub fn to_json(&self) -> JsonValue {
        JsonValue::Object(vec![
            ("requestId".to_string(), JsonValue::String(self.request_id.clone())),
            ("npcId".to_string(), JsonValue::String(self.npc_id.clone())),
            ("status".to_string(), JsonValue::String(self.status.clone())),
            ("text".to_string(), JsonValue::String(self.text.clone())),
            ("source".to_string(), JsonValue::String(self.source.clone())),
            ("knowledgeIds".to_string(), JsonValue::Array(self.knowledge_ids.iter().map(|k| JsonValue::String(k.clone())).collect())),
            ("progressRevision".to_string(), JsonValue::Number(self.progress_revision as f64)),
            ("error".to_string(), match &self.error {
                Some(err) => err.to_json(),
                None => JsonValue::Null,
            }),
        ])
    }
}

pub fn make_server_envelope(
    proto_ver: &str,
    msg_type: &str,
    request_id: Option<String>,
    server_seq: u64,
    server_time: &str,
    payload: JsonValue,
) -> JsonValue {
    let ver = if proto_ver.is_empty() { "2.0.0" } else { proto_ver };
    JsonValue::Object(vec![
        ("protocolVersion".to_string(), JsonValue::String(ver.to_string())),
        ("type".to_string(), JsonValue::String(msg_type.to_string())),
        ("requestId".to_string(), match request_id {
            Some(id) => JsonValue::String(id),
            None => JsonValue::Null,
        }),
        ("serverSeq".to_string(), JsonValue::Number(server_seq as f64)),
        ("serverTime".to_string(), JsonValue::String(server_time.to_string())),
        ("payload".to_string(), payload),
    ])
}

#[derive(Debug, Clone, Default)]
pub struct ClientTelemetryDto {
    pub fps: f64,
    pub fps_low_1pct: f64,
    pub frame_time_ms: f64,
    pub ping_rtt_ms: f64,
    pub jitter_ms: f64,
    pub rendered_entities: u32,
    pub active_draw_calls: u32,
    pub triangles: u32,
    pub heap_memory_mb: f64,
    pub uptime_sec: u64,
    pub rx_bitrate_kbps: f64,
    pub tx_bitrate_kbps: f64,
    pub location_id: String,
}

impl ClientTelemetryDto {
    pub fn to_json(&self) -> JsonValue {
        JsonValue::Object(vec![
            ("fps".to_string(), JsonValue::Number(self.fps)),
            ("fpsLow1Pct".to_string(), JsonValue::Number(self.fps_low_1pct)),
            ("frameTimeMs".to_string(), JsonValue::Number(self.frame_time_ms)),
            ("pingRttMs".to_string(), JsonValue::Number(self.ping_rtt_ms)),
            ("jitterMs".to_string(), JsonValue::Number(self.jitter_ms)),
            ("renderedEntities".to_string(), JsonValue::Number(self.rendered_entities as f64)),
            ("activeDrawCalls".to_string(), JsonValue::Number(self.active_draw_calls as f64)),
            ("triangles".to_string(), JsonValue::Number(self.triangles as f64)),
            ("heapMemoryMb".to_string(), JsonValue::Number(self.heap_memory_mb)),
            ("uptimeSec".to_string(), JsonValue::Number(self.uptime_sec as f64)),
            ("rxBitrateKbps".to_string(), JsonValue::Number(self.rx_bitrate_kbps)),
            ("txBitrateKbps".to_string(), JsonValue::Number(self.tx_bitrate_kbps)),
            ("locationId".to_string(), JsonValue::String(self.location_id.clone())),
        ])
    }
}
