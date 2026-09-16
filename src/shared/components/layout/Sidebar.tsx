import { BarChart3, BookOpen, BrainCircuit, Calendar as CalendarIcon, History, LayoutDashboard, Target } from 'lucide-react';
import { NavLink } from 'react-router';

import { STUDY_METHODS } from '@/lib/constants';
import type { StudyMethod } from '@shared/types';

const NAV_ITEMS = [
  { to: '/review', label: 'Review Bank', icon: BrainCircuit, end: true },
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/subjects', label: 'Subjects', icon: BookOpen, end: false },
  { to: '/sessions', label: 'Sessions', icon: History, end: false },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon, end: false },
  { to: '/goals', label: 'Goals', icon: Target, end: false },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, end: false },
];

const METHOD_ORDER: StudyMethod[] = [
  'pomodoro',
  'flowtime',
  'deep_work',
  'active_recall',
  'blurting',
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
    isActive ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
  }`;

export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-6 border-r border-border bg-card p-4">
      <span className="px-2 font-display text-lg font-medium">StudyFlow</span>

      <nav className="space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={navLinkClass}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div>
        <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Start studying</p>
        <nav className="mt-2 space-y-1">
          {METHOD_ORDER.map((method) => (
            <NavLink key={method} to={`/study/${method}`} className={navLinkClass}>
              <span className={`h-2 w-2 rounded-full ${STUDY_METHODS[method].dotClass}`} />
              {STUDY_METHODS[method].label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
