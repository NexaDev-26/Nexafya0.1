import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Package,
  Calculator
} from 'lucide-react';
import { InventoryUnit } from '../types';
import { db } from '../services/db';
import { useNotification } from './NotificationSystem';
import { EmptyState } from './EmptyState';
import { SkeletonLoader } from './SkeletonLoader';
import { handleError } from '../utils/errorHandler';

interface UnitConversion {
  id: string;
  fromUnitId: string;
  fromUnitName: string;
  toUnitId: string;
  toUnitName: string;
  conversionFactor: number; // How many fromUnits = 1 toUnit
  description?: string;
}

export const UnitConverter: React.FC = () => {
  const { notify } = useNotification();
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingConversion, setEditingConversion] = useState<UnitConversion | null>(null);

  // Calculator state
  const [calcFromUnit, setCalcFromUnit] = useState('');
  const [calcToUnit, setCalcToUnit] = useState('');
  const [calcValue, setCalcValue] = useState('');
  const [calcResult, setCalcResult] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    fromUnitId: '',
    toUnitId: '',
    conversionFactor: 1,
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const unitsData = await db.getUnits?.() || [];
      setUnits(unitsData);

      const conversionsData = await db.getConversions?.() || [];
      // Map conversion data with unit names
      const mappedConversions = conversionsData.map((conv: any) => ({
        ...conv,
        fromUnitName: unitsData.find(u => u.id === conv.fromUnitId)?.name || 'Unknown',
        toUnitName: unitsData.find(u => u.id === conv.toUnitId)?.name || 'Unknown',
      }));
      setConversions(mappedConversions);
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.fromUnitId || !formData.toUnitId || formData.conversionFactor <= 0) {
      notify('Please fill in all required fields', 'warning');
      return;
    }

    if (formData.fromUnitId === formData.toUnitId) {
      notify('From and To units cannot be the same', 'warning');
      return;
    }

    try {
      const conversionData: Omit<UnitConversion, 'id' | 'fromUnitName' | 'toUnitName'> = {
        fromUnitId: formData.fromUnitId,
        toUnitId: formData.toUnitId,
        conversionFactor: formData.conversionFactor,
        description: formData.description,
      };

      if (editingConversion) {
        await db.updateConversion?.(editingConversion.id, conversionData);
        notify('Conversion updated successfully', 'success');
      } else {
        await db.createConversion?.(conversionData);
        notify('Conversion created successfully', 'success');
      }

      setShowForm(false);
      setEditingConversion(null);
      resetForm();
      loadData();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const resetForm = () => {
    setFormData({
      fromUnitId: '',
      toUnitId: '',
      conversionFactor: 1,
      description: '',
    });
  };

  const handleEdit = (conversion: UnitConversion) => {
    setEditingConversion(conversion);
    setFormData({
      fromUnitId: conversion.fromUnitId,
      toUnitId: conversion.toUnitId,
      conversionFactor: conversion.conversionFactor,
      description: conversion.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversion?')) return;

    try {
      await db.deleteConversion?.(id);
      notify('Conversion deleted', 'success');
      loadData();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const calculateConversion = () => {
    if (!calcFromUnit || !calcToUnit || !calcValue) {
      setCalcResult(null);
      return;
    }

    const value = parseFloat(calcValue);
    if (isNaN(value) || value < 0) {
      notify('Please enter a valid number', 'warning');
      return;
    }

    // Find direct conversion
    let conversion = conversions.find(
      c => c.fromUnitId === calcFromUnit && c.toUnitId === calcToUnit
    );

    if (conversion) {
      setCalcResult(value * conversion.conversionFactor);
      return;
    }

    // Try reverse conversion
    conversion = conversions.find(
      c => c.fromUnitId === calcToUnit && c.toUnitId === calcFromUnit
    );

    if (conversion) {
      setCalcResult(value / conversion.conversionFactor);
      return;
    }

    // Try finding path through intermediate units
    const path = findConversionPath(calcFromUnit, calcToUnit);
    if (path) {
      let result = value;
      for (const step of path) {
        result = result * step.factor;
      }
      setCalcResult(result);
      return;
    }

    notify('No conversion path found between these units', 'warning');
    setCalcResult(null);
  };

  const findConversionPath = (from: string, to: string): Array<{ factor: number }> | null => {
    // Simple BFS to find conversion path
    const visited = new Set<string>();
    const queue: Array<{ unit: string; path: Array<{ factor: number }> }> = [{ unit: from, path: [] }];

    while (queue.length > 0) {
      const { unit, path } = queue.shift()!;

      if (unit === to) {
        return path;
      }

      if (visited.has(unit)) continue;
      visited.add(unit);

      for (const conv of conversions) {
        if (conv.fromUnitId === unit && !visited.has(conv.toUnitId)) {
          queue.push({
            unit: conv.toUnitId,
            path: [...path, { factor: conv.conversionFactor }],
          });
        }
        if (conv.toUnitId === unit && !visited.has(conv.fromUnitId)) {
          queue.push({
            unit: conv.fromUnitId,
            path: [...path, { factor: 1 / conv.conversionFactor }],
          });
        }
      }
    }

    return null;
  };

  useEffect(() => {
    if (calcFromUnit && calcToUnit && calcValue) {
      calculateConversion();
    } else {
      setCalcResult(null);
    }
  }, [calcFromUnit, calcToUnit, calcValue, conversions]);

  if (loading) {
    return <SkeletonLoader type="table" count={5} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Unit Conversions</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage unit conversion factors for inventory</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingConversion(null);
            setShowForm(true);
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Conversion
        </button>
      </div>

      {/* Calculator */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="text-blue-600 dark:text-blue-400" size={20} />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Unit Calculator</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
              From
            </label>
            <input
              type="number"
              value={calcValue}
              onChange={(e) => setCalcValue(e.target.value)}
              placeholder="Enter value"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Unit
            </label>
            <select
              value={calcFromUnit}
              onChange={(e) => setCalcFromUnit(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            >
              <option value="">Select unit</option>
              {units.map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-center">
            <ArrowLeftRight className="text-gray-400" size={24} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
              To Unit
            </label>
            <select
              value={calcToUnit}
              onChange={(e) => setCalcToUnit(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            >
              <option value="">Select unit</option>
              {units.map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Result
            </label>
            <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-600 dark:text-blue-400 font-bold text-lg">
              {calcResult !== null ? calcResult.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---'}
            </div>
          </div>
        </div>
      </div>

      {/* Conversions List */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {conversions.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No conversions defined"
            description="Create unit conversions to enable automatic conversions in inventory"
            action={
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Add Conversion
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0A0F1C] border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">From Unit</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">To Unit</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Conversion Factor</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {conversions.map((conversion) => (
                  <tr key={conversion.id} className="hover:bg-gray-50 dark:hover:bg-[#0A0F1C] transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                      {conversion.fromUnitName}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                      {conversion.toUnitName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-mono">
                        1 {conversion.fromUnitName} = {conversion.conversionFactor} {conversion.toUnitName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {conversion.description || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(conversion)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(conversion.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Conversion Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl max-w-2xl w-full animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingConversion ? 'Edit Conversion' : 'Add Conversion'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingConversion(null);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    From Unit *
                  </label>
                  <select
                    value={formData.fromUnitId}
                    onChange={(e) => setFormData({ ...formData, fromUnitId: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  >
                    <option value="">Select Unit</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    To Unit *
                  </label>
                  <select
                    value={formData.toUnitId}
                    onChange={(e) => setFormData({ ...formData, toUnitId: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  >
                    <option value="">Select Unit</option>
                    {units.filter(u => u.id !== formData.fromUnitId).map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Conversion Factor *
                  <span className="text-xs text-gray-500 ml-2">
                    (How many "From Units" = 1 "To Unit")
                  </span>
                </label>
                <input
                  type="number"
                  value={formData.conversionFactor}
                  onChange={(e) => setFormData({ ...formData, conversionFactor: parseFloat(e.target.value) || 0 })}
                  min="0.0001"
                  step="0.0001"
                  placeholder="e.g., 10 (10 pieces = 1 box)"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
                {formData.fromUnitId && formData.toUnitId && formData.conversionFactor > 0 && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-bold">
                      1 {units.find(u => u.id === formData.toUnitId)?.name} = {formData.conversionFactor} {units.find(u => u.id === formData.fromUnitId)?.name}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="e.g., Standard box conversion"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingConversion(null);
                  resetForm();
                }}
                className="px-6 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2"
              >
                <Save size={18} />
                {editingConversion ? 'Update Conversion' : 'Add Conversion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

