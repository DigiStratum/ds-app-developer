# ADR-0001: Self-Hosted GitHub Actions Runners

**Status:** Accepted  
**Date:** 2026-03-13  
**Decision Makers:** skelly, lucca  
**Related Issues:** #1341, #1343, #1344, #1345, #1346

## Context

GitHub Actions compute costs exceeded budget in early March 2026 (90% of included minutes consumed within 3 days). Each CI run costs ~20 billable minutes across parallel jobs:

| Job | Minutes |
|-----|---------|
| Security Scan | ~5 |
| E2E Tests | ~4 |
| Backend Lint/Test/Build | ~6 |
| Frontend Lint/Test/Build | ~3 |
| CDK Synth + CI Pass | ~2 |

With CI + Deploy per push = ~40 min/push. High automation velocity with agents leads to high burn rate.

**Affected Repos:**
- ds-app-sitemanager (most active)
- DSKanban
- DSCRM
- DSAccount
- ds-app-developer

## Decision

**DEFER** adoption of self-hosted runners. Continue using GitHub-hosted runners with workflow optimizations.

## Evaluation Summary

### Cost Analysis (Issue #1343)

| Option | Monthly Cost | Setup Complexity | Maintenance |
|--------|-------------|------------------|-------------|
| **GitHub Team Plan** | ~$44/mo (3,000 min included) | None | None |
| EC2 Spot (t4g.small) | ~$5-8/mo + storage | Medium | Medium |
| EC2 On-Demand | ~$15-20/mo | Medium | Medium |
| Hetzner VPS (CAX11) | ~$4/mo | Low | Low |
| Local Mac Mini | $0 (existing) | High | High |

**Break-even:** At current velocity (~3,000-5,000 min/mo), self-hosted would save ~$20-40/mo.

**Hidden Costs:**
- Engineering time for setup, monitoring, incident response
- Storage and networking for artifacts
- Runner maintenance and updates
- Spot instance interruption handling

### Security Review (Issue #1344)

**Risks Identified:**
1. **Workflow injection** — Malicious PRs could execute arbitrary code on runner
2. **Secret exposure** — Persistent runners may retain secrets between jobs
3. **Network access** — Runner has access to internal networks
4. **Supply chain** — Compromised dependencies execute on runner

**Required Mitigations (if adopted):**
- Ephemeral runners (containers or VMs spun up per job)
- Strict network isolation
- No direct AWS credential access (use OIDC)
- Private repos only (public repos have higher attack surface)

**Assessment:** Mitigations are achievable but add operational complexity.

### POC Results (Issue #1345)

Successfully deployed `ds-poc-runner` (macOS ARM64):
- **Platform:** Local Mac Mini running GitHub Actions Runner
- **Test Job:** Security scan (41s execution vs ~5 min billed on GitHub-hosted)
- **Workflow:** `[self-hosted, digistratum, poc]` label targeting
- **Initial Performance:** Comparable to GitHub-hosted (~1m25s vs 1m29s total)

**Limitations:**
- Repository-level runner only (org admin permissions required for org-wide)
- No auto-scaling (single runner)
- Availability depends on local hardware

## Rationale for Deferral

1. **Marginal Savings:** At current scale, savings (~$20-40/mo) don't justify operational overhead.

2. **Workflow Optimizations First:** Other optimizations offer better ROI:
   - Path-based filters (skip E2E on docs-only changes)
   - Job consolidation
   - Schedule-based security scans (daily vs per-push)
   - Local pre-push testing
   
   These are already in progress under Epic #1320.

3. **Security Overhead:** Proper self-hosted runner security requires ephemeral infrastructure, adding complexity.

4. **Team Size:** Single-person team can't afford runner maintenance overhead.

5. **POC Incomplete:** 1-week monitoring period not yet concluded; insufficient data for production decision.

## Conditions for Reconsideration

Re-evaluate self-hosted runners if:

1. **GHA costs exceed $100/month** consistently after workflow optimizations
2. **Team grows** to 3+ developers sharing runner maintenance
3. **Specific jobs** require capabilities unavailable on GitHub-hosted (e.g., GPU, specific hardware)
4. **GitHub Actions pricing changes** significantly
5. **Need for arm64 runners** becomes critical (for Lambda compatibility testing)

## Alternatives Considered

| Alternative | Verdict |
|-------------|---------|
| Self-hosted EC2 | Deferred — marginal savings, operational overhead |
| Self-hosted VPS | Deferred — same concerns as EC2 |
| Local Mac Mini | Deferred — availability concerns, no redundancy |
| Alternative CI (CircleCI, GitLab) | Not evaluated — GitHub integration is valuable |
| GitHub larger runners | Not needed — standard runners sufficient |

## Rollout Plan (If Adopted Later)

1. **Week 1:** Deploy EC2 spot instance with autoscaling group (min 0, max 2)
2. **Week 2:** Register as org-level runner with label `ds-self-hosted`
3. **Week 3:** Migrate one job (security scan) to self-hosted
4. **Week 4:** Monitor, tune autoscaling, address issues
5. **Month 2:** Expand to additional jobs if stable

## Consequences

### Positive
- No additional infrastructure to maintain
- No security surface expansion
- Focus engineering effort on workflow optimizations

### Negative
- GHA costs remain variable with velocity
- No arm64 runner availability (relies on GitHub's roadmap)

### Neutral
- Decision documented for future reference
- POC artifacts available for rapid deployment if conditions change

## References

- [GitHub: Self-hosted runner security](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners#self-hosted-runner-security)
- [GitHub: Using self-hosted runners in a workflow](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/using-self-hosted-runners-in-a-workflow)
- [POC Repository](https://github.com/DigiStratum/ds-app-sitemanager-poc)
