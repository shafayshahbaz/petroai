import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="font-medium">
            {language === 'en' ? 'EN' : 'हिं'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setLanguage('en')}
          className={cn(language === 'en' && 'bg-accent')}
        >
          <span className="mr-2">🇬🇧</span>
          English
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('hi')}
          className={cn(language === 'hi' && 'bg-accent')}
        >
          <span className="mr-2">🇮🇳</span>
          हिंदी
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
