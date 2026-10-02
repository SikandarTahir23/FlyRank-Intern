"""
Probe 5: Cost Tracking
Verify that ai_cost_logs are populated for vision and embedding operations.
"""
from app.repositories.cost_repo import CostRepository


async def run_probe_5():
    cost_repo = CostRepository()
    summary = await cost_repo.get_summary()

    vision_logs = [s for s in summary if s["operation_type"] == "vision"]
    embedding_logs = [s for s in summary if s["operation_type"] in ("embedding_image", "embedding_text")]

    has_vision = len(vision_logs) > 0
    has_embedding = len(embedding_logs) > 0
    has_costs = any(s["total_cost_usd"] > 0 for s in summary)

    return {
        "probe": "cost_tracking",
        "passed": has_vision and has_embedding and has_costs,
        "details": f"Vision ops: {len(vision_logs)}, Embedding ops: {len(embedding_logs)}, Has costs: {has_costs}",
    }


if __name__ == "__main__":
    import asyncio
    print(asyncio.run(run_probe_5()))