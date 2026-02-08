from celery import Celery

celery = Celery(
    "noteflix",
    broker="redis://redis:6379/0",
    backend="redis://redis:6379/0"
)
