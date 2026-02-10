/**
 * ============================================================
 * AI Photo Match Module — Cat Identification System
 * ============================================================
 *
 * This module provides the architecture and pseudocode for matching
 * lost cats with found cat reports using computer vision.
 *
 * APPROACH: Transfer learning with a pre-trained CNN (ResNet50/MobileNet)
 * fine-tuned on cat features. Extracts feature vectors and computes
 * cosine similarity between lost and found cat photos.
 *
 * PRODUCTION DEPLOYMENT: This would run as a separate Python microservice
 * using FastAPI + PyTorch/TensorFlow, accessed via internal API.
 * The Node.js backend calls the Python service and stores results.
 */

// ---- Types ----
interface FeatureVector {
  embedding: number[];  // 512-dimensional vector from CNN
  color_histogram: number[];
  pattern_features: {
    has_stripes: boolean;
    has_spots: boolean;
    primary_colors: string[];
    face_shape: string;
  };
}

interface MatchResult {
  found_cat_id: string;
  similarity_score: number;  // 0-1
  matched_features: string[];
  confidence: 'high' | 'medium' | 'low';
}

// ---- Pseudocode: Feature Extraction ----
/*
  Python microservice endpoint: POST /extract-features

  def extract_features(image_bytes):
      """Extract feature vector from a cat photo."""

      # 1. Preprocess image
      image = load_image(image_bytes)
      image = resize(image, 224, 224)  # ResNet input size
      image = normalize(image, mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])

      # 2. Extract CNN embedding (transfer learning)
      model = load_pretrained_resnet50(weights='imagenet')
      model = remove_classification_head(model)  # Use as feature extractor
      # Optionally: fine-tune on cat breed dataset (Oxford-IIIT Pet Dataset)

      embedding = model.forward(image)  # 512-dim vector
      embedding = normalize_l2(embedding)

      # 3. Extract color histogram
      hsv_image = convert_to_hsv(image)
      color_hist = compute_histogram(hsv_image, bins=[30, 32, 32])
      color_hist = normalize(color_hist)

      # 4. Detect pattern features
      pattern = detect_patterns(image)  # Custom classifier or YOLO-based

      return {
          'embedding': embedding.tolist(),
          'color_histogram': color_hist.tolist(),
          'pattern_features': pattern
      }
*/

// ---- Pseudocode: Matching Algorithm ----
/*
  def find_matches(lost_cat_features, found_cats_features, top_k=10):
      """Find the most similar found cats to a lost cat."""

      results = []

      for found_cat in found_cats_features:
          # Cosine similarity on CNN embeddings (primary signal)
          embedding_sim = cosine_similarity(
              lost_cat_features['embedding'],
              found_cat['embedding']
          )

          # Color histogram similarity (secondary signal)
          color_sim = histogram_intersection(
              lost_cat_features['color_histogram'],
              found_cat['color_histogram']
          )

          # Pattern match bonus
          pattern_bonus = 0
          if lost_cat_features['pattern_features']['has_stripes'] == found_cat['pattern_features']['has_stripes']:
              pattern_bonus += 0.05
          if set(lost_cat_features['pattern_features']['primary_colors']) & set(found_cat['pattern_features']['primary_colors']):
              pattern_bonus += 0.05

          # Weighted combined score
          final_score = (
              0.65 * embedding_sim +
              0.25 * color_sim +
              0.10 * pattern_bonus
          )

          # Determine confidence level
          if final_score >= 0.85:
              confidence = 'high'
          elif final_score >= 0.70:
              confidence = 'medium'
          else:
              confidence = 'low'

          # Identify which features matched
          matched_features = []
          if embedding_sim > 0.8:
              matched_features.append('visual_appearance')
          if color_sim > 0.7:
              matched_features.append('color_pattern')
          if pattern_bonus > 0:
              matched_features.append('markings')

          results.append({
              'found_cat_id': found_cat['id'],
              'similarity_score': final_score,
              'matched_features': matched_features,
              'confidence': confidence
          })

      # Sort by similarity and return top K
      results.sort(key=lambda x: x['similarity_score'], reverse=True)
      return results[:top_k]
*/

// ---- Node.js Integration ----

import { prisma } from '../config/database';

/**
 * Call the AI matching service and return results.
 * In production, this calls a separate Python microservice.
 * For MVP, we use a simulated matching based on breed/color text similarity.
 */
export async function findAIMatches(lostCatId: string): Promise<MatchResult[]> {
  const lostCat = await prisma.lostCat.findUnique({
    where: { id: lostCatId },
    select: {
      photoUrls: true,
      breed: true,
      color: true,
      featureVector: true,
      lastSeenLat: true,
      lastSeenLng: true,
    },
  });

  if (!lostCat) return [];

  // Fetch active found cats within 50km
  const foundCats = await prisma.$queryRaw<Array<{
    id: string;
    description: string;
    photo_urls: string[];
    feature_vector: FeatureVector | null;
    distance_km: number;
  }>>`
    SELECT id, description, photo_urls, feature_vector,
      ST_Distance(
        ST_SetSRID(ST_MakePoint(found_lng, found_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lostCat.lastSeenLng}, ${lostCat.lastSeenLat}), 4326)::geography
      ) / 1000 as distance_km
    FROM found_cats
    WHERE status = 'active'
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(found_lng, found_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lostCat.lastSeenLng}, ${lostCat.lastSeenLat}), 4326)::geography,
        50000
      )
    ORDER BY distance_km ASC
    LIMIT 100
  `;

  // TODO: In production, call the Python AI service:
  // const response = await fetch('http://ai-service:8000/match', {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     lost_cat_photos: lostCat.photoUrls,
  //     found_cats: foundCats.map(fc => ({ id: fc.id, photos: fc.photo_urls })),
  //   }),
  // });
  // return response.json();

  // MVP fallback: text-based matching
  const results: MatchResult[] = foundCats.map((fc) => {
    let score = 0;
    const matched: string[] = [];

    // Proximity bonus (closer = higher score)
    if (fc.distance_km < 5) { score += 0.3; matched.push('nearby_location'); }
    else if (fc.distance_km < 15) { score += 0.15; matched.push('same_area'); }

    // Text similarity on description
    if (lostCat.breed && fc.description.toLowerCase().includes(lostCat.breed.toLowerCase())) {
      score += 0.3;
      matched.push('breed_match');
    }
    if (lostCat.color && fc.description.toLowerCase().includes(lostCat.color.toLowerCase())) {
      score += 0.25;
      matched.push('color_match');
    }

    return {
      found_cat_id: fc.id,
      similarity_score: Math.min(score, 1),
      matched_features: matched,
      confidence: score >= 0.7 ? 'high' as const : score >= 0.4 ? 'medium' as const : 'low' as const,
    };
  });

  return results
    .filter((r) => r.similarity_score > 0.2)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, 10);
}
