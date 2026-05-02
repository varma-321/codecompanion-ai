import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ShoppingBag, Zap, Shield, Flame, Palette, Sparkles, 
  Lock, Check, Coins, Star, Loader2, Award, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: React.ReactNode;
  category: 'boost' | 'cosmetic' | 'protection';
  owned?: boolean;
}

const STORE_ITEMS: StoreItem[] = [
  {
    id: 'streak-freeze',
    name: 'Streak Freeze',
    description: 'Keep your streak alive if you miss a day of practice.',
    price: 500,
    icon: <Shield className="h-5 w-5 text-blue-400" />,
    category: 'protection'
  },
  {
    id: 'double-xp',
    name: '2x XP Boost',
    description: 'Earn double experience points for the next 24 hours.',
    price: 300,
    icon: <Zap className="h-5 w-5 text-yellow-400" />,
    category: 'boost'
  },
  {
    id: 'midnight-theme',
    name: 'Midnight Glass Theme',
    description: 'Unlock the premium translucent dark mode aesthetic.',
    price: 1000,
    icon: <Palette className="h-5 w-5 text-purple-400" />,
    category: 'cosmetic'
  },
  {
    id: 'daily-bonus',
    name: 'Daily Bonus Key',
    description: 'Unlock an extra daily challenge for more practice.',
    price: 200,
    icon: <Star className="h-5 w-5 text-emerald-400" />,
    category: 'boost'
  }
];

const RewardsStore = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(1250); // Mock balance
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);

  const handlePurchase = (item: StoreItem) => {
    if (balance < item.price) {
      toast.error("Insufficient XP! Solve more problems to earn more.");
      return;
    }
    
    setPurchasing(item.id);
    setTimeout(() => {
      setBalance(prev => prev - item.price);
      setOwnedItems(prev => [...prev, item.id]);
      setPurchasing(null);
      toast.success(`Purchased ${item.name}!`);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/modules')} className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Rewards Store</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-border">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-black tabular-nums">{balance} XP</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Hero Section */}
        <div className="relative rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-8 overflow-hidden border border-primary/10">
          <div className="relative z-10 max-w-lg space-y-4">
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">Limited Time Deals</Badge>
            <h2 className="text-3xl font-black tracking-tight leading-none">Power up your <br />learning journey.</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Use the XP you've earned from solving problems to unlock streak protection, 
              aesthetic themes, and performance boosters.
            </p>
          </div>
          <Award className="absolute -right-8 -bottom-8 w-48 h-48 text-primary/5 -rotate-12" />
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(['protection', 'boost', 'cosmetic'] as const).map(cat => (
            <div key={cat} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {cat === 'protection' ? 'Integrity & Protection' : cat === 'boost' ? 'Growth Boosters' : 'Visual Customization'}
                </h3>
                <span className="text-[10px] text-muted-foreground font-bold">{STORE_ITEMS.filter(i => i.category === cat).length} items</span>
              </div>
              
              <div className="space-y-3">
                {STORE_ITEMS.filter(i => i.category === cat).map(item => {
                  const isOwned = ownedItems.includes(item.id);
                  const isPurchasing = purchasing === item.id;
                  
                  return (
                    <Card key={item.id} className={`group border-border transition-all duration-300 ${isOwned ? 'bg-secondary/20 opacity-80' : 'hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5'}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className={`p-2.5 rounded-xl bg-secondary transition-colors group-hover:bg-primary/10`}>
                            {item.icon}
                          </div>
                          {isOwned ? (
                            <Badge variant="outline" className="text-success border-success/30 bg-success/5 gap-1">
                              <Check className="h-3 w-3" /> Owned
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-1 text-sm font-black text-foreground">
                              <Coins className="h-3.5 w-3.5 text-yellow-500" />
                              {item.price}
                            </div>
                          )}
                        </div>
                        <CardTitle className="text-[15px] mt-4">{item.name}</CardTitle>
                        <CardDescription className="text-xs leading-relaxed">{item.description}</CardDescription>
                      </CardHeader>
                      <CardFooter>
                        <Button 
                          onClick={() => handlePurchase(item)} 
                          disabled={isOwned || isPurchasing || balance < item.price}
                          className="w-full h-9 text-xs font-bold gap-2"
                          variant={isOwned ? 'secondary' : 'default'}
                        >
                          {isPurchasing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isOwned ? 'Already in Inventory' : 'Purchase Item'}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Heart className="h-4 w-4" />
            <span className="text-xs">Solve more problems to earn more XP!</span>
          </div>
          <p className="text-[10px] text-muted-foreground/50 max-w-xs uppercase tracking-widest font-bold">
            Store items are non-refundable. New items are added every Sunday.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RewardsStore;
