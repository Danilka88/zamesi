from src.core.schemas import ClipCandidate, MonetizationItem, SceneAnalysisResult

_ECOM_KEYWORDS = [
    "ключ", "отвёртка", "дрель", "молоток", "шуруповёрт", "пила",
    "колодк", "масло", "фильтр", "смазк", "инструмент", "набор",
    "кабель", "батаре", "аккумулятор", "чехол", "зарядк",
]

_AD_KEYWORDS = [
    "реклама", "спонсор", "партнёр", "промокод", "скидк", "акци",
]

_CLIP_KEYWORDS = [
    "сейчас покажу", "главная ошибка", "секрет", "лайфхак",
    "важно", "никогда не", "обязательно", "внимание",
]


def rule_based_scene(asr_text: str, ocr_text: str | None) -> SceneAnalysisResult:
    text = (asr_text + " " + (ocr_text or "")).lower()
    monetization = []
    clip = None
    ad = None

    for kw in _ECOM_KEYWORDS:
        if kw in text:
            monetization.append(MonetizationItem(
                type="ecom_item",
                search_query=kw,
                confidence=0.5,
            ))
            break

    for kw in _CLIP_KEYWORDS:
        if kw in text:
            clip = ClipCandidate(
                hook=text[:80],
                time_range_start=0,
                time_range_end=30,
                virality_potential="medium",
            )
            break

    for kw in _AD_KEYWORDS:
        if kw in text:
            ad = MonetizationItem(
                type="ad_slot",
                search_query=kw,
                confidence=0.5,
            )
            break

    return SceneAnalysisResult(
        action_is_clear=True,
        requires_vision=False,
        scene_summary=asr_text[:120],
        monetization=monetization,
        clip_candidate=clip,
        ad_slot=ad,
        fallback_used="rule_based",
    )
