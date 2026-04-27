import { ProjectRole } from '../models/models';

interface RoleSkillOptions {
  fallbackToTitle?: boolean;
}

export function getRoleSkillNames(
  role: Pick<ProjectRole, 'skill_names' | 'skill_name' | 'title'> | null | undefined,
  options: RoleSkillOptions = {}
): string[] {
  const normalized = normalizeSkillList(role?.skill_names);
  if (normalized.length > 0) {
    return normalized;
  }

  const legacySkill = normalizeSingleValue(role?.skill_name);
  if (legacySkill) {
    return [legacySkill];
  }

  if (options.fallbackToTitle) {
    const title = normalizeSingleValue(role?.title);
    if (title) {
      return [title];
    }
  }

  return [];
}

export function getProjectSkillLabels(
  roles: Array<Pick<ProjectRole, 'skill_names' | 'skill_name' | 'title'>> | null | undefined,
  options: RoleSkillOptions = { fallbackToTitle: true }
): string[] {
  if (!roles?.length) {
    return [];
  }

  const labels: string[] = [];
  const seen = new Set<string>();

  for (const role of roles) {
    for (const skill of getRoleSkillNames(role, options)) {
      const key = skill.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      labels.push(skill);
    }
  }

  return labels;
}

export function getProjectCardSkillLabels(
  roles: Array<Pick<ProjectRole, 'skill_names' | 'skill_name' | 'title'>> | null | undefined,
  limit: number = 3,
  options: RoleSkillOptions = { fallbackToTitle: true }
): string[] {
  const labels = getProjectSkillLabels(roles, options);
  if (labels.length <= limit) {
    return labels;
  }

  return [...labels.slice(0, limit), '...'];
}

function normalizeSkillList(skillNames: string[] | null | undefined): string[] {
  if (!Array.isArray(skillNames)) {
    return [];
  }

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const skill of skillNames) {
    const value = normalizeSingleValue(skill);
    if (!value) {
      continue;
    }
    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(value);
  }

  return normalized;
}

function normalizeSingleValue(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}
