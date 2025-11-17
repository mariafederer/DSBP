"""Central place for application-level configuration constants."""

from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent.parent
APP_DIR = ROOT_DIR / "app"
FRONTEND_ROOT = ROOT_DIR / "frontend"
FRONTEND_PUBLIC_DIR = FRONTEND_ROOT / "public"
STATIC_FILES_DIR = FRONTEND_ROOT
STATIC_MOUNT_PATH = "/static"
APP_TITLE = "DSBP Web App"
CORS_ALLOW_ORIGINS = ["*"]
CORS_ALLOW_METHODS = ["*"]
CORS_ALLOW_HEADERS = ["*"]
CORS_ALLOW_CREDENTIALS = True

