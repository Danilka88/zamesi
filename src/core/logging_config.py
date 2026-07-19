import structlog
from structlog.processors import JSONRenderer, TimeStamper


def setup_logging(service_name: str = "rutube-analyzer") -> None:
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(correlation_id: str | None = None) -> structlog.stdlib.BoundLogger:
    log = structlog.get_logger()
    if correlation_id:
        log = log.bind(correlation_id=correlation_id)
    return log
