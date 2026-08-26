/**
 * MedFind Database API Client (PostgreSQL / Render Backend Ready)
 * 
 * Provides a clean interface for data operations (Pharmacies, Inventory, Reservations).
 * Defaults to live simulated data and seamlessly connects to a Render PostgreSQL API once configured.
 */

class MedFindDatabaseService {
  constructor() {
    this.apiUrl = null;
    this.apiKey = null;
    
    // In-memory data store for live prototype operations
    this.pharmacies = [
      { id: 'p1', name: 'CityCare Pharmacy', distance: '0.8 km', open: 'Open until 10:30 PM', stock: 8, fresh: '5 min ago', price: '₹32', state: 'good' },
      { id: 'p2', name: 'HealthPlus Medicals', distance: '1.4 km', open: 'Open until 9:45 PM', stock: 3, fresh: '18 min ago', price: '₹30', state: 'good' },
      { id: 'p3', name: 'GreenCross Pharmacy', distance: '1.8 km', open: 'Open until 10:00 PM', stock: 1, fresh: '1 hr ago', price: '₹31', state: 'warn' },
      { id: 'p4', name: 'MediPoint', distance: '2.2 km', open: 'Closed', stock: 0, fresh: '2 hrs ago', price: '—', state: 'out' }
    ];

    this.inventory = [
      { id: 'i1', name: 'Paracetamol 500 mg', stock: 8, unit: 'units', fresh: '5 min ago', state: 'good' },
      { id: 'i2', name: 'Azithromycin 500 mg', stock: 3, unit: 'strips', fresh: '18 min ago', state: 'good' },
      { id: 'i3', name: 'Cetirizine 10 mg', stock: 1, unit: 'strips', fresh: '1 hr ago', state: 'warn' },
      { id: 'i4', name: 'Pantoprazole 40 mg', stock: 12, unit: 'strips', fresh: '9 min ago', state: 'good' },
      { id: 'i5', name: 'ORS Sachets', stock: 5, unit: 'packs', fresh: '12 min ago', state: 'good' },
      { id: 'i6', name: 'Amoxicillin 500 mg', stock: 2, unit: 'strips', fresh: '45 min ago', state: 'warn' }
    ];

    this.requests = [
      { id: 'MF1024', item: 'Paracetamol 500 mg × 2', status: 'Pending' },
      { id: 'MF1020', item: 'Azithromycin 500 mg × 1', status: 'Confirmed' },
      { id: 'MF1017', item: 'ORS Sachets × 1', status: 'Ready' }
    ];
  }

  /**
   * Configure Render PostgreSQL Backend Connection
   * @param {string} url - Render API URL (e.g. https://medfind-db.onrender.com/api)
   * @param {string} key - API Authorization Key
   */
  setPostgresApiUrl(url, key = '') {
    this.apiUrl = url;
    this.apiKey = key;
    console.log(`🔌 MedFind DB Service connected to PostgreSQL endpoint: ${url}`);
  }

  async getPharmacies(medicineName) {
    if (this.apiUrl) {
      try {
        const res = await fetch(`${this.apiUrl}/pharmacies?medicine=${encodeURIComponent(medicineName)}`, {
          headers: this.getHeaders()
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('PostgreSQL endpoint unavailable, using local store:', err);
      }
    }
    return this.pharmacies;
  }

  async getInventory() {
    if (this.apiUrl) {
      try {
        const res = await fetch(`${this.apiUrl}/inventory`, { headers: this.getHeaders() });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('PostgreSQL endpoint unavailable, using local store:', err);
      }
    }
    return this.inventory;
  }

  async updateStock(itemIndex) {
    const item = this.inventory[itemIndex];
    if (item) {
      item.stock++;
      item.fresh = 'just now';
      item.state = item.stock <= 2 ? 'warn' : 'good';
    }

    if (this.apiUrl && item) {
      try {
        await fetch(`${this.apiUrl}/inventory/${item.id}`, {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: JSON.stringify({ stock: item.stock })
        });
      } catch (err) {
        console.warn('PostgreSQL update error:', err);
      }
    }

    return item;
  }

  async getRequests() {
    if (this.apiUrl) {
      try {
        const res = await fetch(`${this.apiUrl}/requests`, { headers: this.getHeaders() });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('PostgreSQL endpoint unavailable, using local store:', err);
      }
    }
    return this.requests;
  }

  async confirmRequest(index) {
    const req = this.requests[index];
    if (req) {
      req.status = 'Confirmed';
    }

    if (this.apiUrl && req) {
      try {
        await fetch(`${this.apiUrl}/requests/${req.id}`, {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: JSON.stringify({ status: 'Confirmed' })
        });
      } catch (err) {
        console.warn('PostgreSQL confirm error:', err);
      }
    }

    return req;
  }

  async addReservation(reservation) {
    this.requests.unshift({
      id: reservation.id,
      item: `${reservation.medicine} × ${reservation.qty}`,
      status: 'Pending'
    });

    if (this.apiUrl) {
      try {
        await fetch(`${this.apiUrl}/reservations`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(reservation)
        });
      } catch (err) {
        console.warn('PostgreSQL save reservation error:', err);
      }
    }
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
    };
  }
}

// Export Singleton Instance
export const dbService = new MedFindDatabaseService();
window.dbService = dbService;
