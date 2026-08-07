# Workspace bootstrap - clones the child architecture repos this workspace wraps.
# See CLAUDE.md and .claude/rules/workspace-paths.md for the layout contract.
#
#   make            clone missing children, create the canonical symlink, verify
#   make clone      clone the child repos (no-op when already present)
#   make pull       fast-forward the children
#   make link       create ~/trade-imports-arch-workspace -> this checkout
#                   and point core.hooksPath at .githooks (pre-commit lint)
#   make check      run the doctors, the skills lint and the golden tests
#
# Clones over HTTPS by default; override for SSH:
#   make GIT_BASE=git@github.com:DEFRA

GIT_BASE ?= https://github.com/DEFRA
CHILDREN := trade-imports-documentation delivery-info-arch-tooling trade-imports-schemas
CANONICAL := $(HOME)/trade-imports-arch-workspace

.PHONY: setup clone pull link check

setup: clone link check

clone: $(CHILDREN)

$(CHILDREN):
	git clone $(GIT_BASE)/$@.git $@

pull:
	@for repo in $(CHILDREN); do \
		echo "pull: $$repo"; \
		git -C $$repo pull --ff-only || exit 1; \
	done

link:
	@if [ -e $(CANONICAL) ] || [ -L $(CANONICAL) ]; then \
		echo "link: $(CANONICAL) already present"; \
	else \
		ln -s $(CURDIR) $(CANONICAL); \
		echo "link: $(CANONICAL) -> $(CURDIR)"; \
	fi
	@git config core.hooksPath .githooks
	@echo "link: core.hooksPath -> .githooks (pre-commit skills lint)"

check:
	@bash .claude/tools/workspace/check-workspace.sh
	@bash .claude/tools/workspace/check-deps.sh
	@bash .claude/tools/workspace/lint-skills.sh
	@bash .claude/tools/skill-creator/tests/run-golden.sh
	@bash .claude/tools/workspace/tests/run-golden.sh