import asyncio
from pathlib import Path

import torch
import torchaudio

from src.core.exceptions import DiarizationError
from src.core.logging_config import get_logger
from src.core.schemas import SpeakerSegment


# START_BLOCK: M-AUDIO/SPEECHBRAIN/DIARIZE
async def diarize(audio_path: str | Path, log=None) -> list[SpeakerSegment]:
    log = log or get_logger()
    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise DiarizationError(f"Audio file not found: {audio_path}")

    log.info("[M-AUDIO][SPEECHBRAIN][START]")

    def _run() -> list[SpeakerSegment]:
        waveform, sr = torchaudio.load(str(audio_path))
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)
        if sr != 16000:
            resampler = torchaudio.transforms.Resample(sr, 16000)
            waveform = resampler(waveform)
            sr = 16000

        speech_ts = _vad_segments(waveform.squeeze(0))
        if not speech_ts:
            log.info("[M-AUDIO][SPEECHBRAIN][NO_SPEECH]")
            return []

        merged = _merge_segments(speech_ts, gap_sec=0.5)

        from speechbrain.inference.speaker import EncoderClassifier
        classifier = EncoderClassifier.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb",
            savedir=str(Path.home() / ".cache" / "speechbrain" / "spkrec-ecapa-voxceleb"),
        )

        embeddings = []
        valid_segments = []
        for start, end in merged:
            chunk = waveform[:, int(start * sr):int(end * sr)]
            if chunk.shape[1] < sr // 4:
                continue
            emb = classifier.encode_batch(chunk).squeeze().cpu().numpy()
            embeddings.append(emb)
            valid_segments.append((start, end))

        if len(embeddings) < 2:
            label = "SPEAKER_00"
            return [SpeakerSegment(speaker=label, start_sec=s, end_sec=e) for s, e in valid_segments]

        import numpy as np
        from sklearn.cluster import SpectralClustering
        emb_array = np.array(embeddings)
        n_clusters = _estimate_clusters(emb_array)
        clustering = SpectralClustering(
            n_clusters=n_clusters,
            affinity="cosine",
            random_state=0,
        ).fit(emb_array)
        labels = clustering.labels_

        speaker_map = _remap_labels(labels)
        segments = []
        for (start, end), label in zip(valid_segments, speaker_map):
            segments.append(SpeakerSegment(speaker=label, start_sec=start, end_sec=end))
        return segments

    segments = await asyncio.to_thread(_run)

    speakers = list(set(s.speaker for s in segments))
    log.info("[M-AUDIO][SPEECHBRAIN][DONE]", segments=len(segments), speakers=len(speakers))
    return segments
# END_BLOCK: M-AUDIO/SPEECHBRAIN/DIARIZE


def _vad_segments(waveform: torch.Tensor) -> list[tuple[float, float]]:
    from silero_vad import get_speech_timestamps, load_silero_vad
    model = load_silero_vad(onnx=False)
    wav = waveform.cpu() if waveform.device.type != "cpu" else waveform
    ts = get_speech_timestamps(
        wav,
        model,
        sampling_rate=16000,
        min_speech_duration_ms=300,
        min_silence_duration_ms=250,
        speech_pad_ms=50,
        return_seconds=True,
    )
    return [(t["start"], t["end"]) for t in ts]


def _merge_segments(segments: list[tuple[float, float]], gap_sec: float) -> list[tuple[float, float]]:
    if not segments:
        return []
    merged = [list(segments[0])]
    for start, end in segments[1:]:
        if start - merged[-1][1] <= gap_sec:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return [(s, e) for s, e in merged]


def _estimate_clusters(embeddings) -> int:
    n = len(embeddings)
    if n <= 2:
        return 1
    n = min(n, 8)
    return max(2, n // 2)


def _remap_labels(labels) -> list[str]:
    import numpy as np
    unique = sorted(np.unique(labels))
    mapping = {old: f"SPEAKER_{i:02d}" for i, old in enumerate(unique)}
    return [mapping[label] for label in labels]
