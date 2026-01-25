import { DailyReportSheet } from './DailyReportSheet';
import { DailyEntry } from '@/types/petrol-pump';

interface PrintableReportProps {
  entry: DailyEntry;
}

export function PrintableReport({ entry }: PrintableReportProps) {
  return <DailyReportSheet entry={entry} />;
}