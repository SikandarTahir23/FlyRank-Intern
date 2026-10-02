import { generateExplanation } from '../config/llm.js';
import { Anomaly } from '../modules/anomalies/anomalies.model.js';

export async function generateExplanationsForNewAnomalies(anomalies) {
  const results = [];
  
  for (const anomaly of anomalies) {
    try {
      const explanation = await generateExplanation(anomaly);
      await Anomaly.findByIdAndUpdate(anomaly._id, {
        llmExplanation: explanation,
        llmGeneratedAt: new Date(),
      });
      results.push({ anomalyId: anomaly._id, explanation });
    } catch (error) {
      console.error(`Failed to generate explanation for ${anomaly._id}:`, error.message);
      results.push({ anomalyId: anomaly._id, error: error.message });
    }
  }
  
  return results;
}

export async function getExplanation(anomalyId) {
  const anomaly = await Anomaly.findById(anomalyId).lean();
  if (!anomaly) return null;
  
  if (anomaly.llmExplanation) {
    return { explanation: anomaly.llmExplanation, cached: true };
  }
  
  const explanation = await generateExplanation(anomaly);
  await Anomaly.findByIdAndUpdate(anomalyId, {
    llmExplanation: explanation,
    llmGeneratedAt: new Date(),
  });
  
  return { explanation, cached: false };
}