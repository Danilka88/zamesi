import json
from pathlib import Path

import numpy as np

from src.core.config import config
from src.core.logging_config import get_logger
from src.core.schemas import CelebrityVoice, MusicMatch, TrackMetadata

SAMPLE_RATE = 16000
FFT_SIZE = 2048
HOP_LENGTH = 512
PEAK_BOX_SIZE = 20
FAN_VALUE = 15


def _get_db_path() -> Path:
    return Path(config.fingerprint_db_path)


# START_BLOCK: M-AUDIO/FINGERPRINTER/DB
class FingerprintDB:
    def __init__(self, db_path: Path | None = None):
        self._db_path = db_path or _get_db_path()
        self._hashes: dict[int, list[dict]] = {}
        self._tracks: dict[str, TrackMetadata] = {}
        self._loaded = False

    def _load(self):
        if self._loaded:
            return
        if self._db_path.exists():
            raw = json.loads(self._db_path.read_text())
            self._hashes = {int(k): v for k, v in raw.get("hashes", {}).items()}
            tracks_raw = raw.get("tracks", {})
            for tid, tm in tracks_raw.items():
                if isinstance(tm, dict):
                    self._tracks[tid] = TrackMetadata(**tm)
                else:
                    self._tracks[tid] = tm
        self._loaded = True

    def _save(self):
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        raw = {
            "hashes": {str(k): v for k, v in self._hashes.items()},
            "tracks": {tid: tm.model_dump() for tid, tm in self._tracks.items()},
        }
        self._db_path.write_text(json.dumps(raw, ensure_ascii=False, indent=2))

    def add_track(self, track_id: str, metadata: TrackMetadata, hashes: list[tuple[int, int]]):
        self._load()
        self._tracks[track_id] = metadata
        for h, offset in hashes:
            if h not in self._hashes:
                self._hashes[h] = []
            self._hashes[h].append({"track_id": track_id, "offset": offset})
        self._save()

    def match_hashes(self, query_hashes: list[tuple[int, int]]) -> list[tuple[str, float, int]]:
        self._load()
        if not query_hashes:
            return []
        scores: dict[str, int] = {}
        for h, _query_offset in query_hashes:
            matches = self._hashes.get(h)
            if not matches:
                continue
            for m in matches:
                tid = m["track_id"]
                scores[tid] = scores.get(tid, 0) + 1
        if not scores:
            return []
        total = len(query_hashes)
        ranked = sorted(
            [(tid, count / total, count) for tid, count in scores.items()],
            key=lambda x: x[1], reverse=True,
        )
        return ranked

    def get_track(self, track_id: str) -> TrackMetadata | None:
        self._load()
        return self._tracks.get(track_id)

    @property
    def track_count(self) -> int:
        self._load()
        return len(self._tracks)

    @property
    def hash_count(self) -> int:
        self._load()
        return len(self._hashes)
# END_BLOCK: M-AUDIO/FINGERPRINTER/DB


# START_BLOCK: M-AUDIO/FINGERPRINTER/FINGERPRINT
def _load_audio(audio_path: str, sr: int = SAMPLE_RATE):
    import librosa
    y, _ = librosa.load(audio_path, sr=sr, mono=True)
    return y, sr


def _compute_spectrogram(y: np.ndarray) -> np.ndarray:
    import librosa
    return np.abs(librosa.stft(y, n_fft=FFT_SIZE, hop_length=HOP_LENGTH))


def _find_peaks(spec: np.ndarray) -> list[tuple[int, int]]:
    peaks = []
    n_freq, n_time = spec.shape
    for t in range(PEAK_BOX_SIZE, n_time - PEAK_BOX_SIZE):
        for f in range(PEAK_BOX_SIZE, n_freq - PEAK_BOX_SIZE):
            val = spec[f, t]
            if val == 0:
                continue
            is_max = True
            for dt in range(-PEAK_BOX_SIZE, PEAK_BOX_SIZE + 1):
                for df in range(-PEAK_BOX_SIZE, PEAK_BOX_SIZE + 1):
                    if dt == 0 and df == 0:
                        continue
                    if spec[f + df, t + dt] >= val:
                        is_max = False
                        break
                if not is_max:
                    break
            if is_max:
                peaks.append((t, f))
    return peaks


def _generate_hashes(peaks: list[tuple[int, int]], fan_value: int = FAN_VALUE) -> list[tuple[int, int]]:
    hashes = []
    peaks = sorted(peaks, key=lambda x: x[0])
    for i in range(len(peaks)):
        for j in range(1, fan_value + 1):
            if i + j >= len(peaks):
                break
            t1, f1 = peaks[i]
            t2, f2 = peaks[i + j]
            dt = t2 - t1
            if dt <= 0 or dt > 200:
                continue
            h = hash((f1, f2, dt))
            hashes.append((h, t1))
    return hashes


def fingerprint_audio(audio_path: str) -> list[tuple[int, int]]:
    if not Path(audio_path).exists():
        get_logger().warning("[M-AUDIO][FINGERPRINTER][FILE_NOT_FOUND]", path=audio_path)
        return []
    y, _sr = _load_audio(audio_path)
    spec = _compute_spectrogram(y)
    peaks = _find_peaks(spec)
    hashes = _generate_hashes(peaks)
    return hashes
# END_BLOCK: M-AUDIO/FINGERPRINTER/FINGERPRINT


# START_BLOCK: M-AUDIO/FINGERPRINTER/MUSIC_MATCH
_db_instance: FingerprintDB | None = None


def _get_db() -> FingerprintDB:
    global _db_instance
    if _db_instance is None:
        _db_instance = FingerprintDB()
    return _db_instance


def match_audio(audio_path: str, min_confidence: float | None = None) -> list[MusicMatch]:
    log = get_logger()
    db = _get_db()
    if db.track_count == 0:
        log.info("[M-AUDIO][FINGERPRINTER][DB_EMPTY]", path=audio_path)
        return []

    threshold = min_confidence if min_confidence is not None else config.fingerprint_min_confidence
    query_hashes = fingerprint_audio(audio_path)
    if not query_hashes:
        return []

    matches = db.match_hashes(query_hashes)
    results = []
    for track_id, score, num_matches in matches:
        if score < threshold:
            continue
        track = db.get_track(track_id)
        if not track:
            continue
        results.append(MusicMatch(
            track_name=track.track_name,
            artist=track.artist,
            confidence=min(1.0, round(score, 3)),
            genre=track.genre,
        ))
    return results


def index_track(
    audio_path: str, track_id: str,
    artist: str, track_name: str,
    genre: str = "",
    album: str = "",
    year: int | None = None,
    afisha_urls: list[str] | None = None,
    merch_urls: list[str] | None = None,
    events: list[dict] | None = None,
) -> int:
    log = get_logger()
    db = _get_db()
    hashes = fingerprint_audio(audio_path)
    if not hashes:
        log.warning("[M-AUDIO][FINGERPRINTER][INDEX_EMPTY]", track_id=track_id)
        return 0
    metadata = TrackMetadata(
        artist=artist, track_name=track_name, genre=genre,
        album=album, year=year,
        afisha_urls=afisha_urls or [],
        merch_urls=merch_urls or [],
        events=events or [],
    )
    db.add_track(track_id, metadata, hashes)
    log.info("[M-AUDIO][FINGERPRINTER][INDEXED]",
             track_id=track_id, artist=artist, track=track_name, hashes=len(hashes))
    return len(hashes)
# END_BLOCK: M-AUDIO/FINGERPRINTER/MUSIC_MATCH


# START_BLOCK: M-AUDIO/CELEBRITY/RECOGNITION
def _get_speaker_embedding(audio_path: str) -> list[float] | None:
    try:
        import torchaudio
        from speechbrain.inference.speaker import EncoderClassifier

        classifier = EncoderClassifier.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb",
            savedir="./models/speaker_embedding",
            run_opts={"device": "cpu"},
        )
        signal, fs = torchaudio.load(audio_path)
        if fs != 16000:
            resampler = torchaudio.transforms.Resample(fs, 16000)
            signal = resampler(signal)
        embedding = classifier.encode_batch(signal)
        return embedding.squeeze().tolist()
    except Exception as e:
        get_logger().warning("[M-AUDIO][CELEBRITY][EMBED_FAILED]", error=str(e))
        return None


def index_celebrity_voice(
    audio_path: str, name: str,
    profession: str = "",
    afisha_urls: list[str] | None = None,
    merch_urls: list[str] | None = None,
) -> bool:
    log = get_logger()
    embedding = _get_speaker_embedding(audio_path)
    if embedding is None:
        return False

    from src.core.embedding import get_chroma_client

    client = get_chroma_client()
    collection = client.get_or_create_collection(
        name="known_voices",
        metadata={"hnsw:space": "cosine"},
    )
    voice_id = name.lower().replace(" ", "_")
    collection.add(
        embeddings=[embedding],
        metadatas=[{
            "name": name,
            "profession": profession,
            "afisha_urls": ",".join(afisha_urls or []),
            "merch_urls": ",".join(merch_urls or []),
        }],
        ids=[voice_id],
    )
    log.info("[M-AUDIO][CELEBRITY][INDEXED]", name=name, voice_id=voice_id)
    return True


def detect_celebrity(audio_path: str, min_confidence: float | None = None) -> CelebrityVoice | None:
    log = get_logger()
    threshold = min_confidence if min_confidence is not None else config.celebrity_min_confidence
    embedding = _get_speaker_embedding(audio_path)
    if embedding is None:
        return None

    from src.core.embedding import get_chroma_client

    client = get_chroma_client()
    try:
        collection = client.get_collection(name="known_voices")
    except ValueError:
        log.info("[M-AUDIO][CELEBRITY][COLLECTION_EMPTY]")
        return None

    results = collection.query(query_embeddings=[embedding], n_results=1)
    if not results["ids"] or not results["ids"][0]:
        return None

    distances = results["distances"][0]
    min_dist = distances[0] if distances else 1.0
    confidence = max(0.0, 1.0 - min_dist)

    if confidence < threshold:
        return None

    meta = results["metadatas"][0][0]
    return CelebrityVoice(
        name=meta.get("name", ""),
        profession=meta.get("profession", ""),
        confidence=round(confidence, 3),
    )
# END_BLOCK: M-AUDIO/CELEBRITY/RECOGNITION


# START_BLOCK: M-AUDIO/FINGERPRINTER/PIPELINE
async def analyze_audio_for_monetization(audio_path: str, log=None) -> tuple[list[MusicMatch], CelebrityVoice | None]:
    log = log or get_logger()

    music_matches: list[MusicMatch] = []
    if config.fingerprint_enabled:
        try:
            music_matches = match_audio(audio_path)
            for m in music_matches:
                log.info("[M-AUDIO][FINGERPRINTER][MATCH]",
                         artist=m.artist, track=m.track_name, conf=m.confidence)
        except Exception as e:
            log.warning("[M-AUDIO][FINGERPRINTER][ERROR]", error=str(e))
    else:
        log.info("[M-AUDIO][FINGERPRINTER][DISABLED]")

    celebrity: CelebrityVoice | None = None
    if config.celebrity_enabled:
        try:
            celebrity = detect_celebrity(audio_path)
            if celebrity:
                log.info("[M-AUDIO][CELEBRITY][MATCH]",
                         name=celebrity.name, conf=celebrity.confidence)
        except Exception as e:
            log.warning("[M-AUDIO][CELEBRITY][ERROR]", error=str(e))
    else:
        log.info("[M-AUDIO][CELEBRITY][DISABLED]")

    return music_matches, celebrity
# END_BLOCK: M-AUDIO/FINGERPRINTER/PIPELINE
