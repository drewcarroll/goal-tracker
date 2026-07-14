import { GOAL_SUGGESTIONS } from "@/domain/value-objects/GoalSuggestions";
import { GoalSuggestionDTO } from "../dtos/GoalDTO";

/**
 * Use Case: expose the optional "quick add" suggestion list to the UI. No
 * repository dependency — it's a domain constant, not persisted — but still
 * goes through a use case so interfaces never imports domain directly.
 */
export class GetGoalSuggestionsUseCase {
  execute(): GoalSuggestionDTO[] {
    return GOAL_SUGGESTIONS.map((label) => ({ label }));
  }
}
