# Workspace bootstrap - clones the child architecture repos this workspace wraps.
# See CLAUDE.md and .claude/rules/workspace-paths.md for the layout contract.
#
#   make            clone missing children, install, verify
#   make clone      clone the child repos; wires origin on any that
#                   exist without one (idempotent)
#   make pull       fast-forward the children
#   make install    check for Node 24, point core.hooksPath at .githooks
#                   (pre-commit lint), install hedy/ and npm-link hedy
#                   onto PATH
#   make check      run hedy workspace check, the deps doctor, the skills
#                   lint, the golden tests and the hedy CLI lint and tests
#
# Clones over SSH by default; override for HTTPS:
#   make GIT_BASE=https://github.com/DEFRA

GIT_BASE ?= git@github.com:DEFRA
CHILDREN := trade-imports-documentation delivery-info-arch-tooling trade-imports-schemas

.PHONY: setup clone pull install check

setup: clone install check

# Converges each child to the correct state: present AND origin wired.
# A bare directory target would treat any pre-existing directory as
# "cloned" and silently skip it - which is how children ended up with
# no remote at all.
clone:
	@for repo in $(CHILDREN); do \
		if [ ! -d $$repo ]; then \
			git clone $(GIT_BASE)/$$repo.git $$repo; \
		elif ! git -C $$repo remote get-url origin >/dev/null 2>&1; then \
			git -C $$repo remote add origin $(GIT_BASE)/$$repo.git; \
			echo "clone: $$repo existed without origin - wired $(GIT_BASE)/$$repo.git"; \
		fi; \
	done

pull:
	@for repo in $(CHILDREN); do \
		echo "pull: $$repo"; \
		git -C $$repo pull --ff-only || exit 1; \
	done

# hedy: a bare `npm link` from inside hedy/, never `npm --prefix`: asdf's
# npm wrapper reshims only after the bare form, which puts hedy on PATH.
# hedy needs Node 24, and hedy workspace check cannot report a missing Node,
# so install checks the version before anything else.
install:
	@node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)' 2>/dev/null || { \
		echo "install: FAIL Node 24 or later is required, found $$(node --version 2>/dev/null || echo no node). Install Node 24, then run make install again."; \
		exit 1; \
	}
	@git config core.hooksPath .githooks
	@echo "install: core.hooksPath -> .githooks (pre-commit skills lint)"
	@echo "install: npm ci in hedy/"
	@cd hedy && npm ci
	@echo "install: npm link in hedy/ (hedy onto PATH)"
	@cd hedy && npm link

check:
	@hedy workspace check
	@bash .claude/tools/workspace/check-deps.sh
	@bash .claude/tools/workspace/lint-skills.sh
	@bash .claude/tools/skill-creator/tests/run-golden.sh
	@bash .claude/tools/workspace/tests/run-golden.sh
	@cd hedy && npm run lint
	@cd hedy && npm test
