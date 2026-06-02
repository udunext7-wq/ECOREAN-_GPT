const bocDb = () => window.ecorean?.bocDb;

function requireDb() {
  const db = bocDb();
  if (!db) throw new Error('BOC DB bridge is not available');
  return db;
}

export const realProjectIntakeService = {
  createRealProjectIntake(payload: Record<string, unknown>) {
    return requireDb().createRealProjectIntake(payload);
  },
  updateRealProjectIntake(payload: Record<string, unknown>) {
    return requireDb().updateRealProjectIntake(payload);
  },
  getRealProjectIntake(payload: Record<string, unknown>) {
    return requireDb().getRealProjectIntake(payload);
  },
  listRealProjectIntakes() {
    return requireDb().listRealProjectIntakes();
  },
  validateRealProjectIntake(payload: Record<string, unknown>) {
    return requireDb().validateRealProjectIntake(payload);
  },
  connectLightBIMToIntake(payload: Record<string, unknown>) {
    return requireDb().connectLightBIMToIntake(payload);
  },
  checkIntakePriceReadiness(payload: Record<string, unknown>) {
    return requireDb().checkIntakePriceReadiness(payload);
  },
  generateEstimateFromIntake(payload: Record<string, unknown>) {
    return requireDb().generateEstimateFromIntake(payload);
  },
  runPCEForIntake(payload: Record<string, unknown>) {
    return requireDb().runPCEForIntake(payload);
  },
  runIntakeCustomerSafetyCheck(payload: Record<string, unknown>) {
    return requireDb().runIntakeCustomerSafetyCheck(payload);
  },
  createRealProjectIntakeReport(payload: Record<string, unknown>) {
    return requireDb().createRealProjectIntakeReport(payload);
  },
  createRealProjectIntakeIssue(payload: Record<string, unknown>) {
    return requireDb().createRealProjectIntakeIssue(payload);
  }
};
