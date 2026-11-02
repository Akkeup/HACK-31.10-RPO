-- 006_knowledge_base.sql: Versioned Knowledge Base, Content Review, and Question Bank
-- Part 1: Sources, Modules, and Knowledge Fragments

CREATE TABLE IF NOT EXISTS sources (
    source_id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    retrieved_at TIMESTAMPTZ NOT NULL,
    revision VARCHAR(200) NOT NULL,
    license VARCHAR(200) NOT NULL,
    local_path VARCHAR(300) NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'published',
    synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    section VARCHAR(200),
    author VARCHAR(200),
    attribution_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_modules (
    module_id VARCHAR(64) NOT NULL,
    content_version VARCHAR(64) NOT NULL,
    subject VARCHAR(32) NOT NULL CHECK (subject IN ('mathematics', 'informatics', 'history', 'geography_flags')),
    title VARCHAR(120) NOT NULL,
    teacher_id VARCHAR(64) NOT NULL,
    examiner_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (module_id, content_version)
);

CREATE TABLE IF NOT EXISTS knowledge_fragments (
    fragment_id VARCHAR(64) NOT NULL,
    module_id VARCHAR(64) NOT NULL,
    content_version VARCHAR(64) NOT NULL,
    concept_id VARCHAR(64) NOT NULL,
    heading VARCHAR(120) NOT NULL,
    text TEXT NOT NULL,
    source_ids TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(32) NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (fragment_id, content_version),
    FOREIGN KEY (module_id, content_version) REFERENCES knowledge_modules(module_id, content_version) ON DELETE CASCADE
);

-- Part 2: Facts and Assets

CREATE TABLE IF NOT EXISTS knowledge_facts (
    fact_id VARCHAR(64) NOT NULL,
    module_id VARCHAR(64) NOT NULL,
    content_version VARCHAR(64) NOT NULL,
    concept_id VARCHAR(64),
    text TEXT NOT NULL,
    source_ids TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(32) NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (fact_id, content_version),
    FOREIGN KEY (module_id, content_version) REFERENCES knowledge_modules(module_id, content_version) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_assets (
    asset_id VARCHAR(64) PRIMARY KEY,
    sha256 VARCHAR(64) NOT NULL UNIQUE,
    byte_size BIGINT NOT NULL,
    url TEXT NOT NULL,
    media_type VARCHAR(64) NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    alt TEXT NOT NULL,
    local_path VARCHAR(300) NOT NULL,
    source_id VARCHAR(64) REFERENCES sources(source_id),
    license VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Part 3: Countries and Teacher Descriptions

CREATE TABLE IF NOT EXISTS knowledge_countries (
    country_id VARCHAR(64) NOT NULL,
    content_version VARCHAR(64) NOT NULL,
    wikidata_id VARCHAR(32),
    name_ru VARCHAR(100) NOT NULL,
    accepted_names TEXT[] NOT NULL,
    capital_ru VARCHAR(100),
    description_sentences JSONB NOT NULL,
    fact_ids TEXT[] NOT NULL DEFAULT '{}',
    flag_asset_id VARCHAR(64) NOT NULL REFERENCES knowledge_assets(asset_id),
    flag_visible_elements TEXT,
    source_ids TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(32) NOT NULL DEFAULT 'published',
    synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (country_id, content_version)
);

CREATE INDEX IF NOT EXISTS idx_countries_name_ru ON knowledge_countries(name_ru);

-- Part 4: Questions, Options, and Content Reviews

CREATE TABLE IF NOT EXISTS knowledge_questions (
    question_id VARCHAR(64) NOT NULL,
    question_family_id VARCHAR(64) NOT NULL,
    module_id VARCHAR(64) NOT NULL,
    content_version VARCHAR(64) NOT NULL,
    concept_id VARCHAR(64),
    kind VARCHAR(32) NOT NULL CHECK (kind IN ('single_choice', 'numeric', 'short_text', 'explanation', 'flag_country')),
    prompt TEXT NOT NULL,
    flag_asset_id VARCHAR(64) REFERENCES knowledge_assets(asset_id),
    source_ids TEXT[] NOT NULL DEFAULT '{}',
    fact_ids TEXT[] NOT NULL DEFAULT '{}',
    answer_key JSONB NOT NULL,
    correct_option_id VARCHAR(64),
    explanation TEXT NOT NULL,
    difficulty VARCHAR(32) NOT NULL DEFAULT 'basic',
    review_topic VARCHAR(120),
    status VARCHAR(32) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'reviewed', 'published')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (question_id, content_version),
    FOREIGN KEY (module_id, content_version) REFERENCES knowledge_modules(module_id, content_version) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_questions_family ON knowledge_questions(question_family_id, content_version);
CREATE INDEX IF NOT EXISTS idx_questions_module ON knowledge_questions(module_id, content_version, status);

CREATE TABLE IF NOT EXISTS knowledge_question_options (
    question_id VARCHAR(64) NOT NULL,
    content_version VARCHAR(64) NOT NULL,
    option_id VARCHAR(64) NOT NULL,
    text TEXT NOT NULL,
    ordinal INT NOT NULL,
    PRIMARY KEY (question_id, content_version, option_id),
    FOREIGN KEY (question_id, content_version) REFERENCES knowledge_questions(question_id, content_version) ON DELETE CASCADE
);

-- Part 5: Content Reviews and Quiz Attempts History

CREATE TABLE IF NOT EXISTS content_reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(32) NOT NULL CHECK (entity_type IN ('question', 'fact', 'country', 'fragment')),
    entity_id VARCHAR(64) NOT NULL,
    content_version VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('draft', 'reviewed', 'published', 'rejected')),
    reviewer VARCHAR(64) NOT NULL,
    comments TEXT,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    module_id VARCHAR(64) NOT NULL,
    content_version VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'suspended', 'interrupted')),
    question_count INT NOT NULL DEFAULT 5,
    scored_question_count INT NOT NULL DEFAULT 5,
    pass_score INT NOT NULL DEFAULT 4,
    current_ordinal INT NOT NULL DEFAULT 1,
    score INT NOT NULL DEFAULT 0,
    shown_question_ids TEXT[] NOT NULL DEFAULT '{}',
    shown_family_ids TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_active_attempt UNIQUE (user_id, module_id, content_version, status)
);

CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
    attempt_id UUID NOT NULL REFERENCES quiz_attempts(attempt_id) ON DELETE CASCADE,
    ordinal INT NOT NULL,
    question_id VARCHAR(64) NOT NULL,
    question_family_id VARCHAR(64) NOT NULL,
    submitted_answer JSONB NOT NULL,
    is_correct BOOLEAN,
    explanation TEXT,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (attempt_id, ordinal)
);
