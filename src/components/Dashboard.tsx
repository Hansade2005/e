import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BudgetPage from './BudgetPage';
import InvestmentPage from './InvestmentPage';
import { Button } from './ui/button';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'budget' | 'investments'>('budget');

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Personal Finance Dashboard</h1>
        <div className="flex items-center space-x-4">
          <span>Welcome, {user?.name}</span>
          <Button onClick={logout} variant="outline">Logout</Button>
        </div>
      </header>
      <nav className="bg-white shadow p-4">
        <div className="flex space-x-4">
          <Button
            variant={activeTab === 'budget' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('budget')}
          >
            Budget
          </Button>
          <Button
            variant={activeTab === 'investments' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('investments')}
          >
            Investments
          </Button>
        </div>
      </nav>
      <main className="p-4">
        {activeTab === 'budget' ? <BudgetPage /> : <InvestmentPage />}
      </main>
    </div>
  );
};

export default Dashboard;