# 📚 API ENDPOINTS REFERENCE

Quick reference for all new API endpoints.

---

## 💳 SAVED CARDS API

### **Save a Card**
```http
POST /api/v1/saved-cards
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentMethodId": "pm_1234567890",
  "setAsDefault": true
}
```

### **List All Cards**
```http
GET /api/v1/saved-cards
Authorization: Bearer <token>
```

### **Get Default Card**
```http
GET /api/v1/saved-cards/default
Authorization: Bearer <token>
```

### **Set Card as Default**
```http
PUT /api/v1/saved-cards/{id}/set-default
Authorization: Bearer <token>
```

### **Delete Card**
```http
DELETE /api/v1/saved-cards/{id}
Authorization: Bearer <token>
```

---

## 📄 BILLS API

### **Upload Bill**
```http
POST /api/v1/bills
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
billNumber: INV-001
expenseId: 123
categoryId: 5
merchant: Amazon
amount: 99.99
currency: USD
billDate: 2025-01-15
notes: Office supplies
companyId: 0 (optional, 0 for personal)
```

### **List Bills**
```http
GET /api/v1/bills?companyId=0
Authorization: Bearer <token>
```

### **Search Bills**
```http
GET /api/v1/bills/search?billNumber=INV&merchant=amazon&categoryId=5&startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer <token>
```

### **Get Bill Details**
```http
GET /api/v1/bills/{id}
Authorization: Bearer <token>
```

### **Download Bill**
```http
GET /api/v1/bills/{id}/download
Authorization: Bearer <token>
```

### **Delete Bill**
```http
DELETE /api/v1/bills/{id}
Authorization: Bearer <token>
```

---

## 🔍 EXPENSE SEARCH API

### **Search Expenses**
```http
GET /api/v1/expenses/search?categoryId=5&currency=USD&merchant=amazon&description=office&minAmount=50&maxAmount=500&startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer <token>
X-Company-Id: 0 (optional header)
```

**Query Parameters:**
- `categoryId` - Filter by category ID
- `currency` - Filter by currency code (USD, EUR, etc.)
- `merchant` - Search merchant name (partial match)
- `description` - Search description (partial match)
- `minAmount` - Minimum amount
- `maxAmount` - Maximum amount
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)

---

## 📱 MOBILE INTEGRATION EXAMPLES

### **TypeScript/React Native**

#### **Bill Service**
```typescript
// billService.ts
import { api } from './client';

export const BillService = {
  async uploadBill(file: File, data: BillUploadData) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('billNumber', data.billNumber);
    formData.append('merchant', data.merchant);
    formData.append('amount', data.amount.toString());
    formData.append('currency', data.currency);
    formData.append('billDate', data.billDate);
    
    const response = await api.post('/api/v1/bills', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async searchBills(filters: BillSearchFilters) {
    const params = new URLSearchParams();
    if (filters.billNumber) params.append('billNumber', filters.billNumber);
    if (filters.merchant) params.append('merchant', filters.merchant);
    if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const response = await api.get(`/api/v1/bills/search?${params}`);
    return response.data;
  },

  async downloadBill(id: number) {
    const response = await api.get(`/api/v1/bills/${id}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }
};
```

#### **Saved Card Service**
```typescript
// savedCardService.ts
import { api } from './client';

export const SavedCardService = {
  async saveCard(paymentMethodId: string, setAsDefault: boolean = false) {
    const response = await api.post('/api/v1/saved-cards', {
      paymentMethodId,
      setAsDefault
    });
    return response.data;
  },

  async listCards() {
    const response = await api.get('/api/v1/saved-cards');
    return response.data;
  },

  async getDefaultCard() {
    const response = await api.get('/api/v1/saved-cards/default');
    return response.data;
  },

  async setDefaultCard(id: number) {
    const response = await api.put(`/api/v1/saved-cards/${id}/set-default`);
    return response.data;
  },

  async deleteCard(id: number) {
    await api.delete(`/api/v1/saved-cards/${id}`);
  }
};
```

#### **Expense Search Service**
```typescript
// expenseService.ts (add to existing)
export const ExpenseService = {
  // ... existing methods ...

  async searchExpenses(filters: ExpenseSearchFilters) {
    const params = new URLSearchParams();
    if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
    if (filters.currency) params.append('currency', filters.currency);
    if (filters.merchant) params.append('merchant', filters.merchant);
    if (filters.description) params.append('description', filters.description);
    if (filters.minAmount) params.append('minAmount', filters.minAmount.toString());
    if (filters.maxAmount) params.append('maxAmount', filters.maxAmount.toString());
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const response = await api.get(`/api/v1/expenses/search?${params}`, {
      headers: filters.companyId ? { 'X-Company-Id': filters.companyId } : {}
    });
    return response.data;
  }
};
```

---

## 🧪 CURL TESTING EXAMPLES

### **Test Bill Upload**
```bash
curl -X POST http://localhost:18080/api/v1/bills \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@receipt.pdf" \
  -F "billNumber=INV-001" \
  -F "merchant=Amazon" \
  -F "amount=99.99" \
  -F "currency=USD" \
  -F "billDate=2025-01-15"
```

### **Test Bill Search**
```bash
curl "http://localhost:18080/api/v1/bills/search?merchant=amazon&startDate=2025-01-01" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Test Save Card**
```bash
curl -X POST http://localhost:18080/api/v1/saved-cards \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethodId": "pm_1234567890",
    "setAsDefault": true
  }'
```

### **Test Expense Search**
```bash
curl "http://localhost:18080/api/v1/expenses/search?merchant=amazon&currency=USD&minAmount=50&maxAmount=500" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 RESPONSE EXAMPLES

### **Bill Response**
```json
{
  "id": 1,
  "billNumber": "INV-001",
  "expenseId": 123,
  "userId": 1,
  "companyId": null,
  "fileName": "receipt.pdf",
  "filePath": "bills/uuid-123.pdf",
  "fileSize": 102400,
  "mimeType": "application/pdf",
  "categoryId": 5,
  "merchant": "Amazon",
  "amount": 99.99,
  "currency": "USD",
  "billDate": "2025-01-15",
  "uploadedAt": "2025-01-15T10:30:00",
  "notes": "Office supplies"
}
```

### **Saved Card Response**
```json
{
  "id": 1,
  "userId": 1,
  "stripePaymentMethodId": "pm_1234567890",
  "cardBrand": "visa",
  "cardLast4": "4242",
  "cardExpMonth": 12,
  "cardExpYear": 2025,
  "isDefault": true,
  "createdAt": "2025-01-15T10:00:00",
  "updatedAt": "2025-01-15T10:00:00"
}
```

### **Expense Search Response**
```json
[
  {
    "id": 1,
    "amount": 99.99,
    "currency": "USD",
    "baseAmount": 99.99,
    "baseCurrency": "USD",
    "occurredOn": "2025-01-15",
    "companyId": null,
    "categoryId": 5,
    "categoryName": "Office Supplies",
    "description": "Office supplies from Amazon",
    "notes": null,
    "merchant": "Amazon",
    "reimbursable": false,
    "createdAt": "2025-01-15T10:00:00",
    "hasSplitShares": false,
    "receiptUrl": "/api/v1/receipts/1/download",
    "receiptFileName": "receipt.pdf",
    "receiptFileSize": 102400,
    "receiptFileType": "application/pdf"
  }
]
```

---

## 🔐 AUTHENTICATION

All endpoints require Bearer token authentication:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get token from login endpoint:
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

---

## 🏢 COMPANY CONTEXT

For company-scoped operations, include company ID:

**Query Parameter:**
```http
GET /api/v1/bills?companyId=5
```

**Header:**
```http
GET /api/v1/expenses/search
X-Company-Id: 5
```

Use `companyId=0` or omit for personal context.

---

## ⚠️ ERROR RESPONSES

### **400 Bad Request**
```json
{
  "error": "Invalid request",
  "message": "Bill number is required"
}
```

### **401 Unauthorized**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### **404 Not Found**
```json
{
  "error": "Not found",
  "message": "Bill not found"
}
```

### **500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "message": "Failed to upload bill"
}
```

---

## 📊 RATE LIMITS

No rate limits currently enforced. Consider adding in production:
- 100 requests per minute per user
- 10 file uploads per minute per user

---

## 🚀 QUICK START

1. **Start backend:**
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

2. **Get auth token:**
   ```bash
   curl -X POST http://localhost:18080/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password"}'
   ```

3. **Use token in requests:**
   ```bash
   export TOKEN="your_token_here"
   curl http://localhost:18080/api/v1/bills \
     -H "Authorization: Bearer $TOKEN"
   ```

---

**All endpoints ready for mobile integration!** 🎉
