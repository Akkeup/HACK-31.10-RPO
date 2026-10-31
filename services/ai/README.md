# Discovery Local AI & Adaptive NPC Service

Internal pluggable interface for educational non-player characters (NPCs).

## Architecture & Decoupling

The game server interacts with the AI service through a model-agnostic contract:
- **`NpcAiService` Interface**: Dispatches player interaction requests (`talk`, `observe`, `query`) independently of the underlying engine.
- **Rule-Based & Keyword Matching Engine**: Zero-latency offline engine matching keywords against the knowledge pack in `assets/npc/knowledge/discovery-basics.json`.
- **Adaptive Difficulty Progression**:
  - `simple`: Beginner-friendly introductory explanations.
  - `advanced`: Rigorous scientific and technical explanations.
  - `adaptive`: Automatically scales complexity based on player's completed knowledge units ($N \ge 1$).
- **Local LLM / Ollama Backend Adapter**: Standard HTTP client connector to local Ollama (`http://localhost:11434/api/generate`) with strict timeout fallback to rule-based engine.
- **Persistent Memory & Turn History**: Dialogue turns and progress revisions committed to `npc_memories` and `interactions` tables in PostgreSQL 18.
