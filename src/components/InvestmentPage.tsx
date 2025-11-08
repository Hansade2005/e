import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, Holding } from '../lib/db';
import { getStockPrice, getCryptoPrice } from '../lib/price';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const InvestmentPage: React.FC = () => {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    symbol: '',
    name: '',
    quantity: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    type: 'stock' as 'stock' | 'crypto',
  });

  useEffect(() => {
    if (user) {
      loadHoldings();
    }
  }, [user]);

  const loadHoldings = async () => {
    if (!user?.id) return;
    const hlds = await db.holdings.where('userId').equals(user.id).toArray();
    setHoldings(hlds);
    // Fetch prices
    const pricePromises = hlds.map(async (h) => {
      const price = h.type === 'stock' ? await getStockPrice(h.symbol) : await getCryptoPrice(h.symbol);
      return { symbol: h.symbol, price };
    });
    const priceResults = await Promise.all(pricePromises);
    const priceMap = priceResults.reduce((acc, { symbol, price }) => {
      if (price) acc[symbol] = price;
      return acc;
    }, {} as Record<string, number>);
    setPrices(priceMap);
  };

  const handleAdd = async () => {
    if (!user?.id) return;
    const newHolding: Omit<Holding, 'id'> = {
      userId: user.id,
      symbol: form.symbol,
      name: form.name,
      quantity: parseFloat(form.quantity),
      purchasePrice: parseFloat(form.purchasePrice),
      purchaseDate: form.purchaseDate,
      type: form.type,
    };
    await db.holdings.add(newHolding);
    setHoldings([...holdings, { ...newHolding, id: Date.now() } as Holding]);
    setForm({
      symbol: '',
      name: '',
      quantity: '',
      purchasePrice: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      type: 'stock',
    });
    setIsAddOpen(false);
    loadHoldings(); // to update prices
  };

  const portfolioValue = holdings.reduce((sum, h) => {
    const price = prices[h.symbol] || h.purchasePrice;
    return sum + h.quantity * price;
  }, 0);

  const totalCost = holdings.reduce((sum, h) => sum + h.quantity * h.purchasePrice, 0);

  const pnl = portfolioValue - totalCost;

  const allocation = holdings.map(h => ({
    name: h.name,
    value: (h.quantity * (prices[h.symbol] || h.purchasePrice)) / portfolioValue * 100,
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">Investments</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>Add Holding</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Holding</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(value: 'stock' | 'crypto') => setForm({...form, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Symbol</Label>
                <Input value={form.symbol} onChange={(e) => setForm({...form, symbol: e.target.value})} />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({...form, quantity: e.target.value})} />
              </div>
              <div>
                <Label>Purchase Price</Label>
                <Input type="number" value={form.purchasePrice} onChange={(e) => setForm({...form, purchasePrice: e.target.value})} />
              </div>
              <div>
                <Label>Purchase Date</Label>
                <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({...form, purchaseDate: e.target.value})} />
              </div>
              <Button onClick={handleAdd}>Add</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl">${portfolioValue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl">${totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${pnl.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={allocation} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {allocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full table-auto">
              <thead>
                <tr>
                  <th className="px-4 py-2">Symbol</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Quantity</th>
                  <th className="px-4 py-2">Current Price</th>
                  <th className="px-4 py-2">Value</th>
                  <th className="px-4 py-2">P&L</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map(h => {
                  const currentPrice = prices[h.symbol] || h.purchasePrice;
                  const value = h.quantity * currentPrice;
                  const hpnl = value - h.quantity * h.purchasePrice;
                  return (
                    <tr key={h.id}>
                      <td className="px-4 py-2">{h.symbol}</td>
                      <td className="px-4 py-2">{h.name}</td>
                      <td className="px-4 py-2">{h.quantity}</td>
                      <td className="px-4 py-2">${currentPrice.toFixed(2)}</td>
                      <td className="px-4 py-2">${value.toFixed(2)}</td>
                      <td className={`px-4 py-2 ${hpnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${hpnl.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvestmentPage;