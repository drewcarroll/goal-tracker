# Goal Tracker — local dev helpers.
# Usage: `make` (shows this help), `make setup`, `make dev`, etc.

# Use bash and fail fast.
SHELL := /bin/bash
.DEFAULT_GOAL := help

# Env vars required to run the full app (single-user, Supabase-backed).
REQUIRED_VARS := NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY APP_PASSWORD

.PHONY: help
help: ## Show this help
	@echo "Goal Tracker — make targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

.PHONY: install
install: ## Install dependencies
	npm install

.PHONY: setup
setup: install ## First-time setup: install dependencies
	@echo "✓ Setup done. Next: fill .env (see SETUP.md), then 'make env-check' and 'make dev'."

.PHONY: env-check
env-check: ## Verify .env has the variables needed to run the full app
	@test -f .env || { echo "✗ No .env file. Copy it from .env.example first."; exit 1; }
	@missing=0; \
	for v in $(REQUIRED_VARS); do \
		val=$$(grep -E "^$$v=" .env | cut -d= -f2- | tr -d '"'); \
		if [ -z "$$val" ] || [[ "$$val" == your-* ]] || [[ "$$val" == *your-project-ref* ]] || [[ "$$val" == change-me ]]; then \
			echo "  ✗ $$v is missing or a placeholder"; missing=1; \
		else \
			echo "  ✓ $$v"; \
		fi; \
	done; \
	if [ $$missing -ne 0 ]; then \
		echo "→ Fill the values above in .env before 'make dev' (see SETUP.md)."; \
		exit 1; \
	fi
	@echo "✓ All required env vars look set."

.PHONY: dev
dev: ## Start the Next.js dev server on http://localhost:3000
	npm run dev

.PHONY: demo
demo: ## View the progress charts with mock data (no Supabase/password needed)
	@echo "→ Open http://localhost:3000/demo once the server is ready."
	npm run dev

.PHONY: build
build: ## Production build
	npm run build

.PHONY: start
start: ## Run the production build (after 'make build')
	npm run start

# --- Quality gates ---

.PHONY: typecheck
typecheck: ## tsc --noEmit
	npm run type-check

.PHONY: lint
lint: ## next lint
	npm run lint

.PHONY: test
test: ## Run the unit test suite
	npm run test

.PHONY: check
check: typecheck lint test ## Run typecheck + lint + tests (CI gate)
	@echo "✓ All checks passed."
