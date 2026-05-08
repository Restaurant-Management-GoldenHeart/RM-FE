const normalizeBranchId = (value) => {
  if (value === null || value === undefined || value === '' || value === 'all') {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const getPersistedBranchId = () => {
  try {
    return normalizeBranchId(
      localStorage.getItem('selected_branch_id') ?? localStorage.getItem('lastBranchId')
    );
  } catch {
    return null;
  }
};

export const resolveBranchId = (...candidates) => {
  for (const candidate of candidates) {
    const branchId = normalizeBranchId(candidate);
    if (branchId) {
      return branchId;
    }
  }

  return null;
};
