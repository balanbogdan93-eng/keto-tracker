import { Router, Request, Response } from 'express';
import https from 'https';

const router = Router();

// GET /api/ai/search?q=query  — proxy to Open Food Facts (avoids CORS in some browsers)
router.get('/search', (req: Request, res: Response) => {
  const q = encodeURIComponent(String(req.query.q || ''));
  if (!q) return res.json({ products: [] });

  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&json=1&page_size=8&fields=product_name,nutriments,serving_size,image_thumb_url,brands`;

  https.get(url, { headers: { 'User-Agent': 'KetoTracker/1.0' } }, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => { data += chunk; });
    apiRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const products = (parsed.products || []).map((p: any) => ({
          name: p.product_name || 'Unknown',
          brand: p.brands || '',
          serving_size: p.serving_size || '100g',
          image: p.image_thumb_url || null,
          calories: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
          fat: Math.round((p.nutriments?.fat_100g || 0) * 10) / 10,
          protein: Math.round((p.nutriments?.proteins_100g || 0) * 10) / 10,
          carbs: Math.round((p.nutriments?.carbohydrates_100g || 0) * 10) / 10,
          fiber: Math.round((p.nutriments?.fiber_100g || 0) * 10) / 10,
        })).filter((p: any) => p.name && p.name !== 'Unknown');
        res.json({ products });
      } catch {
        res.json({ products: [] });
      }
    });
  }).on('error', () => res.json({ products: [] }));
});

export default router;
