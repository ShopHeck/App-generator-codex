export class PlanLimitService {
  constructor({ tenantRepository, generationRunRepository, exportRepository }) {
    this.tenantRepository = tenantRepository;
    this.generationRunRepository = generationRunRepository;
    this.exportRepository = exportRepository;
  }

  async assertGenerationAllowed({ tenantId }) {
    const limits = await this.#loadLimits(tenantId);
    const generationCount = await this.generationRunRepository.countForCurrentMonth({ tenantId });

    if (generationCount >= limits.monthly_generation_limit) {
      throw new Error("Monthly generation limit reached for tenant subscription.");
    }
  }

  async assertExportAllowed({ tenantId }) {
    const limits = await this.#loadLimits(tenantId);
    const exportCount = await this.exportRepository.countForCurrentMonth({ tenantId });

    if (exportCount >= limits.monthly_export_limit) {
      throw new Error("Monthly export limit reached for tenant subscription.");
    }
  }

  async getCurrentUsage({ tenantId }) {
    const limits = await this.#loadLimits(tenantId);
    const [generationCount, exportCount] = await Promise.all([
      this.generationRunRepository.countForCurrentMonth({ tenantId }),
      this.exportRepository.countForCurrentMonth({ tenantId })
    ]);

    return {
      planTier: limits.plan_tier,
      monthlyGenerationLimit: limits.monthly_generation_limit,
      monthlyExportLimit: limits.monthly_export_limit,
      generationCount,
      exportCount
    };
  }

  async #loadLimits(tenantId) {
    const limits = await this.tenantRepository.getPlanLimits({ tenantId });

    if (!limits) {
      throw new Error("Tenant not found for plan limits.");
    }

    return limits;
  }
}
