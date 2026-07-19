from pathlib import Path

import pytest

from src.api.routes import _run_pipeline
from src.core.schemas import JobStatus


@pytest.mark.skipif(
    not list(Path(__file__).parent.glob("fixtures/videos/*.mp4")),
    reason="No test video files found in tests/fixtures/videos/",
)
@pytest.mark.asyncio
async def test_pipeline_howto_video(mock_ollama_response):
    videos = list(Path(__file__).parent.glob("fixtures/videos/*howto*.mp4"))
    if not videos:
        videos = list(Path(__file__).parent.glob("fixtures/videos/*.mp4"))
    if not videos:
        pytest.skip("No video files available")
    video_path = str(videos[0])
    job_id = "test_howto_001"

    from src.core.logging_config import get_logger
    log = get_logger(correlation_id=job_id)

    await _run_pipeline(job_id, video_path, log)

    from src.api.routes import _jobs
    result = _jobs.get(job_id)
    assert result is not None
    assert result.status == JobStatus.done
    assert result.metrics is not None
    assert result.passport is not None
    assert result.passport.frontmatter.video_id == Path(video_path).stem
