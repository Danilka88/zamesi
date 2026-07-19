import asyncio
import uuid

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from src.core.logging_config import get_logger
from src.core.schemas import Mix, MixRequest
from src.mixer.mix_composer import compose_mix
from src.mixer.mix_to_md import mix_to_markdown
from src.mixer.stage_planner import plan_stages

router = APIRouter(prefix="/mix", tags=["mix"])
_mixes: dict[str, Mix] = {}


# START_BLOCK: M-MIXER/ROUTES/CREATE_MIX
@router.post("/")
async def create_mix(request: MixRequest) -> dict:
    mix_id = str(uuid.uuid4())[:8]
    log = get_logger()
    log.info("[M-MIXER][ROUTES][MIX_CREATED]", query=request.query, mix_id=mix_id)
    asyncio.create_task(_run_mix(mix_id, request, log))
    return {"mix_id": mix_id}
# END_BLOCK: M-MIXER/ROUTES/CREATE_MIX


@router.get("/{mix_id}")
async def get_mix(mix_id: str) -> Mix:
    mix = _mixes.get(mix_id)
    if not mix:
        raise HTTPException(status_code=404, detail="Mix not found")
    return mix


@router.get("/{mix_id}/markdown")
async def get_mix_markdown(mix_id: str) -> PlainTextResponse:
    mix = _mixes.get(mix_id)
    if not mix:
        raise HTTPException(status_code=404, detail="Mix not found")
    md = mix_to_markdown(mix)
    return PlainTextResponse(md, media_type="text/markdown")


# START_BLOCK: M-MIXER/ROUTES/RUN
async def _run_mix(mix_id: str, request: MixRequest, log) -> None:
    try:
        log.info("[M-MIXER][ROUTES][RUN_START]", query=request.query)

        stages = await plan_stages(request.query, log=log)
        log.info("[M-MIXER][ROUTES][STAGES_PLANNED]", count=len(stages))

        from src.core.schemas import Stage
        stage_objs = [Stage(**s) for s in stages]

        mix = await compose_mix(
            query=request.query,
            stages=stage_objs,
            max_videos_per_stage=request.max_videos_per_stage,
            log=log,
        )
        mix.mix_id = mix_id
        _mixes[mix_id] = mix

        log.info("[M-MIXER][ROUTES][MIX_DONE]", mix_id=mix_id, stages=len(mix.stages))
    except Exception as e:
        log.error("[M-MIXER][ROUTES][MIX_FAILED]", error=str(e))
# END_BLOCK: M-MIXER/ROUTES/RUN
