import express, { Request, Response, Router } from 'express';
import { HISTORICAL_SCENARIOS } from './scenarios.js';
import { runSimulation } from './simulation-engine.js';
import { fetchLiveWeatherForecast, fetchOverpassInfrastructure } from './external-data.js';
import { analyzeImagery, generateImpactNarrative, generateAdvisory, askCycloneAnalyst } from './gemini/gemini-service.js';
import { getAuthorityContacts, saveAuthorityContact, getDispatchLogs, executeDispatch } from './dispatch/dispatch-service.js';
import { getTerrainProvider } from './providers/index.js';

export const apiRouter = Router();

apiRouter.use(express.json({ limit: '15mb' }));

// Health & Status
apiRouter.get('/health', (req: Request, res: Response) => {
  const provider = getTerrainProvider();
  res.json({
    status: 'ok',
    appName: 'CycloneSight',
    version: '1.0.0',
    terrainProvider: provider.name,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    dryRun: process.env.DRY_RUN !== 'false',
    timestamp: new Date().toISOString(),
  });
});

// Scenarios
apiRouter.get('/scenarios', (req: Request, res: Response) => {
  res.json({ scenarios: HISTORICAL_SCENARIOS });
});

// Simulation
apiRouter.post('/simulate', async (req: Request, res: Response) => {
  try {
    const { scenario, landfallShiftKm = 0 } = req.body;
    if (!scenario || !scenario.id) {
      return res.status(400).json({ error: 'Scenario specification is required.' });
    }
    const result = await runSimulation(scenario, Number(landfallShiftKm) || 0);
    res.json(result);
  } catch (err: any) {
    console.error('[API /simulate] Error running simulation:', err);
    res.status(500).json({ error: err.message || 'Simulation execution failed.' });
  }
});

// Live Weather (Open-Meteo)
apiRouter.post('/live-weather', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Coordinates lat/lng required' });
    }
    const data = await fetchLiveWeatherForecast(Number(lat), Number(lng));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Infrastructure Overpass
apiRouter.post('/overpass-infra', async (req: Request, res: Response) => {
  try {
    const { south, west, north, east, fallbackAssets = [] } = req.body;
    const data = await fetchOverpassInfrastructure(
      Number(south),
      Number(west),
      Number(north),
      Number(east),
      fallbackAssets
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Gemini Multimodal Imagery Analysis
apiRouter.post('/analyze-imagery', async (req: Request, res: Response) => {
  try {
    const { imageBase64, hazardSummary } = req.body;
    if (!imageBase64 || !hazardSummary) {
      return res.status(400).json({ error: 'imageBase64 and hazardSummary are required.' });
    }
    const result = await analyzeImagery(imageBase64, hazardSummary);
    res.json(result);
  } catch (err: any) {
    console.error('[API /analyze-imagery] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Gemini Impact Narrative
apiRouter.post('/impact-narrative', async (req: Request, res: Response) => {
  try {
    const { hazardSummary, districtName } = req.body;
    if (!hazardSummary) {
      return res.status(400).json({ error: 'hazardSummary is required.' });
    }
    const result = await generateImpactNarrative(hazardSummary, districtName);
    res.json(result);
  } catch (err: any) {
    console.error('[API /impact-narrative] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Gemini Advisory Generator
apiRouter.post('/advisory', async (req: Request, res: Response) => {
  try {
    const { district, audience, hazardSummary, language = 'en' } = req.body;
    if (!district || !audience || !hazardSummary) {
      return res.status(400).json({ error: 'district, audience, and hazardSummary are required.' });
    }
    const result = await generateAdvisory({
      district,
      audience,
      hazardSummary,
      language,
    });
    res.json(result);
  } catch (err: any) {
    console.error('[API /advisory] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Gemini Grounded Ask AI
apiRouter.post('/ask', async (req: Request, res: Response) => {
  try {
    const { question, scenarioData, conversationHistory } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required.' });
    }
    const result = await askCycloneAnalyst({
      question,
      scenarioData,
      conversationHistory,
    });
    res.json(result);
  } catch (err: any) {
    console.error('[API /ask] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Contacts Directory
apiRouter.get('/contacts', (req: Request, res: Response) => {
  res.json({ contacts: getAuthorityContacts() });
});

apiRouter.post('/contacts', (req: Request, res: Response) => {
  try {
    const contact = req.body;
    const saved = saveAuthorityContact(contact);
    res.json({ success: true, contact: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dispatch Queue & Audit Log
apiRouter.get('/dispatches', (req: Request, res: Response) => {
  res.json({ dispatches: getDispatchLogs() });
});

apiRouter.post('/dispatch', async (req: Request, res: Response) => {
  try {
    const { advisory, channel, approver, notes } = req.body;
    if (!advisory || !channel || !approver) {
      return res.status(400).json({ error: 'advisory, channel, and approver name are mandatory.' });
    }
    const record = await executeDispatch({ advisory, channel, approver, notes });
    res.json({ success: true, record });
  } catch (err: any) {
    console.error('[API /dispatch] Error:', err);
    res.status(500).json({ error: err.message });
  }
});
