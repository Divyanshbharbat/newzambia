import React, { useEffect, useState } from "react";
import {
  fetchBusStations,
  createBusStation,
  updateBusStation,
  deleteBusStation,
} from "../../apis/api";
import "../../styles/bus.css";

interface BusStation {
  id: number;
  stationName: string;
  price: number;
  description?: string;
}

const BusManagement: React.FC = () => {
  const [busStations, setBusStations] = useState<BusStation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    stationName: "",
    price: "",
    description: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadBusStations();
  }, []);

  const loadBusStations = async () => {
    try {
      const data = await fetchBusStations();
      setBusStations(data);
      setError("");
    } catch (err) {
      setError("Failed to load bus stations");
      console.error(err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddStation = () => {
    setFormData({ stationName: "", price: "", description: "" });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEditStation = (station: BusStation) => {
    setFormData({
      stationName: station.stationName,
      price: station.price.toString(),
      description: station.description || "",
    });
    setEditingId(station.id);
    setShowForm(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.stationName.trim()) {
        setError("Station name is required");
        return;
      }
      if (!formData.price || parseFloat(formData.price) <= 0) {
        setError("Price must be greater than 0");
        return;
      }

      if (editingId) {
        await updateBusStation(editingId, {
          stationName: formData.stationName,
          price: parseFloat(formData.price),
          description: formData.description || null,
        });
        setSuccess("Bus station updated successfully");
      } else {
        await createBusStation({
          stationName: formData.stationName,
          price: parseFloat(formData.price),
          description: formData.description || null,
        });
        setSuccess("Bus station created successfully");
      }

      setShowForm(false);
      setFormData({ stationName: "", price: "", description: "" });
      loadBusStations();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save bus station");
      console.error(err);
    }
  };

  const handleDeleteStation = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this bus station?")) {
      try {
        await deleteBusStation(id);
        setSuccess("Bus station deleted successfully");
        loadBusStations();

        setTimeout(() => setSuccess(""), 3000);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to delete bus station");
        console.error(err);
      }
    }
  };

  const filteredStations = busStations.filter((station) =>
    station.stationName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="busManagementContainer">
      <h2>Bus Station Management</h2>

      {error && <div className="errorMessage">{error}</div>}
      {success && <div className="successMessage">{success}</div>}

      <div className="busManagementHeader">
        <button className="addButton" onClick={handleAddStation}>
          + Add Bus Station
        </button>
        <input
          type="text"
          placeholder="Search station..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="searchInput"
        />
      </div>

      {showForm && (
        <div className="busFormContainer">
          <h3>{editingId ? "Edit Bus Station" : "Add New Bus Station"}</h3>
          <form onSubmit={handleSubmitForm}>
            <div className="formGroup">
              <label>Station Name *</label>
              <input
                type="text"
                name="stationName"
                value={formData.stationName}
                onChange={handleInputChange}
                placeholder="e.g., City Center, Airport Road"
                className="formInput"
              />
            </div>

            <div className="formGroup">
              <label>Price (Annual) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="e.g., 5000"
                step="0.01"
                className="formInput"
              />
            </div>

            <div className="formGroup">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="e.g., Route details, landmarks"
                rows={3}
                className="formInput"
              />
            </div>

            <div className="formButtons">
              <button type="submit" className="submitButton">
                {editingId ? "Update" : "Create"} Station
              </button>
              <button
                type="button"
                className="cancelButton"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="busStationsTable">
        <h3>Available Bus Stations</h3>
        {filteredStations.length === 0 ? (
          <p className="noData">No bus stations found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Station Name</th>
                <th>Annual Price</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStations.map((station) => (
                <tr key={station.id}>
                  <td>{station.stationName}</td>
                  <td>₹{station.price.toFixed(2)}</td>
                  <td>{station.description || "-"}</td>
                  <td className="actionButtons">
                    <button
                      className="editButton"
                      onClick={() => handleEditStation(station)}
                    >
                      Edit
                    </button>
                    <button
                      className="deleteButton"
                      onClick={() => handleDeleteStation(station.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BusManagement;
