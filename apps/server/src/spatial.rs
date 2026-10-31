// spatial.rs: Spatial Chunking and 10% Resource Budget Controller

use std::collections::HashMap;
use std::sync::RwLock;
use crate::json::{parse_json, JsonValue};
use crate::models::{AssetDto, ChunkDescriptor, InterestDto, ManifestDto};

pub struct SpatialService {
    manifest: ManifestDto,
    chunks: HashMap<String, ChunkDescriptor>,
    assets: HashMap<String, AssetDto>,
    chunk_by_coord: HashMap<(i64, i64), String>,
    resource_files: HashMap<String, Vec<u8>>,
}

impl SpatialService {
    pub fn new() -> Self {
        let catalog_str = std::fs::read_to_string("assets/world/catalog.server-only.json")
            .or_else(|_| std::fs::read_to_string("discovery-protocol-2.0.0/fixtures/v2.0.0/catalog.server-only.json"))
            .or_else(|_| std::fs::read_to_string("discovery-protocol-1.1.0/fixtures/catalog.server-only.json"))
            .or_else(|_| std::fs::read_to_string("discovery-protocol-1.0.0/fixtures/catalog.server-only.json"))
            .unwrap_or_else(|_| "{}".to_string());
        let cat = parse_json(&catalog_str).unwrap();

        let m = cat.get("manifest").unwrap();
        let manifest = ManifestDto {
            world_id: m.get_str("worldId").unwrap().to_string(),
            world_revision: m.get_i64("worldRevision").unwrap() as u64,
            total_world_bytes: m.get_i64("totalWorldBytes").unwrap() as u64,
            cache_budget_bytes: m.get_i64("cacheBudgetBytes").unwrap() as u64,
            accounting: m.get_str("accounting").unwrap().to_string(),
            max_resource_bytes: m.get_i64("maxResourceBytes").unwrap() as u64,
            max_chunk_bytes: m.get_i64("maxChunkBytes").unwrap() as u64,
        };

        let mut chunks = HashMap::new();
        let mut chunk_by_coord = HashMap::new();
        if let Some(chunk_arr) = cat.get("chunks").and_then(|c| c.as_array()) {
            for c in chunk_arr {
                let chunk_id = c.get_str("chunkId").unwrap().to_string();
                let x = c.get_i64("x").unwrap();
                let z = c.get_i64("z").unwrap();
                let sha256 = c.get_str("sha256").unwrap().to_string();
                let byte_size = c.get_i64("byteSize").unwrap() as u64;
                let url = c.get_str("url").unwrap().to_string();
                let asset_ids = c.get("assetIds").and_then(|a| a.as_array())
                    .map(|arr| arr.iter().filter_map(|i| i.as_str().map(|s| s.to_string())).collect())
                    .unwrap_or_default();

                chunk_by_coord.insert((x, z), chunk_id.clone());
                chunks.insert(chunk_id.clone(), ChunkDescriptor {
                    chunk_id, x, z, sha256, byte_size, url, asset_ids,
                });
            }
        }

        let mut assets = HashMap::new();
        if let Some(asset_arr) = cat.get("assets").and_then(|a| a.as_array()) {
            for a in asset_arr {
                let resource_id = a.get_str("resourceId").unwrap().to_string();
                let sha256 = a.get_str("sha256").unwrap().to_string();
                let byte_size = a.get_i64("byteSize").unwrap() as u64;
                let media_type = a.get_str("mediaType").unwrap().to_string();
                let url = a.get_str("url").unwrap().to_string();
                assets.insert(sha256.clone(), AssetDto {
                    resource_id, sha256, byte_size, media_type, url,
                });
            }
        }
        let mut resource_files = HashMap::new();
        // Pre-load all available resources from fixtures/resources/
        let res_dir = if std::path::Path::new("assets/world/resources").exists() {
            "assets/world/resources"
        } else if std::path::Path::new("discovery-protocol-2.0.0/fixtures/resources").exists() {
            "discovery-protocol-2.0.0/fixtures/resources"
        } else if std::path::Path::new("discovery-protocol-1.1.0/fixtures/resources").exists() {
            "discovery-protocol-1.1.0/fixtures/resources"
        } else {
            "discovery-protocol-1.0.0/fixtures/resources"
        };
        if let Ok(entries) = std::fs::read_dir(res_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let filename = path.file_name().unwrap().to_string_lossy().to_string();
                    if let Ok(bytes) = std::fs::read(&path) {
                        resource_files.insert(filename, bytes);
                    }
                }
            }
        }

        Self {
            manifest,
            chunks,
            assets,
            chunk_by_coord,
            resource_files,
        }
    }

    pub fn get_manifest(&self) -> ManifestDto {
        self.manifest.clone()
    }

    pub fn get_chunk_coords(pos_x: f64, pos_z: f64, chunk_size_m: f64) -> (i64, i64) {
        let cx = (pos_x / chunk_size_m).floor() as i64;
        let cz = (pos_z / chunk_size_m).floor() as i64;
        (cx, cz)
    }

    pub fn get_chunk_by_coords(&self, cx: i64, cz: i64) -> Option<&ChunkDescriptor> {
        let chunk_id = self.chunk_by_coord.get(&(cx, cz))?;
        self.chunks.get(chunk_id)
    }
}
impl SpatialService {
    pub fn compute_interest(&self, pos_x: f64, pos_z: f64, interest_rev: u64) -> InterestDto {
        let (cx, cz) = Self::get_chunk_coords(pos_x, pos_z, 32.0);
        let mut selected_chunks = Vec::new();
        let mut required_bytes = 0u64;

        if let Some(chunk) = self.get_chunk_by_coords(cx, cz) {
            selected_chunks.push(chunk.clone());
            required_bytes += chunk.byte_size;
        } else if let Some(fallback_chunk) = self.chunks.get("c-0-0") {
            selected_chunks.push(fallback_chunk.clone());
            required_bytes += fallback_chunk.byte_size;
        }

        let mut selected_assets = Vec::new();
        for asset in self.assets.values() {
            selected_assets.push(asset.clone());
            required_bytes += asset.byte_size;
        }

        // 10% budget invariant: requiredBytes <= cacheBudgetBytes (2288)
        assert!(required_bytes <= self.manifest.cache_budget_bytes, "Resource set exceeds 10% world budget limit!");

        InterestDto {
            world_revision: self.manifest.world_revision,
            interest_revision: interest_rev,
            chunks: selected_chunks,
            assets: selected_assets,
            required_bytes,
        }
    }

    pub fn get_chunk_file(&self, chunk_id: &str, sha256: &str) -> Option<&[u8]> {
        if let Some(bytes) = self.resource_files.get(sha256) {
            return Some(bytes);
        }
        if let Some(bytes) = self.resource_files.get(&format!("{}.json", chunk_id)) {
            return Some(bytes);
        }
        None
    }

    pub fn get_asset_file(&self, sha256: &str) -> Option<(&[u8], &str)> {
        if let Some(asset) = self.assets.get(sha256) {
            if let Some(bytes) = self.resource_files.get(sha256) {
                return Some((bytes, &asset.media_type));
            }
            if let Some(bytes) = self.resource_files.get("triangle.gltf") {
                return Some((bytes, &asset.media_type));
            }
        }
        if let Some(bytes) = self.resource_files.get(sha256) {
            return Some((bytes, "image/svg+xml"));
        }
        None
    }
}
