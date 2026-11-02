import json

def main():
    with open("discovery-protocol-1.1.0/fixtures/v1.1.0/http/admin-config.json", "r", encoding="utf-8") as f:
        admin_cfg = json.load(f)
    with open("discovery-protocol-1.1.0/fixtures/v1.1.0/http/public-config.json", "r", encoding="utf-8") as f:
        pub_cfg = json.load(f)
    
    world_id = admin_cfg["values"]["world"]["worldId"]
    rev = admin_cfg["revision"]
    admin_vals_str = json.dumps(admin_cfg["values"], ensure_ascii=False).replace("'", "''")
    pub_vals_str = json.dumps(pub_cfg["values"], ensure_ascii=False).replace("'", "''")
    
    sql = f"""
    -- 005_seed_config_v110.sql: Protocol 1.1.0 Gameplay & Economy Config
    INSERT INTO config_revisions (world_id, revision, public_values, admin_values, actor_user_id, created_at)
    VALUES ('{world_id}', {rev}, '{pub_vals_str}'::jsonb, '{admin_vals_str}'::jsonb, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', NOW())
    ON CONFLICT (world_id, revision) DO UPDATE
    SET public_values = EXCLUDED.public_values, admin_values = EXCLUDED.admin_values;
    """
    
    with open("infra/migrations/005_seed_config_v110.sql", "w", encoding="utf-8") as f_out:
        f_out.write(sql)
    print("Generated 005_seed_config_v110.sql successfully")

if __name__ == "__main__":
    main()
