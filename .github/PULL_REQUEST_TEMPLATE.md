## Summary

<!-- What changed and why? Keep this tied to user/business outcome. -->

## Release risk checklist

- [ ] Scope is limited and backward compatible
- [ ] No auth/permissions regression
- [ ] No billing/subscription regression
- [ ] Data model/storage changes reviewed (if applicable)
- [ ] Performance impact evaluated for hot paths
- [ ] Monitoring/logging updated if needed

## Testing

- [ ] Unit/integration tests added or updated
- [ ] Manual QA completed for critical path
- [ ] CI checks passing

## Rollback notes

<!-- Describe exactly how to revert if needed (revert commit, feature flag off, config rollback, etc.). -->

- Rollback trigger:
- Rollback steps:
- Expected recovery time:
- Customer impact during rollback:
