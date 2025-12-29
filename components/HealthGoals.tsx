import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle,
  Calendar,
  TrendingUp,
  Award,
  Flame,
  X,
  Pill
} from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState } from './EmptyState';
import { SkeletonLoader } from './SkeletonLoader';
import { handleError } from '../utils/errorHandler';
import { ProgressBar } from './ProgressBar';

interface HealthGoal {
  id: string;
  title: string;
  description: string;
  category: 'WEIGHT' | 'FITNESS' | 'NUTRITION' | 'MEDICATION' | 'GENERAL';
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  createdAt: string;
  completedAt?: string;
  streak?: number;
}

export const HealthGoals: React.FC = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [goals, setGoals] = useState<HealthGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<HealthGoal | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'GENERAL' as HealthGoal['category'],
    targetValue: 0,
    currentValue: 0,
    unit: '',
    deadline: '',
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await (db as any).getHealthGoals?.(user?.id || '') || [];
      setGoals(data);
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.targetValue) {
      notify('Please fill in all required fields', 'warning');
      return;
    }

    try {
      const goalData: HealthGoal = {
        id: editingGoal?.id || Date.now().toString(),
        title: formData.title,
        description: formData.description,
        category: formData.category,
        targetValue: formData.targetValue,
        currentValue: editingGoal?.currentValue || 0,
        unit: formData.unit,
        deadline: formData.deadline,
        status: 'ACTIVE',
        createdAt: editingGoal?.createdAt || new Date().toISOString(),
        streak: editingGoal?.streak || 0,
      };

      if (editingGoal) {
        await (db as any).updateHealthGoal?.(goalData);
        notify('Goal updated successfully', 'success');
      } else {
        await (db as any).createHealthGoal?.(goalData);
        notify('Goal created successfully', 'success');
      }

      setShowForm(false);
      setEditingGoal(null);
      resetForm();
      loadGoals();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const handleUpdateProgress = async (goalId: string, newValue: number) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;

      const updated = {
        ...goal,
        currentValue: newValue,
        status: newValue >= goal.targetValue ? 'COMPLETED' as const : goal.status,
        completedAt: newValue >= goal.targetValue ? new Date().toISOString() : goal.completedAt,
      };

      await (db as any).updateHealthGoal?.(updated);
      notify('Progress updated!', 'success');
      loadGoals();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const handleComplete = async (goalId: string) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      if (goal) {
        const updated = {
          ...goal,
          status: 'COMPLETED' as const,
          completedAt: new Date().toISOString(),
        };
        await (db as any).updateHealthGoal?.(updated);
        notify('Goal completed! 🎉', 'success');
        loadGoals();
      }
    } catch (error) {
      handleError(error, notify);
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      await (db as any).deleteHealthGoal?.(goalId);
      notify('Goal deleted', 'success');
      loadGoals();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'GENERAL',
      targetValue: 0,
      currentValue: 0,
      unit: '',
      deadline: '',
    });
  };

  const getProgress = (goal: HealthGoal): number => {
    if (goal.targetValue === 0) return 0;
    return Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  };

  const activeGoals = goals.filter(g => g.status === 'ACTIVE');
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');
  const totalProgress = goals.length > 0
    ? goals.reduce((sum, g) => sum + getProgress(g), 0) / goals.length
    : 0;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'WEIGHT':
        return TrendingUp;
      case 'FITNESS':
        return Target;
      case 'NUTRITION':
        return Award;
      case 'MEDICATION':
        return Pill;
      default:
        return Target;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'WEIGHT':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'FITNESS':
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'NUTRITION':
        return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
      case 'MEDICATION':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Health Goals</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track your health and wellness goals</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingGoal(null);
            setShowForm(true);
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          New Goal
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Target className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {activeGoals.length}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Goals</p>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {completedGoals.length}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <TrendingUp className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {Math.round(totalProgress)}%
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg Progress</p>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <Flame className="text-orange-600 dark:text-orange-400" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {Math.max(...goals.map(g => g.streak || 0), 0)}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Best Streak</p>
        </div>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Active Goals</h2>
          <div className="space-y-4">
            {activeGoals.map(goal => {
              const progress = getProgress(goal);
              const CategoryIcon = getCategoryIcon(goal.category);
              return (
                <div
                  key={goal.id}
                  className="p-6 bg-gray-50 dark:bg-[#0A0F1C] rounded-2xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-xl ${getCategoryColor(goal.category)}`}>
                        <CategoryIcon size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{goal.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getCategoryColor(goal.category)}`}>
                            {goal.category}
                          </span>
                        </div>
                        {goal.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{goal.description}</p>
                        )}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                              {goal.currentValue} {goal.unit} / {goal.targetValue} {goal.unit}
                            </span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <ProgressBar
                            current={progress}
                            total={100}
                            showLabel={false}
                            color={progress >= 80 ? 'green' : progress >= 50 ? 'orange' : 'blue'}
                          />
                        </div>
                        {goal.deadline && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Calendar size={14} />
                            Deadline: {new Date(goal.deadline).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newValue = prompt(`Update progress (current: ${goal.currentValue} ${goal.unit})`);
                          if (newValue) {
                            handleUpdateProgress(goal.id, parseFloat(newValue));
                          }
                        }}
                        className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => handleComplete(goal.id)}
                        className="px-4 py-2 text-sm font-bold text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Completed Goals 🎉</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedGoals.map(goal => {
              const CategoryIcon = getCategoryIcon(goal.category);
              return (
                <div
                  key={goal.id}
                  className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${getCategoryColor(goal.category)}`}>
                      <CategoryIcon size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{goal.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle size={14} className="text-green-600 dark:text-green-400" />
                    Completed {goal.completedAt && new Date(goal.completedAt).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {goals.length === 0 && (
        <EmptyState
          icon={Target}
          title="No health goals yet"
          description="Set your first health goal to start tracking your progress"
          action={
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              Create Goal
            </button>
          }
        />
      )}

      {/* Goal Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl max-w-2xl w-full animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingGoal ? 'Edit Goal' : 'New Health Goal'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingGoal(null);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Goal Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Lose 10kg"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  placeholder="Describe your goal..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  >
                    <option value="GENERAL">General</option>
                    <option value="WEIGHT">Weight</option>
                    <option value="FITNESS">Fitness</option>
                    <option value="NUTRITION">Nutrition</option>
                    <option value="MEDICATION">Medication</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Target Value *
                  </label>
                  <input
                    type="number"
                    value={formData.targetValue}
                    onChange={(e) => setFormData({ ...formData, targetValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Unit *
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="kg, days, etc."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingGoal(null);
                  resetForm();
                }}
                className="px-6 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-colors"
              >
                {editingGoal ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { db } from '../services/db';

