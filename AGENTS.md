# AGENTS.md — AI Assistant Instructions for CipherVault

## Project Overview

CipherVault is a secure cloud storage application with **zero-knowledge encryption**. It uses a hybrid encryption architecture: **UHC (Unimodular Hill Cipher) mod 257** as the inner layer, **AES-256-CBC** as the outer layer, and **RSA-OAEP** for session key wrapping. An AI Selector (rule-based decision tree, not ML) dynamically chooses encryption parameters based on file characteristics.

- **Backend:** Python 3.12 / FastAPI / SQLAlchemy 2.0 / Pydantic 2.9+
- **Frontend:** Vanilla HTML/CSS/JS (ES6+), no framework
- **Database:** PostgreSQL 16 (Docker), SQLite (local dev fallback)
- **Auth:** JWT (python-jose) + API Key (HMAC-SHA256, prefix `cv_`)
- **Crypto:** PyCryptodome (AES, RSA), custom UHC engine, logistic map PRNG

## Architecture

```
backend/
├── main.py                 # FastAPI app, mount routers, lifespan
├── config.py               # Pydantic Settings from .env
├── database.py             # SQLAlchemy engine, SessionLocal, Base, init_db
├── crypto/                 # Core security layer
│   ├── aes_engine.py       # AES-256-CBC encrypt/decrypt
│   ├── uhc_engine.py       # UHC mod 257 encrypt/decrypt
│   ├── rsa_engine.py       # RSA-OAEP key wrapping
│   ├── logistic_map.py     # PRNG for key matrix generation
│   ├── ai_selector.py      # Rule-based encryption parameter selection
│   ├── key_manager.py      # Key derive (PBKDF2), wrap/unwrap (AES-ECB)
│   ├── metadata_generator.py # SHA-256 hash, metadata JSON
│   ├── integrity.py        # Integrity verification
│   └── security_analyzer.py # Entropy, NPCR, UACI, chi-square analysis
├── models/                 # SQLAlchemy ORM models
├── schemas/                # Pydantic request/response schemas
├── routers/                # FastAPI endpoint handlers
├── services/               # Business logic (orchestration)
├── storage/                # File storage abstraction (local filesystem)
├── middleware/              # JWT verification, role guard
├── seeders/                # Default user seeding
└── utils/                  # bcrypt hash, JWT helpers
```

## Code Conventions

### Python Backend
- **Framework:** FastAPI with async handlers where possible
- **ORM:** SQLAlchemy 2.0 with `mapped_column()` style models
- **Validation:** Pydantic v2 schemas for all request/response bodies
- **Naming:** `snake_case` for functions/variables, `PascalCase` for classes
- **Imports:** Use explicit imports from `backend.crypto`, `backend.services`, etc.
- **Error handling:** Raise `HTTPException(status_code=X, detail="message")` from routers; services raise domain exceptions
- **No comments** unless explicitly requested by the user

### Frontend
- **No framework** — vanilla JS with ES6 modules pattern (but loaded via `<script>` tags)
- **API calls:** Use `api.js` wrapper (`window.API.request()` or `window.API.post()`, etc.)
- **Auth:** JWT stored in `localStorage`, auto-attached by `api.js`
- **State:** Global state in `app.js` (`window.App.state`)
- **UI components:** `ui.js` provides `toast()`, `modal()`, `confirm()`
- **CSS:** Three files — `style.css` (variables, layout), `components.css` (widgets), `animations.css` (transitions)

### File Naming
- Backend: `snake_case.py` (e.g., `upload_service.py`)
- Frontend: `snake_case.js` (e.g., `file_list.js`) — note: some are lowercase (`app.js`)
- Tests: `test_<feature>.py`

## Key Workflows

### Upload Flow (10 steps)
```
File → SHA-256 hash → AI Selector (matrix_size, adaptive_r) →
Logistic Map PRNG → Key Matrix → UHC encrypt (mod 257) →
AES-256-CBC encrypt → Wrap session key (AES-ECB with user key) →
Save ciphertext to storage → Save metadata to DB
```

### Download Flow (9 steps)
```
Verify ownership → Read ciphertext → Derive user key (PBKDF2) →
Unwrap session key → AES decrypt → Regenerate key matrix →
UHC decrypt → Verify SHA-256 integrity → Return plaintext
```

### Sharing Flow (Server Wrapping)
```
Verify owner → Find recipient → Unwrap owner's session key →
Re-wrap with recipient's user key → Generate access token →
Save share record
```

## Development Commands

```bash
# Run locally
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Run with Docker
docker compose up --build -d

# Run all tests
pytest -q

# Run specific test categories
pytest tests/test_crypto_*.py -v        # Crypto unit tests
pytest tests/test_upload_flow.py -v     # Upload E2E
pytest tests/test_download_flow.py -v   # Download E2E
pytest tests/test_share_flow.py -v      # Share E2E

# Seed default accounts
python -m backend.seeders.seed
```

## Testing

- **Framework:** pytest with `conftest.py` providing fixtures
- **DB:** In-memory SQLite for tests (via `conftest.py`)
- **HTTP:** `fastapi.testclient.TestClient` (synchronous)
- **Fixtures:** `client`, `db_session`, `auth_headers` (JWT for test user), `admin_headers`
- **Pattern:** Each test creates fresh DB state; no shared mutable state between tests
- **Coverage target:** 105+ tests across crypto, auth, upload, download, share, admin, security

## Security Considerations

- **Session keys** are never stored plain — always wrapped with user key (AES-ECB) before DB save
- **Passwords** hashed with bcrypt (12 rounds) + per-user salt
- **User isolation:** `owner_id` checks in all file operations; users cannot see/modify other users' files
- **Directory traversal:** `LocalStorage._full_path()` validates paths to prevent `../../` escapes
- **Integrity:** SHA-256 hash of plaintext stored in metadata; verified on every download
- **API keys:** Only hash stored in DB; prefix `cv_` for identification; shown once at creation
- **Public links:** HMAC-SHA256 token, optional password (bcrypt), expiry, max_access limit

## Common Patterns to Follow

When adding a new endpoint:
1. Create schema in `backend/schemas/` (request + response)
2. Add business logic in `backend/services/`
3. Create router in `backend/routers/` with FastAPI `APIRouter`
4. Register router in `backend/main.py`
5. Add tests in `tests/`

When modifying crypto code:
- Always verify roundtrip (encrypt → decrypt = original bytes)
- Check mod 257 behavior (byte 0-255 maps to 1-256 for matrix ops)
- Test with multiple file sizes (small, medium, large)

When modifying frontend:
- Use existing `window.API.*` methods for API calls
- Use `window.UI.toast()` for notifications
- Respect dark/light theme via CSS variables (`.dark-theme` class on body)
- Test both themes after changes

## Database Models (Quick Reference)

| Model | Table | Key Relationships |
|-------|-------|-------------------|
| `User` | `users` | Has many `StoredFile`, `ApiKey`, `ActivityLog` |
| `StoredFile` | `stored_files` | Belongs to User (`owner_id`), has one `FileKey`, self-referential `parent_id` for directories |
| `FileKey` | `file_keys` | One-to-one with `StoredFile` — holds wrapped keys + metadata JSON |
| `Share` | `shares` | Links file to recipient with re-wrapped session key |
| `ApiKey` | `api_keys` | Belongs to User; stores only hash |
| `PublicLink` | `public_links` | Links file to public token with optional password/expiry |
| `ActivityLog` | `activity_logs` | Audit trail for all operations |

## Environment Variables (Key Ones)

| Variable | Default | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `sqlite:///./data/ciphervault.db` | Docker uses PostgreSQL |
| `SECRET_KEY` | (generated) | JWT signing key |
| `STORAGE_PATH` | `./data/storage` | Ciphertext storage location |
| `RSA_PRIVATE_KEY_PATH` | `./data/keys/private.pem` | RSA keypair location |
| `AI_MATRIX_STRATEGY` | `multi_feature_adaptive` | `legacy` or `multi_feature_adaptive` |
| `AI_ADAPTIVE_R` | `true` | Enable adaptive logistic parameter |
| `UHC_LOGISTIC_R` | `3.923` | Fallback if adaptive_r=false |
| `UHC_MODULUS` | `257` | Modulus for UHC operations |

## Things to Be Careful About

1. **Crypto roundtrip is sacred** — any change to encrypt must preserve decrypt correctness; always run `pytest tests/test_crypto_*.py`
2. **Mod 257 vs 256** — UHC uses mod 257 (maps bytes 0-255 to 1-256); mod 256 has no guaranteed inverse matrix
3. **File ownership** — every file/sharing operation must verify `owner_id` matches current user
4. **Session key wrapping** — keys are wrapped with user's PBKDF2-derived key, not the user's password directly
5. **Frontend state** — JWT is in `localStorage`; if invalid/expired, `api.js` should redirect to login
6. **Docker ports** — host `3000` maps to container `8000`; always use port 3000 from host
7. **Static files** — frontend HTML/CSS/JS are served by FastAPI as static files from `/app/frontend/`
