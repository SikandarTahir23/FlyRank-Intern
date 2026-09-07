from app.repositories.cost_repo import CostRepository


class CostTracker:
    def __init__(self):
        self._cost_repo = CostRepository()

    async def get_summary(self, operation_type: str | None = None) -> dict:
        return await self._cost_repo.get_summary(operation_type)