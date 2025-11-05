import { DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';

export const CurrencyToggle = () => {
  const { currency, setCurrency } = useCurrency();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setCurrency(currency === 'USD' ? 'TRY' : 'USD')}
      className="gap-2"
    >
      <DollarSign className="h-4 w-4" />
      {currency}
    </Button>
  );
};
