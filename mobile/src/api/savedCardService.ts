import { api } from './client';

export interface SavedCard {
  id: number;
  userId: number;
  stripePaymentMethodId: string;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const SavedCardService = {
  async saveCard(paymentMethodId: string, setAsDefault: boolean = false): Promise<SavedCard> {
    const response = await api.post('/api/v1/saved-cards', {
      paymentMethodId,
      setAsDefault,
    });
    return response.data;
  },

  async listCards(): Promise<SavedCard[]> {
    const response = await api.get('/api/v1/saved-cards');
    return response.data;
  },

  async getDefaultCard(): Promise<SavedCard | null> {
    try {
      const response = await api.get('/api/v1/saved-cards/default');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async setDefaultCard(id: number): Promise<SavedCard> {
    const response = await api.put(`/api/v1/saved-cards/${id}/set-default`);
    return response.data;
  },

  async deleteCard(id: number): Promise<void> {
    await api.delete(`/api/v1/saved-cards/${id}`);
  },
};

export default SavedCardService;
