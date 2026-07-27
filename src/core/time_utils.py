# START_BLOCK: M-CORE/TIME_UTILS/FMT_SEC
def fmt_sec(sec: float) -> str:
    return f"{int(sec) // 60:02d}:{int(sec) % 60:02d}"
# END_BLOCK: M-CORE/TIME_UTILS/FMT_SEC
