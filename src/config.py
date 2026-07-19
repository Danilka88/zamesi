from pathlib import Path

import yaml

from src.core.exceptions import ConfigError


class Config:
    _instance = None
    _loaded: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._loaded = False
        return cls._instance

    def load(self, path: str | Path = "config.yaml") -> None:
        if self._loaded:
            return
        path = Path(path)
        if not path.exists():
            raise ConfigError(f"Config file not found: {path}")
        with open(path) as f:
            raw = yaml.safe_load(f)
        self._raw = raw
        self._loaded = True

    def _get(self, *keys: str, default=None):
        if not self._loaded:
            raise ConfigError("Config not loaded. Call config.load() first.")
        val = self._raw
        for k in keys:
            if isinstance(val, dict):
                val = val.get(k)
                if val is None:
                    return default
            else:
                return default
        return val if val is not None else default

    @property
    def ollama_endpoint(self) -> str:
        return self._get("models", "ollama", "endpoint", default="http://localhost:11434")

    @property
    def ollama_text_model(self) -> str:
        return self._get("models", "ollama", "text_model", default="qwen3.5:9b")

    @property
    def ollama_vision_model(self) -> str:
        return self._get("models", "ollama", "vision_model", default="qwen3.5:9b")

    @property
    def ollama_temperature(self) -> float:
        return float(self._get("models", "ollama", "default_params", "temperature", default=0.1))

    @property
    def ollama_max_tokens(self) -> int:
        return int(self._get("models", "ollama", "default_params", "max_tokens", default=2048))

    @property
    def classifier_model(self) -> str:
        return self._get("models", "ollama", "classifier_model", default="qwen3.5:0.8b")

    @property
    def classifier_max_tokens(self) -> int:
        return int(self._get("models", "ollama", "classifier_max_tokens", default=8192))

    @property
    def genres(self) -> list[dict]:
        return self._get("genres", "labels", default=[])

    @property
    def whisper_binary(self) -> str:
        return self._get("models", "whisper", "binary", default="whisper-cli")

    @property
    def whisper_model(self) -> str:
        return self._get("models", "whisper", "model", default="large-v3")

    @property
    def audio_sample_rate(self) -> int:
        return int(self._get("audio", "sample_rate", default=16000))

    @property
    def audio_temp_dir(self) -> str:
        return self._get("audio", "temp_dir", default="/tmp/rutube-audio")

    @property
    def ocr_confidence_threshold(self) -> float:
        return float(self._get("ocr", "confidence_threshold", default=0.5))

    @property
    def ocr_buffer_window_sec(self) -> int:
        return int(self._get("ocr", "buffer_window_sec", default=5))

    def timeout(self, name: str) -> int:
        return int(self._get("timeouts", name, default=20))

    @property
    def retry_max_attempts(self) -> int:
        return int(self._get("retry", "max_attempts", default=3))

    @property
    def retry_base_delay(self) -> float:
        return float(self._get("retry", "base_delay_sec", default=1.0))

    @property
    def retry_max_delay(self) -> float:
        return float(self._get("retry", "max_delay_sec", default=10.0))

    @property
    def retry_backoff_factor(self) -> float:
        return float(self._get("retry", "backoff_factor", default=2.0))

    @property
    def circuit_breaker_threshold(self) -> int:
        return int(self._get("circuit_breaker", "failure_threshold", default=10))

    @property
    def circuit_breaker_recovery_sec(self) -> int:
        return int(self._get("circuit_breaker", "recovery_timeout_sec", default=60))

    @property
    def fallback_chain(self) -> list[str]:
        return list(self._get("fallback_chain", default=["retry_same", "shorten_prompt", "skip_vision", "rule_based"]))


config = Config()
