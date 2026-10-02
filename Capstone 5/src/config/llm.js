import axios from 'axios';

const provider = process.env.LLM_PROVIDER || 'mock';
const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const timeout = parseInt(process.env.LLM_TIMEOUT_MS || '30000', 10);

function buildPrompt(anomaly) {
  return `You are a FinOps analyst. Explain this cloud cost anomaly in 2-3 sentences for an engineering manager.

Resource: ${anomaly.resourceId} (${anomaly.resourceType}, ${anomaly.service}, ${anomaly.region})
Anomaly: ${anomaly.anomalyType} - ${anomaly.severity}
Metrics: ${JSON.stringify(anomaly.metricSnapshot)}
Estimated Monthly Savings: $${anomaly.estimatedMonthlySavings.toFixed(2)}

Focus on: root cause, business impact, specific recommended action.`;
}

async function callOllama(prompt) {
  const response = await axios.post(
    `${ollamaUrl}/api/generate`,
    {
      model: ollamaModel,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 200,
      },
    },
    { timeout }
  );
  return response.data.response?.trim() || '';
}

async function callMock(prompt) {
  await new Promise(r => setTimeout(r, 100));
  return `[MOCK LLM] This ${prompt.match(/Resource: ([^)]+)/)?.[1] || 'resource'} shows ${prompt.match(/Anomaly: ([^-]+)/)?.[1] || 'anomaly'} behavior. Recommend reviewing utilization metrics and considering rightsizing or scheduling to reduce the estimated $${prompt.match(/Estimated Monthly Savings: \$([\d.]+)/)?.[1] || '0'} monthly waste.`;
}

export async function generateExplanation(anomaly) {
  const prompt = buildPrompt(anomaly);
  
  try {
    if (provider === 'ollama') {
      return await callOllama(prompt);
    }
    return await callMock(prompt);
  } catch (error) {
    console.warn('LLM call failed, using fallback:', error.message);
    return `Automated detection: ${anomaly.anomalyType} anomaly on ${anomaly.resourceId}. Estimated savings: $${anomaly.estimatedMonthlySavings.toFixed(2)}/month. Recommend investigation and remediation.`;
  }
}

export function getProvider() {
  return provider;
}