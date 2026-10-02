import yaml
from pathlib import Path
from app.core.eval import EvaluationRunner


async def main():
    runner = EvaluationRunner()

    dataset_path = Path("data/eval_set.yaml")
    if not dataset_path.exists():
        print(f"Dataset not found: {dataset_path}")
        return

    with open(dataset_path) as f:
        test_cases = yaml.safe_load(f)

    print(f"Running evaluation on {len(test_cases)} test cases...")
    results = await runner.run_dataset(test_cases)

    total = len(results)
    correct = sum(1 for r in results if r.passed)
    no_match = sum(1 for r in results if r.guard_verdict == "no_match")

    print(f"\n=== Evaluation Results ===")
    print(f"Total posts: {total}")
    print(f"Top-1 Precision: {correct}/{total} = {correct/total:.2%}")
    print(f"No-Match Rate: {no_match}/{total} = {no_match/total:.2%}")

    for r in results:
        status = "✓" if r.passed else "✗"
        print(f"  {status} Post {r.post_id}: expected={r.expected_image_id}, predicted={r.predicted_image_id}, verdict={r.guard_verdict}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())