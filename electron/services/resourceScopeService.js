'use strict';

const SCOPE_TYPES = ['GLOBAL', 'ORGANIZATION', 'PROJECT', 'SITE'];

function normalize(value) {
  return String(value || '').trim().toUpperCase();
}

function createResourceScopeService() {
  function evaluateScope(assignment = {}, context = {}) {
    const scopeType = normalize(assignment.scopeType);
    if (!SCOPE_TYPES.includes(scopeType)) {
      return { allowed: false, reasonCode: 'UNKNOWN_SCOPE', reasonKo: '알 수 없는 역할 범위입니다.' };
    }

    const organizationId = String(context.organizationId || '').trim();
    const projectId = String(context.projectId || '').trim();
    const siteId = String(context.siteId || '').trim();
    if (assignment.organizationId && organizationId !== assignment.organizationId) {
      return { allowed: false, reasonCode: 'ORGANIZATION_SCOPE_MISMATCH', reasonKo: '조직 범위가 일치하지 않습니다.' };
    }
    if (scopeType === 'PROJECT' || scopeType === 'SITE') {
      if (!projectId || projectId !== assignment.projectId) {
        return { allowed: false, reasonCode: 'PROJECT_SCOPE_MISMATCH', reasonKo: '프로젝트 범위가 일치하지 않습니다.' };
      }
    }
    if (scopeType === 'SITE' && (!siteId || siteId !== assignment.siteId)) {
      return { allowed: false, reasonCode: 'SITE_SCOPE_MISMATCH', reasonKo: '현장 범위가 일치하지 않습니다.' };
    }
    if (scopeType === 'ORGANIZATION' && !organizationId) {
      return { allowed: false, reasonCode: 'ORGANIZATION_CONTEXT_REQUIRED', reasonKo: '조직 범위 정보가 필요합니다.' };
    }
    return { allowed: true, reasonCode: 'SCOPE_MATCH', reasonKo: '역할 범위가 일치합니다.' };
  }

  return { evaluateScope };
}

module.exports = { SCOPE_TYPES, createResourceScopeService };
