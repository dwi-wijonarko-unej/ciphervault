from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "CipherVault API"
    debug: bool = False

    secret_key: str = "change-this-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 120

    database_url: str = "sqlite:///./data/ciphervault.db"
    storage_path: str = "./data/storage"

    uhc_logistic_r: float = 3.923
    uhc_modulus: int = 257
    uhc_matrix_size: int = 8

    ai_matrix_strategy: str = "multi_feature_adaptive"
    ai_adaptive_r: bool = True

    rsa_key_size: int = 2048
    rsa_private_key_path: str = "./data/keys/private.pem"
    rsa_public_key_path: str = "./data/keys/public.pem"

    session_key_bytes: int = 32
    pbkdf2_iterations: int = 100000

    max_upload_bytes: int = 1_048_576  # 1 MB

    rate_limit_enabled: bool = True
    login_rate_limit: int = 5
    login_rate_window_seconds: int = 60
    upload_rate_limit: int = 10
    upload_rate_window_seconds: int = 3600

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_tls: bool = True
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    midtrans_server_key: str = ""
    midtrans_sandbox: bool = True
    snap_expiry_hours: int = 24
    public_base_url: str = "http://43.156.234.238:3000"
    mock_gateway: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
