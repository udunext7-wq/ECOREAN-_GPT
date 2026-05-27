import { emptyCustomerProposalMapData, sanitizeLightBIMCustomerMapData } from '../../app/lightbim/customerSafeMapFilter';

function bridge() {
  return window.ecorean?.bocDb;
}

export async function getLightBIMCustomerProposalMapData(payload: Record<string, unknown> = {}) {
  const api = bridge();
  if (!api?.getLightBIMCustomerProposalMapData) return emptyCustomerProposalMapData();
  return sanitizeLightBIMCustomerMapData(await api.getLightBIMCustomerProposalMapData(payload));
}

export async function getLightBIMCustomerProposalMapByEstimate(payload: Record<string, unknown> = {}) {
  const api = bridge();
  if (!api?.getLightBIMCustomerProposalMapByEstimate) return emptyCustomerProposalMapData();
  return sanitizeLightBIMCustomerMapData(await api.getLightBIMCustomerProposalMapByEstimate(payload));
}

export async function getLightBIMCustomerProposalMapByProject(payload: Record<string, unknown> = {}) {
  const api = bridge();
  if (!api?.getLightBIMCustomerProposalMapByProject) return emptyCustomerProposalMapData();
  return sanitizeLightBIMCustomerMapData(await api.getLightBIMCustomerProposalMapByProject(payload));
}
