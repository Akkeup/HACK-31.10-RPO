-- 002_seed_data.sql: Initial seed for users, progress, and initial world config

INSERT INTO users (user_id, username, password_hash, display_name, role)
VALUES
    ('33333333-3333-4333-8333-333333333333', 'player1', '$argon2id$v=19$m=65536,t=2,p=1$c29tZXNhbHQ$q8W7gN7Lqg', 'Исследователь 1', 'player'),
    ('44444444-4444-4444-8444-444444444444', 'player2', '$argon2id$v=19$m=65536,t=2,p=1$c29tZXNhbHQ$q8W7gN7Lqg', 'Исследователь 2', 'player'),
    ('55555555-5555-4555-8555-555555555555', 'player3', '$argon2id$v=19$m=65536,t=2,p=1$c29tZXNhbHQ$q8W7gN7Lqg', 'Исследователь 3', 'player'),
    ('66666666-6666-4666-8666-666666666666', 'player4', '$argon2id$v=19$m=65536,t=2,p=1$c29tZXNhbHQ$q8W7gN7Lqg', 'Исследователь 4', 'player'),
    ('77777777-7777-4777-8777-777777777777', 'player5', '$argon2id$v=19$m=65536,t=2,p=1$c29tZXNhbHQ$q8W7gN7Lqg', 'Исследователь 5', 'player'),
    ('88888888-8888-4888-8888-888888888888', 'player6', '$argon2id$v=19$m=65536,t=2,p=1$c29tZXNhbHQ$q8W7gN7Lqg', 'Исследователь 6', 'player'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'admin', '$argon2id$v=19$m=65536,t=2,p=1$c29tZXNhbHQ$q8W7gN7Lqg', 'Администратор', 'admin')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_progress (player_id, revision, completed_knowledge_ids, updated_at)
VALUES
    ('33333333-3333-4333-8333-333333333333', 1, ARRAY['campus-history'], NOW()),
    ('44444444-4444-4444-8444-444444444444', 1, '{}', NOW()),
    ('55555555-5555-4555-8555-555555555555', 1, '{}', NOW()),
    ('66666666-6666-4666-8666-666666666666', 1, '{}', NOW()),
    ('77777777-7777-4777-8777-777777777777', 1, '{}', NOW()),
    ('88888888-8888-4888-8888-888888888888', 1, '{}', NOW())
ON CONFLICT (player_id) DO NOTHING;
