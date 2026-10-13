import { config } from '../config.js';

export interface IncidentAnalysisResult {
  summary: string;
  suggested_category: string;
  suggested_priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  missing_information: string[];
  reasoning: string;
  source: 'GEMINI_AI' | 'RULE_BASED_FALLBACK';
  confidence: number;
}

export interface ScenarioExplanationResult {
  summary: string;
  root_cause: string;
  recommended_action: string;
  source: 'GEMINI_AI' | 'DETERMINISTIC_EVALUATOR';
}

export async function analyzeIncidentReport(
  title: string,
  description: string,
  locationName: string,
  zone: string
): Promise<IncidentAnalysisResult> {
  // If Gemini API Key is configured, attempt real Gemini call
  if (config.geminiApiKey) {
    try {
      const prompt = `You are SAFENET AI's incident triage assistant.
Analyze the following public safety incident report. Do not assess individual guilt, criminality, or predict future behavior. Focus solely on emergency operational response triage.

Incident Title: ${title}
Description: ${description}
Location: ${locationName} (Zone: ${zone})

Respond ONLY with valid JSON in this exact structure:
{
  "summary": "Concise 1-2 sentence operational summary",
  "suggested_category": "MEDICAL_FIRST_AID" | "SECURITY_DISRUPTION" | "INFRASTRUCTURE_HAZARD" | "FIRE_SMOKE_ALARM" | "CROWD_SURGE",
  "suggested_priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "missing_information": ["List of critical operational details not mentioned that responders might need"],
  "reasoning": "Brief explanation for the category and priority assignment",
  "confidence": 0.85
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            summary: parsed.summary || title,
            suggested_category: parsed.suggested_category || 'INFRASTRUCTURE_HAZARD',
            suggested_priority: parsed.suggested_priority || 'MEDIUM',
            missing_information: Array.isArray(parsed.missing_information) ? parsed.missing_information : [],
            reasoning: parsed.reasoning || 'Derived via Gemini operational analysis.',
            source: 'GEMINI_AI',
            confidence: parsed.confidence || 0.9,
          };
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed or timed out, falling back to rule-based analysis:', err);
    }
  }

  // Deterministic rule-based fallback
  return runRuleBasedIncidentAnalysis(title, description, zone);
}

function runRuleBasedIncidentAnalysis(
  title: string,
  description: string,
  zone: string
): IncidentAnalysisResult {
  const text = `${title} ${description}`.toLowerCase();
  
  let category = 'INFRASTRUCTURE_HAZARD';
  let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
  const missing: string[] = [];
  let reasoning = 'Evaluated using operational keyword taxonomy rules.';

  if (text.includes('fire') || text.includes('smoke') || text.includes('alarm') || text.includes('burning')) {
    category = 'FIRE_SMOKE_ALARM';
    priority = 'CRITICAL';
    reasoning = 'Smoke/fire indicators warrant immediate critical response.';
  } else if (text.includes('blood') || text.includes('unconscious') || text.includes('injury') || text.includes('slip') || text.includes('fall') || text.includes('paramedic')) {
    category = 'MEDICAL_FIRST_AID';
    priority = text.includes('unconscious') || text.includes('severe') ? 'CRITICAL' : 'MEDIUM';
    reasoning = 'Medical terms detected; triage priority set based on injury severity keywords.';
  } else if (text.includes('fight') || text.includes('assault') || text.includes('trespass') || text.includes('weapon') || text.includes('theft')) {
    category = 'SECURITY_DISRUPTION';
    priority = text.includes('weapon') ? 'CRITICAL' : 'HIGH';
    reasoning = 'Security disruption pattern identified.';
  } else if (text.includes('stampede') || text.includes('crowd') || text.includes('bottleneck') || text.includes('surge')) {
    category = 'CROWD_SURGE';
    priority = 'HIGH';
    reasoning = 'Crowd density and flow disruption detected.';
  }

  // Missing information heuristics
  if (!zone || zone.trim() === '') {
    missing.push('Precise indoor zone / quadrant number not specified');
  }
  if (!text.includes('number') && !text.includes('people') && !text.includes('person') && !text.includes('commuter')) {
    missing.push('Estimated count of affected individuals not provided');
  }
  if (!text.includes('contact') && !text.includes('phone') && !text.includes('reported by')) {
    missing.push('On-scene reporting party contact number omitted');
  }

  return {
    summary: `${category.replace(/_/g, ' ')} detected at scene. Requires on-site verification.`,
    suggested_category: category,
    suggested_priority: priority,
    missing_information: missing,
    reasoning,
    source: 'RULE_BASED_FALLBACK',
    confidence: 0.8,
  };
}

export async function explainScenarioFailure(
  scenarioTitle: string,
  failedChecks: Array<{ name: string; expected: string; observed: string }>,
  gaps: string[]
): Promise<ScenarioExplanationResult> {
  // If Gemini is configured, use it for contextual synthesis
  if (config.geminiApiKey) {
    try {
      const prompt = `Analyze this emergency response scenario failure deterministically observed by SAFETEST AI:
Scenario: ${scenarioTitle}
Failed Checks:
${JSON.stringify(failedChecks, null, 2)}
Identified Gaps:
${JSON.stringify(gaps, null, 2)}

Provide a concise operational diagnosis in JSON:
{
  "summary": "1 sentence executive summary of the procedural breakdown",
  "root_cause": "Specific operational cause (e.g. missing fallback rule, SLA timer expiry)",
  "recommended_action": "Concrete operational remedy"
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            summary: parsed.summary,
            root_cause: parsed.root_cause,
            recommended_action: parsed.recommended_action,
            source: 'GEMINI_AI'
          };
        }
      }
    } catch (e) {
      // Fall through to deterministic
    }
  }

  return {
    summary: `Procedural failure observed in ${scenarioTitle} across ${failedChecks.length} test verification check(s).`,
    root_cause: gaps[0] || 'Unresolved operational check discrepancy.',
    recommended_action: 'Adjust dispatch fallback matrix to version v2.0 and verify automated failover trigger.',
    source: 'DETERMINISTIC_EVALUATOR'
  };
}
