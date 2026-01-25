import * as React from 'react';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableCell, TableRow } from '@/components/ui/table';
import type { FuelType } from '@/types/petrol-pump';
import type { TruckChamber } from '@/types/purchase';

type Props = {
  chamber: TruckChamber;
  index: number;
  onFuelTypeChange: (chamberId: string, fuelType: FuelType) => void;
  onCapacityChange: (chamberId: string, capacity: number) => void;
  onCapacityCommit: (capacity: number) => void;
};

export const ChamberConfigRow = React.memo(function ChamberConfigRow({
  chamber,
  index,
  onFuelTypeChange,
  onCapacityChange,
  onCapacityCommit,
}: Props) {
  return (
    <TableRow>
      <TableCell className="font-medium">C{index + 1}</TableCell>
      <TableCell>
        <Select
          value={chamber.fuelType}
          onValueChange={(val) => onFuelTypeChange(chamber.id, val as FuelType)}
        >
          <SelectTrigger className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MS">MS (Petrol)</SelectItem>
            <SelectItem value="HSD">HSD (Diesel)</SelectItem>
            <SelectItem value="POWER">Power</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={chamber.capacity || ''}
          onChange={(e) => {
            const raw = e.target.value;
            onCapacityChange(chamber.id, raw === '' ? 0 : Number(raw));
          }}
          onBlur={(e) => {
            const raw = e.target.value;
            const value = raw === '' ? 0 : Number(raw);
            onCapacityCommit(value);
          }}
          placeholder="e.g., 4000"
          className="h-12"
        />
      </TableCell>
    </TableRow>
  );
});
