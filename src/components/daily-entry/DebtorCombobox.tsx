import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { Debtor } from '@/types/petrol-pump';

interface DebtorComboboxProps {
  value?: string;
  onSelect: (debtor: Debtor) => void;
}

export function DebtorCombobox({ value, onSelect }: DebtorComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { debtors, addDebtor } = usePetrolPumpStore();

  const filteredDebtors = useMemo(() => {
    if (!searchQuery) return debtors;
    return debtors.filter((d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [debtors, searchQuery]);

  const selectedDebtor = debtors.find((d) => d.id === value);
  
  const exactMatch = debtors.find(
    (d) => d.name.toLowerCase() === searchQuery.toLowerCase()
  );

  const handleCreateNew = () => {
    if (searchQuery.trim()) {
      const newDebtor = addDebtor(searchQuery.trim());
      onSelect(newDebtor);
      setSearchQuery('');
      setOpen(false);
    }
  };

  const handleSelect = (debtor: Debtor) => {
    onSelect(debtor);
    setSearchQuery('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10"
        >
          {selectedDebtor ? selectedDebtor.name : "Select debtor..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type new name..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty className="py-2">
              {searchQuery && !exactMatch && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-primary"
                  onClick={handleCreateNew}
                >
                  <UserPlus className="h-4 w-4" />
                  Create new: "{searchQuery}"
                </Button>
              )}
              {!searchQuery && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  Type a name to search or create
                </p>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredDebtors.map((debtor) => (
                <CommandItem
                  key={debtor.id}
                  value={debtor.id}
                  onSelect={() => handleSelect(debtor)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === debtor.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{debtor.name}</span>
                    {debtor.totalOutstanding > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Outstanding: ₹{debtor.totalOutstanding.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {searchQuery && !exactMatch && filteredDebtors.length > 0 && (
              <CommandGroup>
                <CommandItem
                  value="create-new"
                  onSelect={handleCreateNew}
                  className="text-primary"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create new: "{searchQuery}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}