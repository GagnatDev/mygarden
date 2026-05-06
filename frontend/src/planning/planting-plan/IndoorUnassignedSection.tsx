import type { Planting } from '../../api/plantings';
import { IndoorSection, type IndoorSectionAssignmentFilter } from './IndoorSection';

export function IndoorUnassignedSection({
  sortedIndoorUnassigned,
  locale,
  onOpenRow,
}: {
  indoorUnassignedCount: number;
  sortedIndoorUnassigned: Planting[];
  locale: string;
  onOpenRow: (plantingId: string) => void;
}) {
  // Backwards-compatible wrapper; the page should use IndoorSection directly.
  return (
    <IndoorSection
      indoorPlantings={sortedIndoorUnassigned}
      locale={locale}
      elementLabelById={new Map<string, string>()}
      assignmentFilter={'unassigned' satisfies IndoorSectionAssignmentFilter}
      setAssignmentFilter={() => {}}
      includeTransplanted={true}
      setIncludeTransplanted={() => {}}
      onOpenRow={onOpenRow}
    />
  );
}
