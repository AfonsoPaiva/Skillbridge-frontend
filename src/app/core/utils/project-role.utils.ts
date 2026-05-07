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
  options: RoleSkillOptions = { fallbackToTitle: true },
  userSkills: string[] = []
): string[] {
  if (!roles?.length) {
    return [];
  }

  const labels: string[] = [];
  const seen = new Set<string>();
  const userSkillsSet = new Set(userSkills.map(s => s.toLowerCase()));

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

  // Se tivermos skills do utilizador, ordenamos para que as correspondentes fiquem primeiro
  if (userSkillsSet.size > 0) {
    labels.sort((a, b) => {
      const aMatched = userSkillsSet.has(a.toLowerCase());
      const bMatched = userSkillsSet.has(b.toLowerCase());
      if (aMatched && !bMatched) return -1;
      if (!aMatched && bMatched) return 1;
      return 0;
    });
  }

  return labels;
}

export function getProjectCardSkillLabels(
  roles: Array<Pick<ProjectRole, 'skill_names' | 'skill_name' | 'title'>> | null | undefined,
  limit: number = 3,
  options: RoleSkillOptions = { fallbackToTitle: true },
  userSkills: string[] = []
): string[] {
  const labels = getProjectSkillLabels(roles, options, userSkills);
  if (labels.length <= limit) {
    return labels;
  }

  return [...labels.slice(0, limit), '...'];
}

export function getProjectCardSkillText(
  roles: Array<Pick<ProjectRole, 'skill_names' | 'skill_name' | 'title'>> | null | undefined,
  options: RoleSkillOptions = { fallbackToTitle: true }
): string {
  return getProjectSkillLabels(roles, options).join(' • ');
}

export function getProjectCardTitle(title: string | null | undefined, limit: number = 80): string {
  return getTextPreview(title, limit);
}

export function getProjectCardDescription(description: string | null | undefined, limit: number = 250): string {
  return getTextPreview(description, limit);
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

function getTextPreview(value: string | null | undefined, limit: number): string {
  const normalized = normalizeSingleValue(value).replace(/\s+/g, ' ');
  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}
