import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export async function negotiateRate(
  loadPostingId: string,
  userOffer: number,
  baseRate: number,
  distanceKm: number,
  customerId: string
) {
  let load = null;
  let negotiation: any = null;
  let isDbOffline = false;

  try {
    // 1. Verify load posting exists and belongs to customer
    load = await prisma.loadPosting.findUnique({
      where: { id: loadPostingId },
    });
    if (!load || load.customerId !== customerId) {
      throw new AppError('Load posting not found or unauthorized', 404, 'NOT_FOUND');
    }

    // 2. Find or create Negotiation
    negotiation = await prisma.negotiation.findUnique({
      where: { loadPostingId },
    });

    if (!negotiation) {
      negotiation = await prisma.negotiation.create({
        data: {
          loadPostingId,
          status: 'ongoing',
          chatHistory: [],
        },
      });
    }

    if (negotiation.status !== 'ongoing') {
      throw new AppError('Negotiation has already concluded', 400, 'INVALID_STATE');
    }
  } catch (dbErr) {
    if (dbErr instanceof AppError) {
      throw dbErr;
    }
    console.warn('[Negotiation Service] Database offline, running in mock/in-memory mode.');
    isDbOffline = true;
  }

  // Handle database-offline mock mode
  if (isDbOffline) {
    const history: any[] = [];
    history.push({ role: 'user', content: `I offer ₹${userOffer}` });

    try {
      const aiResponse = await fetch('http://localhost:8000/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: [],
          user_offer: userOffer,
          base_rate: baseRate,
          distance_km: distanceKm,
        }),
      });

      if (!aiResponse.ok) {
        throw new Error('AI Service returned an error');
      }

      const data = (await aiResponse.json()) as any;
      history.push({ role: 'ai', content: data.response_text });

      return {
        id: 'mock-negotiation-id',
        loadPostingId,
        status: data.is_accepted ? 'accepted' : 'ongoing',
        finalPrice: data.is_accepted ? data.final_price : null,
        chatHistory: history,
        mock: true,
      };
    } catch (err: any) {
      console.error('FastAPI error in mock mode:', err);
      throw new AppError('Failed to contact AI negotiation service (mock mode)', 503, 'SERVICE_UNAVAILABLE');
    }
  }

  // Normal database flow
  const history = negotiation.chatHistory as any[];
  history.push({ role: 'user', content: `I offer ₹${userOffer}` });

  // 3. Call FastAPI microservice
  try {
    const aiResponse = await fetch('http://localhost:8000/negotiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history,
        user_offer: userOffer,
        base_rate: baseRate,
        distance_km: distanceKm,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('AI Service returned an error');
    }

    const data = (await aiResponse.json()) as any;
    
    // 4. Update Database with AI response
    history.push({ role: 'ai', content: data.response_text });
    
    const updated = await prisma.negotiation.update({
      where: { id: negotiation.id },
      data: {
        chatHistory: history,
        status: data.is_accepted ? 'accepted' : 'ongoing',
        finalPrice: data.is_accepted ? data.final_price : null,
      },
    });

    return updated;
  } catch (err: any) {
    console.error('FastAPI error:', err);
    throw new AppError('Failed to contact AI negotiation service', 503, 'SERVICE_UNAVAILABLE');
  }
}

export async function getNegotiation(loadPostingId: string, customerId: string) {
  try {
    const load = await prisma.loadPosting.findUnique({
      where: { id: loadPostingId },
      include: { negotiation: true },
    });
    if (!load || load.customerId !== customerId) {
      throw new AppError('Load posting not found or unauthorized', 404, 'NOT_FOUND');
    }
    return load.negotiation;
  } catch (dbErr) {
    if (dbErr instanceof AppError) throw dbErr;
    console.warn('[Negotiation Service] Database offline, returning mock ongoing negotiation');
    return {
      id: 'mock-negotiation-id',
      loadPostingId,
      status: 'ongoing',
      finalPrice: null,
      chatHistory: [],
      mock: true,
    };
  }
}
