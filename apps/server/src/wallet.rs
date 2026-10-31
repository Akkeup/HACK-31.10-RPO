// wallet.rs: Virtual Currency "Aura" Engine & PostgreSQL Ledger
use crate::db::DbPool;
use crate::json::JsonValue;

#[derive(Debug, Clone)]
pub struct WalletDto {
    pub balance_aura: i64,
    pub reserved_aura: i64,
    pub available_aura: i64,
    pub revision: u64,
}

impl WalletDto {
    pub fn to_json(&self) -> JsonValue {
        JsonValue::Object(vec![
            ("balanceAura".to_string(), JsonValue::Number(self.balance_aura as f64)),
            ("reservedAura".to_string(), JsonValue::Number(self.reserved_aura as f64)),
            ("availableAura".to_string(), JsonValue::Number(self.available_aura as f64)),
            ("revision".to_string(), JsonValue::Number(self.revision as f64)),
        ])
    }
}

#[derive(Debug, Clone)]
pub struct LedgerEntryDto {
    pub entry_id: String,
    pub transaction_id: String,
    pub kind: String,
    pub amount_aura: i64,
    pub reserved_delta_aura: i64,
    pub balance_after_aura: i64,
    pub reserved_after_aura: i64,
    pub match_id: Option<String>,
    pub lobby_id: Option<String>,
    pub created_at: String,
}

impl LedgerEntryDto {
    pub fn to_json(&self) -> JsonValue {
        JsonValue::Object(vec![
            ("entryId".to_string(), JsonValue::String(self.entry_id.clone())),
            ("transactionId".to_string(), JsonValue::String(self.transaction_id.clone())),
            ("kind".to_string(), JsonValue::String(self.kind.clone())),
            ("amountAura".to_string(), JsonValue::Number(self.amount_aura as f64)),
            ("reservedDeltaAura".to_string(), JsonValue::Number(self.reserved_delta_aura as f64)),
            ("balanceAfterAura".to_string(), JsonValue::Number(self.balance_after_aura as f64)),
            ("reservedAfterAura".to_string(), JsonValue::Number(self.reserved_after_aura as f64)),
            ("matchId".to_string(), match &self.match_id { Some(s) => JsonValue::String(s.clone()), None => JsonValue::Null }),
            ("lobbyId".to_string(), match &self.lobby_id { Some(s) => JsonValue::String(s.clone()), None => JsonValue::Null }),
            ("createdAt".to_string(), JsonValue::String(self.created_at.clone())),
        ])
    }
}

pub struct WalletService {
    db: DbPool,
}

impl WalletService {
    pub fn new(db: DbPool) -> Self {
        Self { db }
    }

    pub fn get_wallet(&self, user_id: &str) -> Result<WalletDto, String> {
        let sql = format!(
            "SELECT balance_aura, reserved_aura, revision FROM wallets WHERE user_id = '{}'",
            user_id
        );
        let rows = self.db.query(&sql)?;
        if let Some(row) = rows.get(0) {
            let balance = row.get(0).and_then(|v| v.parse::<i64>().ok()).unwrap_or(100);
            let reserved = row.get(1).and_then(|v| v.parse::<i64>().ok()).unwrap_or(0);
            let revision = row.get(2).and_then(|v| v.parse::<u64>().ok()).unwrap_or(1);
            let available = balance - reserved;
            Ok(WalletDto {
                balance_aura: balance,
                reserved_aura: reserved,
                available_aura: available,
                revision,
            })
        } else {
            // Seed missing wallet with 100
            let _ = self.db.execute(&format!(
                "INSERT INTO wallets (user_id, balance_aura, reserved_aura, revision) VALUES ('{}', 100, 0, 1) ON CONFLICT DO NOTHING",
                user_id
            ));
            Ok(WalletDto {
                balance_aura: 100,
                reserved_aura: 0,
                available_aura: 100,
                revision: 1,
            })
        }
    }

    pub fn get_ledger(&self, user_id: &str, limit: usize) -> Result<Vec<LedgerEntryDto>, String> {
        let sql = format!(
            "SELECT entry_id, transaction_id, kind, amount_aura, reserved_delta_aura, balance_after_aura, reserved_after_aura, match_id, lobby_id, created_at \
             FROM wallet_ledger WHERE user_id = '{}' ORDER BY created_at DESC LIMIT {}",
            user_id, limit
        );
        let rows = self.db.query(&sql)?;
        let mut entries = Vec::new();
        for r in rows {
            entries.push(LedgerEntryDto {
                entry_id: r.get(0).unwrap_or("").to_string(),
                transaction_id: r.get(1).unwrap_or("").to_string(),
                kind: r.get(2).unwrap_or("").to_string(),
                amount_aura: r.get(3).and_then(|v| v.parse().ok()).unwrap_or(0),
                reserved_delta_aura: r.get(4).and_then(|v| v.parse().ok()).unwrap_or(0),
                balance_after_aura: r.get(5).and_then(|v| v.parse().ok()).unwrap_or(0),
                reserved_after_aura: r.get(6).and_then(|v| v.parse().ok()).unwrap_or(0),
                match_id: r.get(7).filter(|s| !s.is_empty()).map(|s| s.to_string()),
                lobby_id: r.get(8).filter(|s| !s.is_empty()).map(|s| s.to_string()),
                created_at: r.get(9).unwrap_or("2026-10-31T09:00:00Z").to_string(),
            });
        }
        Ok(entries)
    }
}

impl WalletService {
    pub fn reserve_aura(&self, user_id: &str, tx_id: &str, amount: i64, lobby_id: Option<&str>) -> Result<WalletDto, (u16, &'static str, &'static str)> {
        let w = self.get_wallet(user_id).map_err(|_| (500, "DB_ERROR", "Failed to get wallet"))?;
        // Check idempotency
        let check_sql = format!("SELECT balance_after_aura FROM wallet_ledger WHERE user_id = '{}' AND transaction_id = '{}' AND kind = 'reserve'", user_id, tx_id);
        if let Ok(rows) = self.db.query(&check_sql) {
            if !rows.is_empty() {
                return Ok(w);
            }
        }
        if w.available_aura < amount {
            return Err((409, "INSUFFICIENT_AURA", "Not enough available Aura to reserve stake"));
        }
        let new_reserved = w.reserved_aura + amount;
        let new_rev = w.revision + 1;
        let l_id_sql = match lobby_id { Some(l) => format!("'{}'", l), None => "NULL".to_string() };
        let update_sql = format!(
            "UPDATE wallets SET reserved_aura = {}, revision = {}, updated_at = NOW() WHERE user_id = '{}' AND (balance_aura - reserved_aura) >= {}",
            new_reserved, new_rev, user_id, amount
        );
        let rows_aff = self.db.execute(&update_sql).map_err(|_| (500, "DB_ERROR", "Failed to update wallet"))?;
        if rows_aff == 0 {
            return Err((409, "INSUFFICIENT_AURA", "Not enough available Aura"));
        }
        let ledger_sql = format!(
            "INSERT INTO wallet_ledger (user_id, transaction_id, kind, amount_aura, reserved_delta_aura, balance_after_aura, reserved_after_aura, lobby_id, description) \
             VALUES ('{}', '{}', 'reserve', 0, {}, {}, {}, {}, 'Stake reserved for competition lobby') ON CONFLICT DO NOTHING",
            user_id, tx_id, amount, w.balance_aura, new_reserved, l_id_sql
        );
        let _ = self.db.execute(&ledger_sql);
        Ok(WalletDto {
            balance_aura: w.balance_aura,
            reserved_aura: new_reserved,
            available_aura: w.balance_aura - new_reserved,
            revision: new_rev,
        })
    }

    pub fn release_aura(&self, user_id: &str, tx_id: &str, amount: i64, lobby_id: Option<&str>) -> Result<WalletDto, (u16, &'static str, &'static str)> {
        let w = self.get_wallet(user_id).map_err(|_| (500, "DB_ERROR", "Failed to get wallet"))?;
        let check_sql = format!("SELECT balance_after_aura FROM wallet_ledger WHERE user_id = '{}' AND transaction_id = '{}' AND kind = 'release'", user_id, tx_id);
        if let Ok(rows) = self.db.query(&check_sql) {
            if !rows.is_empty() {
                return Ok(w);
            }
        }
        let new_reserved = (w.reserved_aura - amount).max(0);
        let new_rev = w.revision + 1;
        let l_id_sql = match lobby_id { Some(l) => format!("'{}'", l), None => "NULL".to_string() };
        let update_sql = format!(
            "UPDATE wallets SET reserved_aura = {}, revision = {}, updated_at = NOW() WHERE user_id = '{}'",
            new_reserved, new_rev, user_id
        );
        let _ = self.db.execute(&update_sql).map_err(|_| (500, "DB_ERROR", "Failed to update wallet"))?;
        let ledger_sql = format!(
            "INSERT INTO wallet_ledger (user_id, transaction_id, kind, amount_aura, reserved_delta_aura, balance_after_aura, reserved_after_aura, lobby_id, description) \
             VALUES ('{}', '{}', 'release', 0, {}, {}, {}, {}, 'Stake reserve released') ON CONFLICT DO NOTHING",
            user_id, tx_id, -amount, w.balance_aura, new_reserved, l_id_sql
        );
        let _ = self.db.execute(&ledger_sql);
        Ok(WalletDto {
            balance_aura: w.balance_aura,
            reserved_aura: new_reserved,
            available_aura: w.balance_aura - new_reserved,
            revision: new_rev,
        })
    }
}

impl WalletService {
    pub fn stake_aura(&self, user_id: &str, tx_id: &str, amount: i64, lobby_id: Option<&str>, match_id: Option<&str>) -> Result<WalletDto, (u16, &'static str, &'static str)> {
        let w = self.get_wallet(user_id).map_err(|_| (500, "DB_ERROR", "Failed to get wallet"))?;
        let check_sql = format!("SELECT balance_after_aura FROM wallet_ledger WHERE user_id = '{}' AND transaction_id = '{}' AND kind = 'stake'", user_id, tx_id);
        if let Ok(rows) = self.db.query(&check_sql) {
            if !rows.is_empty() {
                return Ok(w);
            }
        }
        let new_balance = w.balance_aura - amount;
        let new_reserved = (w.reserved_aura - amount).max(0);
        let new_rev = w.revision + 1;
        let l_id = match lobby_id { Some(l) => format!("'{}'", l), None => "NULL".to_string() };
        let m_id = match match_id { Some(m) => format!("'{}'", m), None => "NULL".to_string() };
        let update_sql = format!(
            "UPDATE wallets SET balance_aura = {}, reserved_aura = {}, revision = {}, updated_at = NOW() WHERE user_id = '{}'",
            new_balance, new_reserved, new_rev, user_id
        );
        let _ = self.db.execute(&update_sql).map_err(|_| (500, "DB_ERROR", "Failed to update wallet"))?;
        let ledger_sql = format!(
            "INSERT INTO wallet_ledger (user_id, transaction_id, kind, amount_aura, reserved_delta_aura, balance_after_aura, reserved_after_aura, lobby_id, match_id, description) \
             VALUES ('{}', '{}', 'stake', {}, {}, {}, {}, {}, {}, 'Stake transferred to match escrow') ON CONFLICT DO NOTHING",
            user_id, tx_id, -amount, -amount, new_balance, new_reserved, l_id, m_id
        );
        let _ = self.db.execute(&ledger_sql);
        Ok(WalletDto {
            balance_aura: new_balance,
            reserved_aura: new_reserved,
            available_aura: new_balance - new_reserved,
            revision: new_rev,
        })
    }

    pub fn payout_aura(&self, user_id: &str, tx_id: &str, amount: i64, match_id: Option<&str>) -> Result<WalletDto, (u16, &'static str, &'static str)> {
        let w = self.get_wallet(user_id).map_err(|_| (500, "DB_ERROR", "Failed to get wallet"))?;
        let check_sql = format!("SELECT balance_after_aura FROM wallet_ledger WHERE user_id = '{}' AND transaction_id = '{}' AND kind = 'payout'", user_id, tx_id);
        if let Ok(rows) = self.db.query(&check_sql) {
            if !rows.is_empty() {
                return Ok(w);
            }
        }
        let new_balance = w.balance_aura + amount;
        let new_rev = w.revision + 1;
        let m_id = match match_id { Some(m) => format!("'{}'", m), None => "NULL".to_string() };
        let update_sql = format!(
            "UPDATE wallets SET balance_aura = {}, revision = {}, updated_at = NOW() WHERE user_id = '{}'",
            new_balance, new_rev, user_id
        );
        let _ = self.db.execute(&update_sql).map_err(|_| (500, "DB_ERROR", "Failed to update wallet"))?;
        let ledger_sql = format!(
            "INSERT INTO wallet_ledger (user_id, transaction_id, kind, amount_aura, reserved_delta_aura, balance_after_aura, reserved_after_aura, match_id, description) \
             VALUES ('{}', '{}', 'payout', {}, 0, {}, {}, {}, 'Competition pot victory payout') ON CONFLICT DO NOTHING",
            user_id, tx_id, amount, new_balance, w.reserved_aura, m_id
        );
        let _ = self.db.execute(&ledger_sql);
        Ok(WalletDto {
            balance_aura: new_balance,
            reserved_aura: w.reserved_aura,
            available_aura: new_balance - w.reserved_aura,
            revision: new_rev,
        })
    }

    pub fn refund_aura(&self, user_id: &str, tx_id: &str, amount: i64, match_id: Option<&str>) -> Result<WalletDto, (u16, &'static str, &'static str)> {
        let w = self.get_wallet(user_id).map_err(|_| (500, "DB_ERROR", "Failed to get wallet"))?;
        let check_sql = format!("SELECT balance_after_aura FROM wallet_ledger WHERE user_id = '{}' AND transaction_id = '{}' AND kind = 'refund'", user_id, tx_id);
        if let Ok(rows) = self.db.query(&check_sql) {
            if !rows.is_empty() {
                return Ok(w);
            }
        }
        let new_balance = w.balance_aura + amount;
        let new_rev = w.revision + 1;
        let m_id = match match_id { Some(m) => format!("'{}'", m), None => "NULL".to_string() };
        let update_sql = format!(
            "UPDATE wallets SET balance_aura = {}, revision = {}, updated_at = NOW() WHERE user_id = '{}'",
            new_balance, new_rev, user_id
        );
        let _ = self.db.execute(&update_sql).map_err(|_| (500, "DB_ERROR", "Failed to update wallet"))?;
        let ledger_sql = format!(
            "INSERT INTO wallet_ledger (user_id, transaction_id, kind, amount_aura, reserved_delta_aura, balance_after_aura, reserved_after_aura, match_id, description) \
             VALUES ('{}', '{}', 'refund', {}, 0, {}, {}, {}, 'Competition stake refunded') ON CONFLICT DO NOTHING",
            user_id, tx_id, amount, new_balance, w.reserved_aura, m_id
        );
        let _ = self.db.execute(&ledger_sql);
        Ok(WalletDto {
            balance_aura: new_balance,
            reserved_aura: w.reserved_aura,
            available_aura: new_balance - w.reserved_aura,
            revision: new_rev,
        })
    }
}
