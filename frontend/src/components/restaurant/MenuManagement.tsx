'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  dietary: string[];
  available: boolean;
  imageUrl?: string;
}

interface MenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  items: MenuItem[];
}

interface MenuManagementProps {
  restaurantId: string;
}

export default function MenuManagement({ restaurantId }: MenuManagementProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Form states
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    dietary: [] as string[],
    available: true
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    displayOrder: 0
  });

  const dietaryOptions = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Nut-Free',
    'Halal',
    'Kosher'
  ];

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`/api/restaurants/${restaurantId}/menu`);
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      const response = await axios.post(`/api/restaurants/${restaurantId}/menu/items`, {
        ...itemForm,
        price: parseFloat(itemForm.price)
      });

      // Add item to the appropriate category
      setCategories(prev => prev.map(cat =>
        cat.id === itemForm.category
          ? { ...cat, items: [...cat.items, response.data.data] }
          : cat
      ));

      // Reset form
      setItemForm({
        name: '',
        description: '',
        price: '',
        category: '',
        dietary: [],
        available: true
      });
      setShowAddItem(false);
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    try {
      const response = await axios.put(
        `/api/restaurants/${restaurantId}/menu/items/${editingItem.id}`,
        {
          ...itemForm,
          price: parseFloat(itemForm.price)
        }
      );

      // Update item in the appropriate category
      setCategories(prev => prev.map(cat => ({
        ...cat,
        items: cat.items.map(item =>
          item.id === editingItem.id ? response.data.data : item
        )
      })));

      setEditingItem(null);
      setItemForm({
        name: '',
        description: '',
        price: '',
        category: '',
        dietary: [],
        available: true
      });
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await axios.delete(`/api/restaurants/${restaurantId}/menu/items/${itemId}`);

      // Remove item from categories
      setCategories(prev => prev.map(cat => ({
        ...cat,
        items: cat.items.filter(item => item.id !== itemId)
      })));
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleAddCategory = async () => {
    try {
      const response = await axios.post(`/api/restaurants/${restaurantId}/menu/categories`, categoryForm);
      setCategories(prev => [...prev, { ...response.data.data, items: [] }]);
      setCategoryForm({ name: '', displayOrder: 0 });
      setShowAddCategory(false);
    } catch (error) {
      console.error('Failed to add category:', error);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await axios.patch(
        `/api/restaurants/${restaurantId}/menu/items/${item.id}/availability`,
        { available: !item.available }
      );

      setCategories(prev => prev.map(cat => ({
        ...cat,
        items: cat.items.map(i =>
          i.id === item.id ? { ...i, available: !i.available } : i
        )
      })));
    } catch (error) {
      console.error('Failed to toggle availability:', error);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading menu...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Menu Management</h2>
        <div className="space-x-4">
          <button
            onClick={() => setShowAddCategory(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Add Category
          </button>
          <button
            onClick={() => setShowAddItem(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <PlusIcon className="h-5 w-5 inline mr-2" />
            Add Item
          </button>
        </div>
      </div>

      {/* Categories and Items */}
      {categories.map((category) => (
        <div key={category.id} className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">{category.name}</h3>

          <div className="space-y-4">
            {category.items.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-4 ${!item.available ? 'bg-gray-50 opacity-60' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-gray-900">{item.name}</h4>
                      {!item.available && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          Unavailable
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mt-1">{item.description}</p>

                    {item.dietary.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.dietary.map((diet) => (
                          <span
                            key={diet}
                            className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded"
                          >
                            {diet}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="text-lg font-bold text-gray-900">
                      ${item.price.toFixed(2)}
                    </span>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        className={`px-3 py-1 rounded text-sm ${
                          item.available
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {item.available ? 'Set Unavailable' : 'Set Available'}
                      </button>

                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setItemForm({
                            name: item.name,
                            description: item.description,
                            price: item.price.toString(),
                            category: item.category,
                            dietary: item.dietary,
                            available: item.available
                          });
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {category.items.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                No items in this category yet
              </p>
            )}
          </div>
        </div>
      ))}

      {/* Add/Edit Item Modal */}
      {(showAddItem || editingItem) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
            </h3>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Item Name"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />

              <textarea
                placeholder="Description"
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
              />

              <input
                type="number"
                placeholder="Price"
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                step="0.01"
              />

              {!editingItem && (
                <select
                  value={itemForm.category}
                  onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dietary Options
                </label>
                <div className="space-y-2">
                  {dietaryOptions.map((option) => (
                    <label key={option} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={itemForm.dietary.includes(option)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setItemForm({ ...itemForm, dietary: [...itemForm.dietary, option] });
                          } else {
                            setItemForm({ ...itemForm, dietary: itemForm.dietary.filter(d => d !== option) });
                          }
                        }}
                        className="mr-2"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowAddItem(false);
                  setEditingItem(null);
                  setItemForm({
                    name: '',
                    description: '',
                    price: '',
                    category: '',
                    dietary: [],
                    available: true
                  });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingItem ? handleUpdateItem : handleAddItem}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {editingItem ? 'Update' : 'Add'} Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add Menu Category</h3>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Category Name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />

              <input
                type="number"
                placeholder="Display Order"
                value={categoryForm.displayOrder}
                onChange={(e) => setCategoryForm({ ...categoryForm, displayOrder: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowAddCategory(false);
                  setCategoryForm({ name: '', displayOrder: 0 });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}