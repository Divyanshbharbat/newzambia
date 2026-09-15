import React, { useState, useEffect } from "react";
import axios from "axios";

interface InventoryItem {
  id: number;
  itemName: string;
  category: string;
  gender: string | null;
  size: string | null;
  price: number;
  quantity: number | null;
  description: string | null;
}

const InventoryManagement: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [customCategory, setCustomCategory] = useState("");

  const [formData, setFormData] = useState({
    itemName: "",
    category: "Uniform",
    gender: "All",
    size: "",
    price: "",
    quantity: "",
    description: "",
  });

  const categories = [
    "Uniform",
    "Shoes",
    "Books",
    "Stationery",
    "Accessories",
    "Other",
  ];

  const genders = ["All", "Male", "Female"];
  const availableSizes = [
    "24", "26", "28", "30", "32", "34", "36", "38", "40", "42",
    "6", "7", "8", "9", "10", "11", "12",
    "XS", "S", "M", "L", "XL", "XXL", "XXXL"
  ];

  // Fetch all inventory items
  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`http://${window.location.hostname}:5000/inventory`);
      setItems(response.data);
    } catch (error) {
      alert("Error fetching inventory");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSize = (size: string) => {
    const currentSizes = formData.size ? formData.size.split(",").map(s => s.trim()).filter(s => s) : [];
    let newSizes;
    if (currentSizes.includes(size)) {
      newSizes = currentSizes.filter(s => s !== size);
    } else {
      newSizes = [...currentSizes, size];
    }
    setFormData({ ...formData, size: newSizes.join(",") });
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalCategory = formData.category === "Other"
      ? (customCategory.trim() || "Other")
      : formData.category;

    const payload = {
      ...formData,
      category: finalCategory
    };

    try {
      if (editingId) {
        // Update item
        await axios.put(
          `http://${window.location.hostname}:5000/inventory/${editingId}`,
          payload
        );
        alert("Item updated successfully");
      } else {
        // Create new item
        await axios.post(`http://${window.location.hostname}:5000/inventory`, payload);
        alert("Item created successfully");
      }
      resetForm();
      fetchInventory();
    } catch (error) {
      alert("Error saving item");
      console.error(error);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    const isStandardCategory = categories.includes(item.category) && item.category !== "Other";
    setFormData({
      itemName: item.itemName,
      category: isStandardCategory ? item.category : "Other",
      gender: item.gender || "All",
      size: item.size || "",
      price: item.price.toString(),
      quantity: item.quantity?.toString() || "",
      description: item.description || "",
    });
    if (!isStandardCategory) {
      setCustomCategory(item.category);
    } else {
      setCustomCategory("");
    }
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this item?")) {
      return;
    }

    try {
      await axios.delete(`http://${window.location.hostname}:5000/inventory/${id}`);
      alert("Item deleted successfully");
      // Update local state immediately
      setItems(items.filter(item => item.id !== id));
      // Then fetch fresh data from server
      await fetchInventory();
    } catch (error) {
      alert("Error deleting item");
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      itemName: "",
      category: "Uniform",
      gender: "All",
      size: "",
      price: "",
      quantity: "",
      description: "",
    });
    setCustomCategory("");
    setEditingId(null);
    setShowForm(false);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.itemName
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "All" || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return <div style={{ padding: "20px" }}>Loading inventory...</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Inventory Management</h1>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          {showForm ? "Cancel" : "Add New Item"}
        </button>
      </div>

      {showForm && (
        <div
          style={{
            backgroundColor: "#f9f9f9",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid #ddd",
          }}
        >
          <h2>{editingId ? "Edit Item" : "Add New Item"}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "15px" }}>
              <label>Item Name (Optional)</label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "5px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "5px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {formData.category === "Other" && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category name"
                  style={{
                    width: "100%",
                    padding: "8px",
                    marginTop: "8px",
                    borderRadius: "4px",
                    border: "1px solid #007bff",
                    backgroundColor: "#ffffff"
                  }}
                />
              )}
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Gender</label>
              <select
                name="gender"
                value={(formData as any).gender}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "5px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                }}
              >
                {genders.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Available Sizes (Select multiple)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
                {availableSizes.map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleSize(sz)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      border: '1px solid #007bff',
                      backgroundColor: formData.size.split(',').includes(sz) ? '#007bff' : 'transparent',
                      color: formData.size.split(',').includes(sz) ? 'white' : '#007bff',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {sz}
                  </button>
                ))}
              </div>
              <input
                type="text"
                name="size"
                value={formData.size}
                onChange={handleInputChange}
                placeholder="Or type custom sizes (comma separated)"
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "10px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Price (₹) (Optional)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                step="0.01"
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "5px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Quantity</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "5px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "5px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  fontFamily: "Arial",
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                padding: "10px 20px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
                marginRight: "10px",
              }}
            >
              {editingId ? "Update Item" : "Add Item"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              style={{
                padding: "10px 20px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              Reset
            </button>
          </form>
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "10px",
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
        />

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "4px",
            border: "1px solid #ddd",
            marginBottom: "10px",
          }}
        >
          <option value="All">All Categories</option>
          {Array.from(new Set([...categories.filter(c => c !== "Other"), ...items.map(i => i.category)])).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            backgroundColor: "#fff",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#f0f0f0",
                borderBottom: "2px solid #ddd",
              }}
            >
              <th style={{ padding: "12px", textAlign: "left" }}>Item Name</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Category</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Gender</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Size</th>
              <th style={{ padding: "12px", textAlign: "center" }}>Price (₹)</th>
              <th style={{ padding: "12px", textAlign: "center" }}>Quantity</th>
              <th style={{ padding: "12px", textAlign: "left" }}>
                Description
              </th>
              <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "12px" }}>{item.itemName}</td>
                <td style={{ padding: "12px" }}>{item.category}</td>
                <td style={{ padding: "12px" }}>{(item as any).gender || "-"}</td>
                <td style={{ padding: "12px" }}>{(item as any).size || "-"}</td>
                <td style={{ padding: "12px", textAlign: "center" }}>
                  ₹{item.price.toFixed(2)}
                </td>
                <td style={{ padding: "12px", textAlign: "center" }}>
                  {item.quantity || "-"}
                </td>
                <td style={{ padding: "12px" }}>
                  {item.description || "-"}
                </td>
                <td style={{ padding: "12px", textAlign: "center" }}>
                  <button
                    onClick={() => handleEdit(item)}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#ffc107",
                      color: "black",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      marginRight: "5px",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredItems.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            color: "#666",
            backgroundColor: "#f9f9f9",
            borderRadius: "4px",
            marginTop: "20px",
          }}
        >
          No items found
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
