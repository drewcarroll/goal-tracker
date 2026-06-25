/**
 * CLI entry point (an alternate interface adapter).
 *
 * Demonstrates that use cases are transport-agnostic: the same
 * CreateGoalUseCase that powers the HTTP route is invoked here from a CLI.
 *
 * Usage:
 *   tsx src/interfaces/cli/createGoal.ts <userId> "<title>" ["<description>"]
 */
import { getContainer } from "@/infrastructure/container";

async function main(): Promise<void> {
  const [userId, title, description] = process.argv.slice(2);

  if (!userId || !title) {
    // eslint-disable-next-line no-console
    console.error('Usage: createGoal <userId> "<title>" ["<description>"]');
    process.exit(1);
  }

  const { createGoalUseCase } = getContainer();
  const goal = await createGoalUseCase.execute({
    userId,
    title,
    description: description ?? null,
  });

  // eslint-disable-next-line no-console
  console.log("Created goal:", JSON.stringify(goal, null, 2));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to create goal:", error);
  process.exit(1);
});
