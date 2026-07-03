import {
  CEFR_LABELS,
  LESSON_STATUS_LABELS,
  SKILL_LABELS,
} from '@/lib/utils';
import type { CefrLevel, LessonStatus, Skill } from '@/lib/types';
import { Badge, type BadgeTone } from './Badge';

const levelTones: Record<CefrLevel, BadgeTone> = {
  PreA1: 'gray',
  A1: 'blue',
  A2: 'blue',
  B1: 'brand',
  B2: 'brand',
  C1: 'accent',
  C2: 'accent',
};

export function LevelBadge({ level }: { level: CefrLevel | null }) {
  if (!level) return <Badge tone="gray">Seviye belirlenmedi</Badge>;
  return (
    <Badge tone={levelTones[level]}>
      {level === 'PreA1' ? 'Pre-A1' : level} · {CEFR_LABELS[level]}
    </Badge>
  );
}

export function SkillBadge({ skill }: { skill: Skill }) {
  return <Badge tone="brand">{SKILL_LABELS[skill]}</Badge>;
}

const statusTones: Record<LessonStatus, BadgeTone> = {
  scheduled: 'blue',
  completed: 'green',
  cancelled: 'gray',
  no_show: 'red',
};

export function LessonStatusBadge({ status }: { status: LessonStatus }) {
  return <Badge tone={statusTones[status]}>{LESSON_STATUS_LABELS[status]}</Badge>;
}
