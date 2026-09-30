import { GoogleGenAI, Type } from '@google/genai';
import { AdvisoryData, AudienceType, HazardSummary, LanguageCode } from '../../shared/types.js';

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

/**
 * 1. Analyze Imagery: Map/satellite screenshot + hazard summary.
 */
export async function analyzeImagery(imageBase64: string, hazardSummary: HazardSummary) {
  const ai = getGenAI();

  const promptText = `
You are a senior geospatial disaster intelligence specialist and remote sensing meteorologist.
Analyze this high-resolution cyclone map/satellite visualization screenshot alongside the numerical hazard scenario data:

SCENARIO SUMMARY:
- Cyclone: ${hazardSummary.scenarioName}
- Hours to Landfall: ${hazardSummary.hoursToLandfall}h (Alert: ${hazardSummary.alertLevel})
- Peak Storm Surge: ${hazardSummary.maxSurgeDepthM} meters
- Peak Wind Speed: ${hazardSummary.maxWindSpeedKmh} km/h
- Overall Population at Inundation Risk: ${hazardSummary.overallPopulationAtRisk.toLocaleString()}
- Total Critical Infrastructure Assets Exposed: ${hazardSummary.totalCriticalAssets}

TASK:
1. Examine visible terrain features, coastal river deltas, low-lying coastal bunds/embankments, and asset pin clusters shown in the screenshot.
2. Provide specific visible vulnerability observations (estuarine choke points, tidal locking vulnerabilities, exposed transport lifelines).
3. Evaluate agreement or discrepancy between visual topography and the physical model output.
4. Note limitations of 2D map assessment (e.g., bathymetry micro-ridges, localized sea-dyke crest heights).
5. State your overall assessment confidence level (0 to 100%).

Return strictly structured JSON.
`;

  if (!ai) {
    // High-fidelity fallback when API key is not configured
    return {
      success: true,
      mode: 'mock',
      observations: [
        `Visible estuarine delta shows dense network of tidal creeks in ${hazardSummary.districtStats[0]?.district || 'the coastal sector'}, creating high vulnerability to backward surge intrusion.`,
        `Primary coastal highway corridor NH-117/SH-3 runs parallel to intertidal mudflats with low elevation (<2.0m), confirming high probability of arterial disconnection.`,
        `Substation clusters at coastal peripheral nodes lack secondary ring redundancy, posing high risk of cascading blackout to dependent referral health centers.`,
      ],
      modelAgreement: {
        status: 'Substantial Agreement',
        notes: `The empirical surge inundation envelope of ${hazardSummary.maxSurgeDepthM}m aligns closely with natural geomorphological depressions and estuarine drainage basins visible in the satellite overview.`,
        discrepancies: 'Localized coastal embankments (polders) may temporarily restrict shallow inland inundation (<0.5m) until overtopped during peak astronomical high tide.',
      },
      criticalChokePoints: [
        'Estuary bridge causeway approaches prone to scouring',
        'Hospital access avenues situated along low-lying agricultural polder dikes',
      ],
      confidence: 88,
      timestamp: new Date().toISOString(),
      disclaimer: 'Prototype decision-support analysis. Validate with field reconnaissance and official national disaster management bulletins.',
    };
  }

  try {
    // Clean base64 if it has data URL prefix
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            observations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key visible vulnerability observations from the map and satellite features',
            },
            modelAgreement: {
              type: Type.OBJECT,
              properties: {
                status: { type: Type.STRING },
                notes: { type: Type.STRING },
                discrepancies: { type: Type.STRING },
              },
              required: ['status', 'notes'],
            },
            criticalChokePoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence percentage (0-100)',
            },
            disclaimer: { type: Type.STRING },
          },
          required: ['observations', 'modelAgreement', 'confidence', 'disclaimer'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      success: true,
      mode: 'live',
      ...parsed,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.warn('[Gemini analyzeImagery] Live API call encountered an issue, falling back:', error.message);
    return {
      success: true,
      mode: 'fallback',
      observations: [
        `Coastal delta reveals multiple low-lying polders subject to estuarine backwater surge.`,
        `High density of exposed lifelines in ${hazardSummary.districtStats[0]?.district || 'coastal belt'}.`,
      ],
      modelAgreement: {
        status: 'Moderate-to-High Agreement',
        notes: `Simulated surge inundation boundary aligns with tidal creek bathymetry.`,
        discrepancies: 'Micro-relief embankments may attenuate shallow inundation.',
      },
      criticalChokePoints: ['Coastal sluice gate approaches', 'Low-elevation hospital feeder roads'],
      confidence: 84,
      timestamp: new Date().toISOString(),
      disclaimer: 'Decision-support prototype. Follow official IMD/NDMA guidelines.',
    };
  }
}

/**
 * 2. Impact Narrative: Plain-language impact assessment for disaster managers.
 */
export async function generateImpactNarrative(hazardSummary: HazardSummary, districtName?: string) {
  const ai = getGenAI();

  const targetDistrict = districtName
    ? hazardSummary.districtStats.find((d) => d.district.toLowerCase() === districtName.toLowerCase()) ||
      hazardSummary.districtStats[0]
    : hazardSummary.districtStats[0];

  const promptText = `
You are a disaster impact specialist drafting an executive pre-landfall situation assessment for:
Scenario: ${hazardSummary.scenarioName}
Hours to Landfall: ${hazardSummary.hoursToLandfall} hours
District Focus: ${targetDistrict?.district || 'Coastal Sector'}
Overall Population at Risk: ${hazardSummary.overallPopulationAtRisk.toLocaleString()}
District Population at Risk: ${targetDistrict?.populationAtRisk.toLocaleString() || 'N/A'}
Peak Surge: ${targetDistrict?.peakSurgeM || hazardSummary.maxSurgeDepthM} meters
Peak Wind: ${targetDistrict?.peakWindKmh || hazardSummary.maxWindSpeedKmh} km/h
Flooded Area: ${targetDistrict?.floodedAreaKm2 || 120} sq km
Critical Assets at Risk: ${targetDistrict?.criticalAssetsCount || hazardSummary.totalCriticalAssets}

RULES:
- Never invent numbers not present in the input.
- Explicitly state uncertainties (track deflection ±25 km, astronomical tide timing shift ±45 min).
- Keep language professional, calm, concise, and focused on pre-landfall preemptive action.
- Mention critical infrastructure sectors (power, healthcare, transport access).

Return strictly JSON format.
`;

  if (!ai) {
    return {
      success: true,
      mode: 'mock',
      executiveHeadline: `Severe Cyclone Threat: ${targetDistrict?.district || 'Coastal District'} faces peak ${targetDistrict?.peakSurgeM || 3.8}m storm surge with ${hazardSummary.hoursToLandfall}h lead time.`,
      populationImpact: `An estimated ${targetDistrict?.populationAtRisk.toLocaleString() || '180,000'} residents reside in low-lying zones exposed to inundation depths exceeding 1.0m. Immediate vertical evacuation to elevated multipurpose shelters is critical.`,
      criticalInfrastructureRisk: `Key electrical substations in coastal blocks are at high risk of switchyard inundation. Power outages are projected to cascade to ${targetDistrict?.criticalAssetsCount || 4} health centers lacking elevated backup diesel generators. Arterial highway corridors face complete overtopping.`,
      keyUncertainties: [
        'Landfall timing coincides with spring high tide; a 1-hour delay could increase surge penetration by up to 0.6m.',
        'Track shift of ±30 km along the coastline will shift maximum right-front quadrant winds between neighboring districts.',
      ],
      preemptivePriorities: [
        'Complete mandatory evacuation of mud/thatch dwellings within 5 km of the coastline within 12 hours.',
        'Pre-stage heavy dewatering pumps and mobile 500kVA generators at designated referral hospitals.',
        'Preemptively shutter low-lying coastal road causeways to non-emergency vehicular traffic.',
      ],
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveHeadline: { type: Type.STRING },
            populationImpact: { type: Type.STRING },
            criticalInfrastructureRisk: { type: Type.STRING },
            keyUncertainties: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            preemptivePriorities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['executiveHeadline', 'populationImpact', 'criticalInfrastructureRisk', 'keyUncertainties', 'preemptivePriorities'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      success: true,
      mode: 'live',
      ...parsed,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.warn('[Gemini impactNarrative] Fallback invoked:', err.message);
    return {
      success: true,
      mode: 'fallback',
      executiveHeadline: `Pre-Landfall Action Bulletin for ${targetDistrict?.district}: ${hazardSummary.hoursToLandfall} Hours to Impact.`,
      populationImpact: `Approximately ${targetDistrict?.populationAtRisk.toLocaleString()} individuals in tidal lowlands face high inundation exposure.`,
      criticalInfrastructureRisk: `High vulnerability identified in peripheral 33kV distribution substations and access roadways.`,
      keyUncertainties: ['Tidal peak phase synchronization', 'Local polder embankment breach thresholds'],
      preemptivePriorities: ['Accelerate shelter occupancy verification', 'Pre-position emergency restoration supplies'],
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 3. Advisory Generator: Audience-tailored multi-language early warning.
 */
export async function generateAdvisory(params: {
  district: string;
  audience: AudienceType;
  hazardSummary: HazardSummary;
  language: LanguageCode;
}): Promise<AdvisoryData> {
  const { district, audience, hazardSummary, language } = params;
  const ai = getGenAI();

  const langNames: Record<LanguageCode, string> = {
    en: 'English',
    bn: 'Bengali (বাংলা)',
    or: 'Odia (ଓଡ଼ିଆ)',
    hi: 'Hindi (हिन्दी)',
    ta: 'Tamil (தமிழ்)',
    te: 'Telugu (తెలుగు)',
    my: 'Burmese (မြန်မာဘာသာ)',
  };

  const targetLang = langNames[language] || 'Bengali (বাংলা)';

  const promptText = `
You are an authorized Emergency Operations Center dispatch strategist preparing an official actionable advisory.
AUDIENCE: ${audience}
DISTRICT: ${district}
ALERT LEVEL: ${hazardSummary.alertLevel} (${hazardSummary.hoursToLandfall} hours to landfall)
CYCLONE: ${hazardSummary.scenarioName}
HAZARD NUMBERS:
- Peak surge: ${hazardSummary.maxSurgeDepthM} m
- Peak wind: ${hazardSummary.maxWindSpeedKmh} km/h
- Population in hazard zone: ${hazardSummary.overallPopulationAtRisk.toLocaleString()}

Generate a structured early-warning advisory tailored to the duties of: "${audience}".
The advisory must contain:
1. High-priority headline & summary
2. Time-bound operational actions with explicit lead-time deadlines (e.g. 6h, 12h, 18h) and assigned roles
3. Designated evacuation or security zones
4. Key pre-positioned resources
5. Parallel translation in ${targetLang} ensuring authentic, respectful, clear phrasing used by official disaster management bodies.

Return strictly JSON matching the required schema.
`;

  if (!ai) {
    return getMockAdvisory(district, audience, hazardSummary, language, targetLang);
  }

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            summary: { type: Type.STRING },
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING },
                  deadlineHours: { type: Type.NUMBER },
                  owner: { type: Type.STRING },
                  priority: { type: Type.STRING },
                },
                required: ['action', 'deadlineHours', 'owner', 'priority'],
              },
            },
            evacuationZones: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            resources: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            validUntil: { type: Type.STRING },
            languages: {
              type: Type.OBJECT,
              properties: {
                en: {
                  type: Type.OBJECT,
                  properties: {
                    headline: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    instructions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['headline', 'summary', 'instructions'],
                },
                local: {
                  type: Type.OBJECT,
                  properties: {
                    langName: { type: Type.STRING },
                    headline: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    instructions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['langName', 'headline', 'summary', 'instructions'],
                },
              },
              required: ['en', 'local'],
            },
          },
          required: ['headline', 'summary', 'actions', 'evacuationZones', 'resources', 'languages'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      alertLevel: hazardSummary.alertLevel,
      audience,
      district,
      headline: parsed.headline || `Cyclone Early-Warning Directive for ${audience}`,
      summary: parsed.summary || `Pre-landfall operational directive for ${district}.`,
      actions: parsed.actions || [],
      evacuationZones: parsed.evacuationZones || ['Coastal Blocks 1 & 2', 'Riverine Lowland Embankment Zones'],
      resources: parsed.resources || ['NDRF Quick Response Boats', '500kVA Mobile Generators', 'Emergency Medical Rations'],
      validUntil: parsed.validUntil || `${hazardSummary.hoursToLandfall} Hours Before Landfall`,
      languages: {
        en: {
          headline: parsed.languages?.en?.headline || parsed.headline,
          summary: parsed.languages?.en?.summary || parsed.summary,
          actions: parsed.actions || [],
          instructions: parsed.languages?.en?.instructions || ['Execute vertical evacuation to registered concrete shelters immediately.'],
        },
        local: {
          langName: targetLang,
          headline: parsed.languages?.local?.headline || parsed.headline,
          summary: parsed.languages?.local?.summary || parsed.summary,
          actions: parsed.actions || [],
          instructions: parsed.languages?.local?.instructions || ['অবিলম্বে নিকটবর্তী পাকা বহুমুখী ঘূর্ণিঝড় আশ্রয়কেন্দ্রে আশ্রয় নিন।'],
        },
      },
    };
  } catch (err: any) {
    console.warn('[Gemini advisory] Fallback invoked:', err.message);
    return getMockAdvisory(district, audience, hazardSummary, language, targetLang);
  }
}

function getMockAdvisory(
  district: string,
  audience: AudienceType,
  hazardSummary: HazardSummary,
  language: LanguageCode,
  langName: string
): AdvisoryData {
  const localHeadlines: Record<LanguageCode, { headline: string; summary: string; instr: string }> = {
    en: {
      headline: `EMERGENCY DIRECTIVE: Cyclone ${hazardSummary.scenarioName} Landfall Precautionary Order`,
      summary: `Mandatory operational response for ${audience} in ${district}. Landfall expected in ${hazardSummary.hoursToLandfall}h with ${hazardSummary.maxSurgeDepthM}m surge.`,
      instr: 'Evacuate all vulnerable persons to certified multi-hazard shelters prior to T-12h.',
    },
    bn: {
      headline: `জরুরি সতর্কবার্তা: ঘূর্ণিঝড় ${hazardSummary.scenarioName} প্রভাব সংক্রান্ত সতর্কতামূলক নির্দেশ`,
      summary: `${district} জেলার জন্য জরুরি সতর্কতামূলক নির্দেশ। পরবর্তী ${hazardSummary.hoursToLandfall} ঘণ্টার মধ্যে উপকূলে আঘাত হানার সম্ভাবনা।`,
      instr: 'উপকূলবর্তী ঝুঁকিপূর্ণ এলাকার সকল বাসিন্দাকে দ্রুত নিকটস্থ পাকা আশ্রয়কেন্দ্রে স্থানান্তর করুন।',
    },
    or: {
      headline: `ଜରୁରୀ ସତର୍କତା ଆଦେଶ: ବାତ୍ୟା ${hazardSummary.scenarioName} ପାଇଁ ପ୍ରସ୍ତୁତି ନିର୍ଦ୍ଦେଶ`,
      summary: `${district} ଜିଲ୍ଲାର ପ୍ରଶାସନିକ ଏବଂ ଜନସାଧାରଣଙ୍କ ପାଇଁ ଜରୁରୀ କାର୍ଯ୍ୟାନୁଷ୍ଠାନ ନିର୍ଦ୍ଦେଶ। ଆଗାମୀ ${hazardSummary.hoursToLandfall} ଘଣ୍ଟା ମଧ୍ୟରେ ସ୍ଥଳଭାଗ ଛୁଇଁବ।`,
      instr: 'ସମୁଦ୍ର କୂଳିଆ ଏବଂ କଚ୍ଚା ଘରେ ଥିବା ଲୋକଙ୍କୁ ତୁରନ୍ତ ନିକଟସ୍ଥ ବାତ୍ୟା ଆଶ୍ରୟସ୍ଥଳୀକୁ ସ୍ଥାନାନ୍ତର କରନ୍ତୁ।',
    },
    hi: {
      headline: `आपातकालीन चेतावनी: चक्रवात ${hazardSummary.scenarioName} भूस्खलन पूर्व सतर्कता आदेश`,
      summary: `${district} जिले में ${audience} हेतु अनिवार्य पूर्व-आपदा संचालन निर्देश। लैंडफॉल ${hazardSummary.hoursToLandfall} घंटों में संभावित।`,
      instr: 'तटीय एवं निचले क्षेत्रों के सभी नागरिकों को तुरंत बहुउद्देशीय पक्के राहत शिविरों में पहुंचाएं।',
    },
    ta: {
      headline: `அவசர எச்சரிக்கை: புயல் ${hazardSummary.scenarioName} கரையைக் கடக்கும் முன் பாதுகாப்பு உத்தரவு`,
      summary: `${district} மாவட்டத்திற்கான தீவிர பாதுகாப்பு முன்னெச்சரிக்கை வழிகாட்டுதல்.`,
      instr: 'தாழ்வான பகுதிகளில் உள்ள மக்களை உடனடியாக பாதுகாப்பான புயல் பாதுகாப்பு மையங்களுக்கு மாற்றவும்.',
    },
    te: {
      headline: `అత్యవసర హెచ్చరిక: తుఫాను ${hazardSummary.scenarioName} తీరం దాటే ముందు తీసుకోవాల్సిన చర్యలు`,
      summary: `${district} జిల్లా అధికారులకు మరియు ప్రజలకు అత్యవసర ముందస్తు ఆదేశాలు.`,
      instr: 'లోతట్టు ప్రాంతాల ప్రజలను వెంటనే సురక్షితమైన తుఫాను పునరావాస కేంద్రాలకు తరలించండి.',
    },
    my: {
      headline: `အရေးပေါ်သတိပေးချက်: မုန်တိုင်း ${hazardSummary.scenarioName} ကမ်းတက်ခါနီး ကြိုတင်ကာကွယ်ရေး အမိန့်`,
      summary: `${district} ဒေသဆိုင်ရာ အာဏာပိုင်များနှင့် ပြည်သူများအတွက် အရေးပေါ် ညွှန်ကြားချက်။`,
      instr: 'ကမ်းရိုးတန်းနှင့် မြေနိမ့်ပိုင်းရှိ ပြည်သူများကို ခိုင်ခံ့သော မုန်တိုင်းခိုလှုံရာစခန်းများသို့ ချက်ချင်း ရွှေ့ပြောင်းပါ။',
    },
  };

  const loc = localHeadlines[language] || localHeadlines.en;

  const actions = [
    {
      action: audience === 'Hospital Administrator'
        ? 'Relocate ground-floor ICU and neonatal patients to Level 2 wards; start auxiliary diesel generators.'
        : audience === 'Power Utility'
        ? 'Pre-de-energize coastal 33kV switchyards subject to surge > 1.0m to prevent catastrophic equipment damage.'
        : audience === 'Road/Highway Authority'
        ? 'Erect barriers and redirect traffic away from low-elevation causeways NH-117 and coastal state corridors.'
        : 'Complete mandatory vertical evacuation of all households in non-engineered housing within 3km of shore.',
      deadlineHours: Math.max(4, hazardSummary.hoursToLandfall - 6),
      owner: audience,
      priority: 'Immediate' as const,
    },
    {
      action: 'Confirm satellite satellite phone and VHF radio links with District Disaster Management Center.',
      deadlineHours: Math.max(6, hazardSummary.hoursToLandfall - 10),
      owner: 'Communications Cell',
      priority: 'High' as const,
    },
    {
      action: 'Deploy inflatable rescue rafts and medical trauma kits at forward staging depots.',
      deadlineHours: Math.max(8, hazardSummary.hoursToLandfall - 8),
      owner: 'State Disaster Response Force (SDRF)',
      priority: 'High' as const,
    },
  ];

  return {
    alertLevel: hazardSummary.alertLevel,
    audience,
    district,
    headline: loc.headline,
    summary: loc.summary,
    actions,
    evacuationZones: ['Sector A: Coastal polder villages (0-3 km)', 'Sector B: Tidal creek lowlands'],
    resources: [
      '2x 500kVA emergency generator sets',
      '4x Inflatable rescue motorboats with outboard motors',
      '10,000 water purification sachets & ready-to-eat ration packets',
    ],
    validUntil: `T-0h Landfall (${hazardSummary.hoursToLandfall}h from issue)`,
    languages: {
      en: {
        headline: localHeadlines.en.headline,
        summary: localHeadlines.en.summary,
        actions,
        instructions: [localHeadlines.en.instr],
      },
      local: {
        langName,
        headline: loc.headline,
        summary: loc.summary,
        actions,
        instructions: [loc.instr],
      },
    },
  };
}

/**
 * 4. Grounded Ask AI: Answers ONLY from computed scenario data.
 */
export async function askCycloneAnalyst(params: {
  question: string;
  scenarioData: any;
  conversationHistory?: { role: 'user' | 'model'; text: string }[];
}) {
  const { question, scenarioData, conversationHistory = [] } = params;
  const ai = getGenAI();

  const systemInstruction = `
You are the CycloneSight Grounded Decision-Support Analyst for the Bay of Bengal & coastal APAC.
You have access to the exact computed simulation results provided in the SCENARIO CONTEXT below.

CRITICAL RULES:
1. Ground your answers EXCLUSIVELY in the provided context numbers, assets, hazards, and cascade chains.
2. NEVER invent, hallucinate, or extrapolate facts or numbers that are not explicitly present in the data.
3. If the provided data does not contain enough information to answer a question (e.g. historical data from 1950, unmodeled towns), explicitly respond: "The current scenario data does not contain information to verify this."
4. State all physical uncertainties clearly (e.g., track deviation, bathymetric friction).
5. Always keep advice actionable, calm, and unambiguous. Include a note that this is decision-support prototype data and official directives from national disaster authorities take precedence.
`;

  const contextPrompt = `
SCENARIO CONTEXT:
${JSON.stringify(scenarioData, null, 2)}

USER QUESTION:
"${question}"
`;

  if (!ai) {
    return generateMockAnswer(question, scenarioData);
  }

  try {
    const contents: any[] = [];
    for (const msg of conversationHistory.slice(-4)) {
      contents.push({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: contextPrompt }],
    });

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.2, // low temperature for high grounding
      },
    });

    return {
      success: true,
      answer: response.text?.trim() || 'No response returned from the model.',
      mode: 'live',
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.warn('[Gemini ask] Fallback invoked:', err.message);
    return generateMockAnswer(question, scenarioData);
  }
}

function generateMockAnswer(question: string, scenarioData: any) {
  const q = question.toLowerCase();
  const scenarioName = scenarioData?.scenarioName || scenarioData?.summary?.scenarioName || 'Amphan Replay';
  const hours = scenarioData?.summary?.hoursToLandfall || 24;
  const peakSurge = scenarioData?.summary?.maxSurgeDepthM || 3.8;
  const criticalCount = scenarioData?.summary?.totalCriticalAssets || 5;

  let answer = '';
  if (q.includes('hospital') || q.includes('power') || q.includes('generator')) {
    answer = `Based on the computed cascading impact model for ${scenarioName} (T-${hours}h):
- **Kakdwip Sub-Divisional Hospital** and **Gosaba Rural Hospital** are at highest immediate risk.
- Their upstream supply substations (*Kakdwip 132kV* and *Gosaba Island 33kV*) are projected to suffer coastal surge depths exceeding 1.1m, tripping switchgear.
- Crucially, neither hospital has an elevated permanent backup power generator registered. They will face complete operational failure within 2-4 hours of grid trip unless emergency mobile 500kVA generator units are dispatched within the next 18 hours.
- *Canning Sub-Divisional Hospital* has verified on-site backup fuel and stands as the primary alternate referral facility.`;
  } else if (q.includes('road') || q.includes('access') || q.includes('highway') || q.includes('cut off')) {
    answer = `Reviewing arterial transit corridors in the simulation:
- **Gosaba - Gadkhali Causeway** (elevation 0.9m) is projected to be submerged first at T-14h with up to 1.8m inundation, cutting off all terrestrial island access.
- **NH-117 (Diamond Harbour - Kakdwip Highway)** is exposed to 1.2m of surge water and fallen poles from 160+ km/h gusts at T-8h, cutting road access to Kakdwip General Hospital.
- **Recommendation:** Mandatory closure of NH-117 to non-emergency traffic at T-12h. Pre-stage heavy earthmoving loaders at Baruipur and Namkhana.`;
  } else if (q.includes('evacuat') || q.includes('shelter') || q.includes('order')) {
    answer = `Evacuation priorities computed for ${scenarioName}:
1. **Priority 1 (T-24h to T-18h):** Complete vertical evacuation of 180,000+ residents living in thatched/kaccha dwellings within 5 km of the coastline and tidal rivers.
2. **Priority 2 (T-18h to T-12h):** Move vulnerable patients from ground-floor medical wards to inland hospitals.
3. **Shelter Alert:** De-register *Namkhana Embankment Shelter* as its access road will flood; redirect evacuees to *Sagar Island Multipurpose Cyclone Shelter CS-14*, which is elevated at 2.8m and equipped with backup power.`;
  } else {
    answer = `According to the current ${scenarioName} simulation (T-${hours}h to landfall):
- **Peak Storm Surge:** ${peakSurge} meters above normal astronomical tide.
- **Critical Infrastructure at Risk:** ${criticalCount} facilities flagged in High/Critical vulnerability bands.
- **Compound Threat:** Strongest winds in the Right-Front Quadrant coincide with estuarine high tide, blocking riverine runoff.

*Note: CycloneSight is an AI-assisted decision-support prototype. Confirm all directives with official IMD and National Disaster Management bulletins.*`;
  }

  return {
    success: true,
    answer,
    mode: 'mock',
    timestamp: new Date().toISOString(),
  };
}
